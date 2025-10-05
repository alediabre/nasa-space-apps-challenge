import * as THREE from 'three'
import neptunetexture from '../../assets/neptune/neptunemap.jpg'
import { NEPTUNE_RADIUS } from '../../constants';
export function createNeptune() {
    const geometry = new THREE.SphereGeometry(NEPTUNE_RADIUS, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const neptuneTexture = textureLoader.load(neptunetexture);

    const material = new THREE.MeshPhongMaterial({
    map: neptuneTexture
    });

    const neptuneGroup = new THREE.Group();
    neptuneGroup.name = 'neptune'

    const neptuneMesh = new THREE.Mesh(geometry, material);
    neptuneMesh.name = 'neptuneMesh'
    neptuneGroup.add(neptuneMesh)

    const anchor = new THREE.Group();
    anchor.name = 'neptuneAnchor';
    neptuneGroup.add(anchor)


    neptuneGroup.userData.canFocus = true;
    neptuneGroup.userData.radius = NEPTUNE_RADIUS
    neptuneGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 30;

    return neptuneGroup
}