import * as THREE from "three";
import { EARTH_RADIUS } from "../../constants";

export function createSphereMarker(lat, lon, radius, color, offset) {
  // Centro real de la Tierra

  // Convertir lat/lon a radianes
  const phi = THREE.MathUtils.degToRad(-lon);
  const theta = THREE.MathUtils.degToRad(90 - lat);

  // Calcular posición del punto en coordenadas 3D relativas al centro
  const localPos = new THREE.Vector3(
    EARTH_RADIUS * Math.sin(theta) * Math.cos(phi),
    EARTH_RADIUS * Math.cos(theta),
    EARTH_RADIUS * Math.sin(theta) * Math.sin(phi)
  );

  // Crear geometría del marcador circular
  const geometry = new THREE.CircleGeometry(radius, 32);
  const material = new THREE.MeshBasicMaterial({ 
    color: color,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.15
    });
  const marker = new THREE.Mesh(geometry, material);

  // Posicionar y orientar el marcador hacia el centro de la Tierra
  marker.position.copy(localPos);
  marker.position.addScaledVector(localPos.clone().normalize(), offset);

  marker.lookAt(new THREE.Vector3(0,0,0));

  return marker;
}
