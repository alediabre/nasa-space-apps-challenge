// orbits/addAsteroid.jsx
import * as THREE from 'three';

export function makeAddAsteroid({
  scene,
  labelsRef,           // React ref con array de labels
  asteroidsRef,        // React ref con Map()
  setOrbitalData,
  setOrbitAnomaly,
  getAsteroidsData,    // fn async (sstr) -> orbitData
  createOrbit,         // fn (orbitData, mesh, color, segs)
  addLabel,            // fn (object3D, text)
  isDisposed = () => false
}) {
  function removeAsteroid(idOrKey) {
    const id = typeof idOrKey === 'string' ? idOrKey : null;
    if (!id) return;

    const entry = asteroidsRef.current.get(id);
    if (!entry) return;

    const { mesh, orbit, label } = entry;

    // Quitar de la escena
    if (orbit?.parent) orbit.parent.remove(orbit);
    if (mesh?.parent) mesh.parent.remove(mesh);

    // Quitar label del DOM y del array de labels
    if (label) {
      try {
        label.element?.remove?.();
      } catch {}
      // Limpia también la referencia en labelsRef
      const idx = labelsRef.current.indexOf(label);
      if (idx >= 0) labelsRef.current.splice(idx, 1);
    }

    // Liberar recursos
    try {
      mesh?.geometry?.dispose?.();
      mesh?.material?.dispose?.();
    } catch {}

    asteroidsRef.current.delete(id);
  }

  function clearAsteroids() {
    // Elimina TODOS los asteroides
    for (const id of Array.from(asteroidsRef.current.keys())) {
      removeAsteroid(id);
    }
  }

  /**
   * addAsteroid(sstr, opts)
   *  - sstr: string/id de Small-Body Database (p.ej. '99942')
   *  - opts:
   *      key: string único para poder sobreescribir (p.ej. 'selected' o 'approach')
   *      color: color de la órbita (default 0xffaa00)
   *      segs: segmentos de la órbita (default 6000)
   *      labelPrefix: prefijo del label (default 'Ast')
   */
  async function addAsteroid(sstr, {
    key = `ast-${sstr}`,
    color = 0xffaa00,
    segs = 6000,
    labelPrefix = 'Ast'
  } = {}) {
    try {
      const orbitData = await getAsteroidsData(sstr);
      if (isDisposed()) return;

      // Si ya existe uno con esta key, lo reemplazamos
      removeAsteroid(key);

      // Guarda orbital data + anomalía
      setOrbitalData(key, orbitData);
      setOrbitAnomaly(key, -orbitData.mean_anomaly);

      // Mesh del asteroide
      const geom = new THREE.SphereGeometry(0.02, 16, 16);
      const mat  = new THREE.MeshStandardMaterial({ metalness: 0.2, roughness: 0.8 });
      const asteroidMesh = new THREE.Mesh(geom, mat);
      asteroidMesh.name = `Asteroid-${sstr}`;
      asteroidMesh.userData.canFocus = true;
      asteroidMesh.userData.anchor = new THREE.Object3D();
      asteroidMesh.add(asteroidMesh.userData.anchor);
      scene.add(asteroidMesh);

      const asteroidLabel = addLabel(asteroidMesh, `${labelPrefix} ${sstr}`);
      labelsRef.current.push(asteroidLabel);

      // Órbita visible
      const [asteroidOrbitPlane] = createOrbit(orbitData, asteroidMesh, color, segs);
      asteroidOrbitPlane.name = `${key}-orbit`;
      scene.add(asteroidOrbitPlane);

      // Registrar para animación en el loop (+ guardar label y orbit para poder borrarlos)
      asteroidsRef.current.set(key, { mesh: asteroidMesh, data: orbitData, orbit: asteroidOrbitPlane, label: asteroidLabel });

      console.log(`[MainCanvas] Asteroide ${sstr} añadido como "${key}"`);
      return key;
    } catch (err) {
      console.error(`Error añadiendo asteroide ${sstr}:`, err);
    }
  }

  return { addAsteroid, removeAsteroid, clearAsteroids };
}
