import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

export function createSunBloom (renderer, scene, camera, width, height) {
    // Postprocesado
    const renderScene = new RenderPass(scene, camera)

    const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    1.2,  // strength → ajusta intensidad
    0.4,  // radius → suavidad
    0.85  // threshold → qué tan brillante debe ser para "florecer"
    )

    const composer = new EffectComposer(renderer)
    composer.addPass(renderScene)
    composer.addPass(bloomPass)

    return composer
}