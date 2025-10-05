import * as THREE from 'three'
import venustexture from '../../assets/venus/venusmap.jpg'
import { VENUS_RADIUS } from '../../constants';
export function createVenus() {
    const geometry = new THREE.SphereGeometry(VENUS_RADIUS, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const venusTexture = textureLoader.load(venustexture);

    const material = new THREE.MeshPhongMaterial({
    map: venusTexture
    });

    const venusGroup = new THREE.Group();
    venusGroup.name = 'venus'

    const venusMesh = new THREE.Mesh(geometry, material);
    venusMesh.name = 'venusMesh'
    venusGroup.add(venusMesh)

    const anchor = new THREE.Group();
    anchor.name = 'venusAnchor';
    venusGroup.add(anchor)


    venusGroup.userData.canFocus = true;
    venusGroup.userData.radius = VENUS_RADIUS
    venusGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 4;

    return venusGroup
}