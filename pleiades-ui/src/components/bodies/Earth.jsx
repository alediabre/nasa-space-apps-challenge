import * as THREE from 'three'
import { updateTileMeshes, loadBaseTiles, createPoleMesh } from '../../utils/maps/tileLoader.js'
import { EARTH_INCLINATION, EARTH_RADIUS } from '../../constants/index.js';


export function createEarth() {
  const earthGroup = new THREE.Group();
  earthGroup.name = 'Earth'

  // --- Fixed layer for camera (center)
  const anchor = new THREE.Group();
  anchor.name = 'EarthAnchor';
  earthGroup.add(anchor);

  // --- Rotatory layer for surface
  const surface = new THREE.Group();
  surface.name = 'EarthSurface';

  // --- Fixed image for poles
  const northPole = createPoleMesh(0,5)
  const southPole = createPoleMesh(175,5)
  surface.add(northPole);
  surface.add(southPole);

  earthGroup.add(surface);
  surface.rotation.z = THREE.MathUtils.degToRad(EARTH_INCLINATION);

  let updating = false;

  earthGroup.userData.updateTiles = async (camera) => {
    if (updating) return;
    updating = true;
    await updateTileMeshes(camera, surface, EARTH_RADIUS);
    updating = false;
  };

  earthGroup.userData.initTiles = async () => {
    await loadBaseTiles(surface, EARTH_RADIUS);
  };

  // exposed pointers
  earthGroup.userData.surface = surface;
  earthGroup.userData.anchor  = anchor;
  earthGroup.userData.canFocus = true;
  earthGroup.userData.radius = EARTH_RADIUS
  anchor.userData.initialDistance = 4; //Initial camera distance to the anchor

  return earthGroup;
}