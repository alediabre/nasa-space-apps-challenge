import * as THREE from 'three'

export function createOrbit(orbit, orbitingObject, orbitColor, segs = 50000) {
  const eclipticPlane = new THREE.Group();
  //console.log(orbit)
  // Ejes base
  const AX = new THREE.Vector3(1, 0, 0);
  const AY = new THREE.Vector3(0, 1, 0);

  // 1) Ω alrededor de Y
  const qΩ = new THREE.Quaternion().setFromAxisAngle(AY, orbit.Omega || 0);

  // 2) Eje de línea de nodos
  const nodeAxis = AX.clone().applyQuaternion(qΩ).normalize();

  // 3) i alrededor de la línea de nodos
  const qi = new THREE.Quaternion().setFromAxisAngle(nodeAxis, orbit.incl || 0);

  // === Nuevo: eje correcto para ω (normal del plano orbital ya rotado) ===
  const orbitNormal = AY.clone().applyQuaternion(qΩ).applyQuaternion(qi).normalize();
  const qω = new THREE.Quaternion().setFromAxisAngle(orbitNormal, orbit.w || 0);

  // Orden de aplicación
  const q = qΩ.clone().multiply(qi).multiply(qω);
  eclipticPlane.quaternion.copy(q);


  // objeto que orbita
  eclipticPlane.add(orbitingObject);

  // órbita visible (elipse en el plano local XZ)
  const a = orbit.a;
  const b = a * Math.sqrt(1 - orbit.e * orbit.e);
  const orbitPoints = [];
  for (let i = 0; i <= segs; i++) {
    const th = (i / segs) * 2 * Math.PI;
    const x = a * (Math.cos(th) - orbit.e);
    const z = b * Math.sin(th);
    orbitPoints.push(new THREE.Vector3(x, 0, z));
  }

  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
  const earthOrbitMat = new THREE.LineBasicMaterial({
    color: orbitColor,
    transparent: true,
    opacity: 0.6
  });
  const earthOrbitLine = new THREE.Line(orbitGeometry, earthOrbitMat);

  eclipticPlane.add(earthOrbitLine);
  return [eclipticPlane, q];
}