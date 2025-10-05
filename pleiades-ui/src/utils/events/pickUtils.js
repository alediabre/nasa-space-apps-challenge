import * as THREE from 'three'

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function pickLatLon(event, camera, earthSurface) {
  // Coordenadas del click normalizadas (-1 a 1)
  const rect = event.target.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // Lanza el rayo
  raycaster.setFromCamera(pointer, camera);

  // intersecta contra la escena completa (o array de objetos)
  const intersects = raycaster.intersectObject(earthSurface, true);
  if (intersects.length > 0) {
    const point = intersects[0].point; // XYZ
    const { lat, lon } = pointToLatLonEarth(point, earthSurface);
    return { point, lat, lon };
  }
  return null;
}


function pointToLatLonEarth(point, earthSurface) {
  const localPoint = earthSurface.worldToLocal(point.clone()).normalize();
  const lat = THREE.MathUtils.radToDeg(Math.asin(localPoint.y));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(localPoint.x, localPoint.z)) - 90;
  return { lat, lon };
}
