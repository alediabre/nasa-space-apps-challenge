import * as THREE from 'three'
import moontexture from '../../assets/moon/moonmap1k.jpg'
import { MOON_RADIUS } from '../../constants';
export function createMoon() {
    const geometry = new THREE.SphereGeometry(MOON_RADIUS, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const moonTexture = textureLoader.load(moontexture);

    const material = new THREE.MeshPhongMaterial({
    map: moonTexture
    });

    const moonGroup = new THREE.Group();
    moonGroup.name = 'Moon'

    const moonMesh = new THREE.Mesh(geometry, material);
    moonMesh.name = 'MoonMesh'
    moonGroup.add(moonMesh)

    const anchor = new THREE.Group();
    anchor.name = 'MoonAnchor';
    moonGroup.add(anchor)


    moonGroup.userData.canFocus = true;
    moonGroup.userData.radius = MOON_RADIUS
    moonGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 2;

    return moonGroup
}
