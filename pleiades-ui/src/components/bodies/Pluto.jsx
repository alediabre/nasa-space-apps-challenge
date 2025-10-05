import * as THREE from 'three'
import plutotexture from '../../assets/pluto/plutomap2k.jpg'
import { PLUTO_RADIUS } from '../../constants';
export function createPluto() {
    const geometry = new THREE.SphereGeometry(PLUTO_RADIUS, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const plutoTexture = textureLoader.load(plutotexture);

    const material = new THREE.MeshPhongMaterial({
    map: plutoTexture
    });

    const plutoGroup = new THREE.Group();
    plutoGroup.name = 'pluto'

    const plutoMesh = new THREE.Mesh(geometry, material);
    plutoMesh.name = 'plutoMesh'
    plutoGroup.add(plutoMesh)

    const anchor = new THREE.Group();
    anchor.name = 'plutoAnchor';
    plutoGroup.add(anchor)


    plutoGroup.userData.canFocus = true;
    plutoGroup.userData.radius = PLUTO_RADIUS
    plutoGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 4;

    return plutoGroup
}