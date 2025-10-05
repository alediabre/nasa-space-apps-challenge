// utils/asteroidAura.js
import * as THREE from 'three';

/**
 * Crea un aura azulada como anillo con bordes suaves.
 * Se alinea al plano XZ (eclíptica en tu escena).
 */
export function createBeltAura({
  innerAU,          // radio interior del cinturón (ej. 2.4)
  outerAU,          // radio exterior del cinturón (ej. 3.1)
  color = '#5cc4ff',// azul del halo
  opacity = 0.15,   // opacidad máxima del halo
  featherInner = 0.15, // suavizado relativo del borde interior (0..0.5)
  featherOuter = 0.25, // suavizado relativo del borde exterior (0..0.5)
  textureSize = 512,   // tamaño del gradiente (potencia de 2)
} = {}) {

  // 1) Genera una textura radial con alpha suave (anillo)
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = textureSize;
  const ctx = canvas.getContext('2d');

  const cx = textureSize / 2;
  const cy = textureSize / 2;
  const maxR = textureSize / 2;

  // Normalizamos radios a [0..1] para el gradiente
  const rInner = 0.0; // el ring geometry se encargará del agujero físico
  const rOuter = 1.0;

  // Colorea el anillo con alpha suave entre un borde y otro
  const img = ctx.createImageData(textureSize, textureSize);
  const [cr, cg, cb] = new THREE.Color(color).toArray().map(v => Math.round(v * 255));

  // Feather relativo: cuánto “espesor” de transición en cada borde (en porcentaje radial)
  const innerFeather = THREE.MathUtils.clamp(featherInner, 0, 0.49);
  const outerFeather = THREE.MathUtils.clamp(featherOuter, 0, 0.49);

  // opacidad fija para todo el anillo
    const fixedOpacity = 0.01; // 👈 cambia este valor a lo que quieras

    for (let y = 0; y < textureSize; y++) {
    for (let x = 0; x < textureSize; x++) {
        const dx = (x + 0.5) - cx;
        const dy = (y + 0.5) - cy;
        const r = Math.sqrt(dx*dx + dy*dy) / maxR; // 0..1

        // opacidad constante dentro del anillo, 0 fuera
        let a = 0.0;
        if (r >= rInner && r <= rOuter) {
        a = fixedOpacity;
        }

        const idx = (y * textureSize + x) * 4;
        img.data[idx+0] = cr;
        img.data[idx+1] = cg;
        img.data[idx+2] = cb;
        img.data[idx+3] = Math.round(a * 255);
    }
    }

  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;

  // 2) Malla: anillo físico (con agujero central)
  const ring = new THREE.RingGeometry(innerAU, outerAU, 256, 1);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,   // evita conflictos de z con las piedras
    blending: THREE.AdditiveBlending, // suma luminosa → efecto glow
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(ring, mat);
  // Alinea XY→XZ (como las órbitas)
  mesh.rotation.x = Math.PI / 2;

  // Opcional: prioriza el render para que el glow se pinte después
  mesh.renderOrder = 999;

  return mesh;
}
