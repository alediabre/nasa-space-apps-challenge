import * as THREE from 'three'
import marstexture from '../../assets/mars/mars_1k_color.jpg'
import { MARS_RADIUS } from '../../constants';
export function createMars() {
    const geometry = new THREE.SphereGeometry(MARS_RADIUS, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const marsTexture = textureLoader.load(marstexture);

    const material = new THREE.MeshPhongMaterial({
    map: marsTexture
    });

    const marsGroup = new THREE.Group();
    marsGroup.name = 'mars'

    const marsMesh = new THREE.Mesh(geometry, material);
    marsMesh.name = 'marsMesh'
    marsGroup.add(marsMesh)

    const anchor = new THREE.Group();
    anchor.name = 'marsAnchor';
    marsGroup.add(anchor)


    marsGroup.userData.canFocus = true;
    marsGroup.userData.radius = MARS_RADIUS
    marsGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 4;

    return marsGroup
}