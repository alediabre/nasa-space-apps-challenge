import * as THREE from 'three'
import mercurytexture from '../../assets/mercury/mercurymap.jpg'
import { MERCURY_RADIUS } from '../../constants';
export function createMercury() {
    const geometry = new THREE.SphereGeometry(MERCURY_RADIUS, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const mercuryTexture = textureLoader.load(mercurytexture);

    const material = new THREE.MeshPhongMaterial({
    map: mercuryTexture
    });

    const mercuryGroup = new THREE.Group();
    mercuryGroup.name = 'mercury'

    const mercuryMesh = new THREE.Mesh(geometry, material);
    mercuryMesh.name = 'mercuryMesh'
    mercuryGroup.add(mercuryMesh)

    const anchor = new THREE.Group();
    anchor.name = 'mercuryAnchor';
    mercuryGroup.add(anchor)


    mercuryGroup.userData.canFocus = true;
    mercuryGroup.userData.radius = MERCURY_RADIUS
    mercuryGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 3;

    return mercuryGroup
}