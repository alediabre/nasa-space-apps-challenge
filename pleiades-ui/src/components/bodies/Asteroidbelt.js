// utils/asteroidBelt.js
import * as THREE from 'three';

// Kepler en unidades astronómicas (AU) y años
const TWO_PI = Math.PI * 2;
const DAYS_PER_YEAR = 365.25;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// Evita resonancias fuertes (huecos de Kirkwood)
function inKirkwoodGap(aAU) {
  // 3:1 ~2.50, 5:2 ~2.82, 7:3 ~2.95, 2:1 ~3.27
  const gaps = [
    { c: 2.50, w: 0.04 },
    { c: 2.82, w: 0.03 },
    { c: 2.95, w: 0.02 },
    { c: 3.27, w: 0.04 },
  ];
  return gaps.some(g => Math.abs(aAU - g.c) < g.w);
}

/**
 * Crea un cinturón de asteroides basado en Points.
 * Units: mismas que tus planetas (1 AU ≈ radio medio Tierra-Sol en tu escena).
 */
export function createAsteroidBeltPoints({
  count = 40000,
  innerAU = 2.1,
  outerAU = 3.3,
  thicknessAU = 0.3,      // grosor (±) sobre el plano
  meanE = 0.08,            // excentricidad media
  stdE = 0.05,             // desviación e
  maxInclDeg = 15,         // inclinación máx típica
  size = 1.2,              // tamaño de punto en pantalla (px)
} = {}) {

  const geometry = new THREE.BufferGeometry();
  // Solo guardamos fase M y elementos para animar
  const aArr   = new Float32Array(count);
  const eArr   = new Float32Array(count);
  const iArr   = new Float32Array(count);
  const OM_Arr = new Float32Array(count); // Ω
  const wArr   = new Float32Array(count); // ω
  const MArr   = new Float32Array(count); // M (fase inicial)
  const nArr   = new Float32Array(count); // n rad/día

  // posiciones iniciales (se rellenan y luego se actualizan en el 1er frame)
  const pos = new Float32Array(count * 3);

  // Distribución de semiejes con ligera preferencia central
  const randA = () => {
    while (true) {
      const t = Math.random(); // 0..1
      // curva en S para concentrar algo hacia el centro
      const ease = t*t*(3-2*t);
      const a = innerAU + (outerAU - innerAU) * ease;
      if (!inKirkwoodGap(a)) return a;
    }
  };

  for (let k = 0; k < count; k++) {
    const a = randA();
    const e = clamp(meanE + stdE * (Math.random()*2-1), 0.0, 0.3);
    const i = THREE.MathUtils.degToRad(Math.random() * maxInclDeg);
    const OM = Math.random() * TWO_PI;
    const w  = Math.random() * TWO_PI;
    const M0 = Math.random() * TWO_PI;

    // Periodo P ≈ √(a^3) años (μ☉=1 en unidades astronómicas)
    const P_years = Math.sqrt(a*a*a);
    const n_rad_per_day = TWO_PI / (P_years * DAYS_PER_YEAR);

    aArr[k] = a; eArr[k] = e; iArr[k] = i; OM_Arr[k] = OM; wArr[k] = w; MArr[k] = M0; nArr[k] = n_rad_per_day;

    // y-z “grosor” aleatorio
    const dz = (Math.random()*2 - 1) * thicknessAU * 0.5; // ±thickness/2, luego inclinación lo deforma

    // Pos inicial aproximada: coloca en perihelio y deja que el update haga el resto
    pos[3*k+0] = (a * (1 - e)); // x provisional
    pos[3*k+1] = 0 + dz;
    pos[3*k+2] = 0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  // Guardamos los “elementos” en atributos personalizados por si quieres usarlos en shaders
  geometry.setAttribute('a',    new THREE.BufferAttribute(aArr, 1));
  geometry.setAttribute('e',    new THREE.BufferAttribute(eArr, 1));
  geometry.setAttribute('inc',  new THREE.BufferAttribute(iArr, 1));
  geometry.setAttribute('Omega',new THREE.BufferAttribute(OM_Arr, 1));
  geometry.setAttribute('argp', new THREE.BufferAttribute(wArr, 1));
  geometry.setAttribute('M',    new THREE.BufferAttribute(MArr, 1));
  geometry.setAttribute('n',    new THREE.BufferAttribute(nArr, 1));

  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    depthWrite: false,
    transparent: true,
    opacity: 0.7,
    // un gris “polvo” con leve variación: puedes modificar en tiempo real si quieres
    color: new THREE.Color(0xbababa),
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  // === Update: propaga M y recalcula posición ECI (plano eclíptico J2000 asumido) ===
  // Simplificación suficiente para “feeling” visual del cinturón.
  function update(deltaSeconds) {
    const pos = geometry.attributes.position.array;
    const M   = geometry.attributes.M.array;
    const n   = geometry.attributes.n.array;

    for (let k = 0; k < count; k++) {
      // 1) Propaga M
      M[k] = (M[k] + n[k] * (deltaSeconds / 86400)) % TWO_PI;
      if (M[k] < 0) M[k] += TWO_PI;

      // 2) Kepler (3 iteraciones suelen bastar)
      const e = eArr[k];
      let E = M[k];
      for (let j = 0; j < 3; j++) {
        E = E - (E - e*Math.sin(E) - M[k]) / (1 - e*Math.cos(E));
      }

      const a  = aArr[k];
      const w  = wArr[k];
      const OM = OM_Arr[k];
      const inc= iArr[k];

      // 3) Coordenadas en el plano orbital
      const x_orb = a * (Math.cos(E) - e);
      const y_orb = a * (Math.sqrt(1 - e*e) * Math.sin(E));

      // 4) Rotaciones: perifocal -> inercial (eclíptica)
      // Rz(Ω) * Rx(i) * Rz(ω) * [x_orb, y_orb, 0]
      const cosO = Math.cos(OM), sinO = Math.sin(OM);
      const cosi = Math.cos(inc), sini = Math.sin(inc);
      const cosw = Math.cos(w),  sinw = Math.sin(w);

      // primero Rz(ω)
      const x1 =  x_orb*cosw - y_orb*sinw;
      const y1 =  x_orb*sinw + y_orb*cosw;
      const z1 = 0;

      // luego Rx(i)
      const x2 = x1;
      const y2 = y1*cosi - z1*sini;
      const z2 = y1*sini + z1*cosi;

      // por último Rz(Ω)
      const X = x2*cosO - y2*sinO;
      const Y = x2*sinO + y2*cosO;
      const Z = z2;

      pos[3*k+0] = X;
      pos[3*k+1] = Y;
      pos[3*k+2] = Z;
    }

    geometry.attributes.position.needsUpdate = true;
    // Trick leve: giro global para dar sensación de “vida” cuando el tiempo está en pausa
    // points.rotation.z += deltaSeconds * 0.00002;
  }

  return { group: points, update };
}
