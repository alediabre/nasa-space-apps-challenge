import * as THREE from 'three'
import jupytertexture from '../../assets/jupyter/jupiter2_1k.jpg'
import { JUPYTER_RADIUS } from '../../constants';
export function createJupyter() {
    const geometry = new THREE.SphereGeometry(JUPYTER_RADIUS, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const jupyterTexture = textureLoader.load(jupytertexture);

    const material = new THREE.MeshPhongMaterial({
    map: jupyterTexture
    });

    const jupyterGroup = new THREE.Group();
    jupyterGroup.name = 'jupyter'

    const jupyterMesh = new THREE.Mesh(geometry, material);
    jupyterMesh.name = 'jupyterMesh'
    jupyterGroup.add(jupyterMesh)

    const anchor = new THREE.Group();
    anchor.name = 'jupyterAnchor';
    jupyterGroup.add(anchor)


    jupyterGroup.userData.canFocus = true;
    jupyterGroup.userData.radius = JUPYTER_RADIUS
    jupyterGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 60;

    return jupyterGroup
}