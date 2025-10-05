import * as THREE from 'three'
import uranustexture from '../../assets/uranus/uranusmap.jpg'
import { URANUS_RADIUS } from '../../constants';
export function createUranus() {
    const geometry = new THREE.SphereGeometry(URANUS_RADIUS, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const uranusTexture = textureLoader.load(uranustexture);

    const material = new THREE.MeshPhongMaterial({
    map: uranusTexture
    });

    const uranusGroup = new THREE.Group();
    uranusGroup.name = 'uranus'

    const uranusMesh = new THREE.Mesh(geometry, material);
    uranusMesh.name = 'uranusMesh'
    uranusGroup.add(uranusMesh)

    const anchor = new THREE.Group();
    anchor.name = 'uranusAnchor';
    uranusGroup.add(anchor)


    uranusGroup.userData.canFocus = true;
    uranusGroup.userData.radius = URANUS_RADIUS
    uranusGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 30;

    return uranusGroup
}