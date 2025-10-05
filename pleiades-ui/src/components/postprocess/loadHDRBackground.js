// loadHDRBackground.js
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

/**
 * Carga un fondo HDR/EXR y lo aplica como background y environment.
 * @param {string} url - Ruta al archivo .exr
 * @param {THREE.Renderer} renderer - WebGLRenderer para PMREM
 * @param {THREE.Scene} scene - Escena destino
 * @returns {Promise<{ hdr: THREE.Texture, envMap: THREE.Texture }>}
 */
export function loadHDRBackground(url, renderer, scene) {
  return new Promise((resolve, reject) => {
    new EXRLoader().load(
      url,
      (hdrTex) => {
        hdrTex.mapping = THREE.EquirectangularReflectionMapping;

        // Fondo directo (sin PMREM, para que se vea nítido)
        scene.background = hdrTex;

        // Environment difuminado para PBR
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const envMap = pmrem.fromEquirectangular(hdrTex).texture;
        scene.environment = envMap;

        pmrem.dispose(); // ⚠️ No liberar hdrTex, se está usando como background

        resolve({ hdr: hdrTex, envMap });
      },
      undefined,
      (err) => reject(err)
    );
  });
}