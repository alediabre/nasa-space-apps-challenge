import * as THREE from 'three'
import saturntexture from '../../assets/saturn/saturnmap.jpg'
import { SATURN_RADIUS } from '../../constants';

export function createSaturn() {
    const geometry = new THREE.SphereGeometry(SATURN_RADIUS, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const saturnTexture = textureLoader.load(saturntexture);

    const material = new THREE.MeshPhongMaterial({
    map: saturnTexture
    });

    const saturnGroup = new THREE.Group();
    saturnGroup.name = 'saturn'

    const saturnMesh = new THREE.Mesh(geometry, material);
    saturnMesh.name = 'saturnMesh'
    saturnGroup.add(saturnMesh)

    const anchor = new THREE.Group();
    anchor.name = 'saturnAnchor';
    saturnGroup.add(anchor)


    saturnGroup.userData.canFocus = true;
    saturnGroup.userData.radius = SATURN_RADIUS
    saturnGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 50;

    return saturnGroup
}