import * as THREE from 'three'
import suntexture from '../../assets/sun/sunmap.jpg'
import { SUN_RADIUS } from '../../constants';

export function createSun() {
    const geometry = new THREE.SphereGeometry(SUN_RADIUS, 128, 128);

    const textureLoader = new THREE.TextureLoader().load(suntexture);
    textureLoader.colorSpace = THREE.SRGBColorSpace

    const material = new THREE.MeshPhongMaterial({
        map: textureLoader,
        emissive: 0xffffff,        // color emissivo
        emissiveMap: textureLoader,      // usa la misma textura para el brillo
        emissiveIntensity: 1.6,    // ajusta a gusto (1.2–2.0 suele ir bien)
        specular: 0x000000,        // sin brillos especulares
        shininess: 0
    })

    const sunGroup = new THREE.Group();
    sunGroup.name = 'Sun'

    const sunMesh = new THREE.Mesh(geometry, material);
    sunMesh.name = "SunMesh"
    sunGroup.add(sunMesh)

    const anchor = new THREE.Group();
    anchor.name = 'SunAnchor';
    sunGroup.add(anchor)
    
    const sunLight = new THREE.PointLight(0xffffff, 500, 0, 0.55)
    sunLight.castShadow = true
    sunMesh.add(sunLight)

    // marca el Sol en una capa para bloom selectivo (ver paso 2)
    sunMesh.layers.enable(1)

    sunGroup.userData.canFocus = true;
    sunGroup.userData.radius = SUN_RADIUS
    sunGroup.userData.anchor = anchor;
    anchor.userData.initialDistance = 1500;

    return sunGroup
}
