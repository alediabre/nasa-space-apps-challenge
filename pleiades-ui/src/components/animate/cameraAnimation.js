import * as THREE from 'three'
import gsap from 'gsap'
import { EARTH_RADIUS } from '../../constants';
import { createSphereMarker } from '../../utils/events/impactUtils';

export function adjustCamera(anchor, controls, camera, bodyChanged=false) {
    const vector = new THREE.Vector3();
    anchor.getWorldPosition(vector); // usa el anchor, no el group portador

    // current offset: distance between the viewer (camera position) and the target (where controls point)
    let offset = null

    if (bodyChanged) {
        // if bodyChanged, the anchor has just been set to this body, so offset should be fixed
        // animation should be displayed only if body changed
        const initialDistance = anchor.userData.initialDistance
        offset = new THREE.Vector3(0, initialDistance/4, initialDistance)
        const newPos = vector.clone().add(offset);

        // sets the camera mantaining same distance (offset) to target
        gsap.fromTo(camera.position,
            { 
                x: camera.position.x, 
                y: camera.position.y, 
                z: camera.position.z 
            },
            { 
                x: newPos.x, 
                y: newPos.y, 
                z: newPos.z, 
                duration: 1.5, 
                ease: "power1.out"
            }
        );

    } else {
        offset = new THREE.Vector3().subVectors(camera.position, controls.target)
        controls.target.copy(vector)
        camera.position.copy(vector).add(offset)
    }

    controls.update()
}


function latLonToVector3(lat, lon, radius, surface) {
  const phi = THREE.MathUtils.degToRad(90 - lat); // desde polo norte
  const theta = THREE.MathUtils.degToRad(lon + 180); // longitud
  
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z =  radius * Math.sin(phi) * Math.sin(theta);
  const y =  radius * Math.cos(phi);

  // lo convertimos al espacio de mundo de la Tierra (por si está girada)
  return surface.localToWorld(new THREE.Vector3(x, y, z));
}


export function adjustCameraToLatLon(lat, lon, radius, surface, camera, size='small') {
    const targetPos = latLonToVector3(lat, lon, radius, surface);

    let initialDistance = 0.2
    const offset = new THREE.Vector3(0, 0, -initialDistance);

    const newPos = targetPos.clone().add(offset);

    gsap.to(camera.position, {
        x: newPos.x,
        y: newPos.y,
        z: newPos.z,
        duration: 2.2,
        ease: "power1.out"
    });
}

export const flyToPlace = async(placeData, camera, surface) => {
    if (placeData) {
        const lat = placeData.lat
        const lon = placeData.lon
        const size = placeData.size
        adjustCameraToLatLon(lat, lon, EARTH_RADIUS, surface, camera, size);
    } 
}

export const launchToPlace = async(placeData, camera, surface) => {
    if (placeData) {
        const lat = placeData.lat
        const lon = placeData.lon
        const size = placeData.size
        adjustCameraToLatLon(lat, lon, EARTH_RADIUS, surface, camera, size);
        const radius1 = 0.02
        const radius2 = 0.03
        const radius3 = 0.045
        const marker1 = createSphereMarker(lat, lon, radius1, '#d96609', 0.0012)
        const marker2 = createSphereMarker(lat, lon, radius2, '#e8544d', 0.0008)
        const marker3 = createSphereMarker(lat, lon, radius3, '#bce84d', 0.0005)
        surface.add(marker1);
        surface.add(marker2);
        surface.add(marker3);
    } 
}