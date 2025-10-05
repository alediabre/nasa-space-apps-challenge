import * as THREE from 'three';

export function makeBelts({
  scene,
  addLabel,
  createAsteroidBeltPoints,
  createBeltAura,
  EARTH_A,
  labelsRef
}) {
  const BELTS_CONFIG = [
    {
      id: 'asteroid',
      label: 'Asteroid Belt',
      labelPos: [2.6 * EARTH_A, 0, 0],
      points: {
        count: 5000,
        innerAU: 2.1 * EARTH_A,
        outerAU: 3 * EARTH_A,
        thicknessAU: 0.0001,
        maxInclDeg: 12,
        size: 150,
      },
      rotationX: Math.PI / 2,
      scaleZ: 0.1,
      aura: {
        innerAU: 2.1 * EARTH_A,
        outerAU: 3 * EARTH_A,
        color: 'rgba(129, 129, 129, 1)',
        opacity: 0.28,
        featherInner: 0.18,
        featherOuter: 0.30,
      }
    },
    {
      id: 'kuiper',
      label: 'Kuiper Belt',
      labelPos: [40 * EARTH_A, 0, 0],
      points: {
        count: 8000,
        innerAU: 30 * EARTH_A,
        outerAU: 50 * EARTH_A,
        thicknessAU: 1.5,
        maxInclDeg: 30,
        size: 80,
      },
      rotationX: Math.PI / 2,
      scaleZ: 0.2,
      aura: {
        innerAU: 30 * EARTH_A,
        outerAU: 50 * EARTH_A,
        color: 'rgba(235, 221, 191, 1)',
        opacity: 0.18,
        featherInner: 0.15,
        featherOuter: 0.25,
      }
    },
    {
      id: 'oort',
      label: 'Oort cloud',
      labelPos: [4000 * EARTH_A, 0, 0],
      points: {
        count: 15000,
        innerAU: 2000 * EARTH_A,
        outerAU: 100000 * EARTH_A,
        thicknessAU: 20000,
        maxInclDeg: 90,
        size: 50,
      },
      rotationX: Math.PI / 2,
      scaleZ: 1,
      aura: {
        innerAU: 2000 * EARTH_A,
        outerAU: 100000 * EARTH_A,
        color: 'rgba(200, 200, 255, 1)',
        opacity: 0.08,
        featherInner: 0.05,
        featherOuter: 0.2,
      }
    }
  ];

  const updates = {};
  const nodesToCleanup = [];

  for (const cfg of BELTS_CONFIG) {
    // Puntos
    const { group, update } = createAsteroidBeltPoints(cfg.points);
    group.rotation.x = cfg.rotationX;
    group.scale.z = cfg.scaleZ;
    scene.add(group);
    nodesToCleanup.push(group);
    updates[cfg.id] = update;

    // Aura
    const aura = createBeltAura(cfg.aura);
    scene.add(aura);
    nodesToCleanup.push(aura);

    // Label con un anchor propio
    const anchor = new THREE.Object3D();
    anchor.position.set(...cfg.labelPos);
    scene.add(anchor);
    nodesToCleanup.push(anchor);

    const label = addLabel(anchor, cfg.label);
    labelsRef?.current?.push?.(label);
  }

  function updateAll(dt) {
    for (const fn of Object.values(updates)) fn?.(dt);
  }

  function dispose() {
    for (const n of nodesToCleanup) {
      n.parent && n.parent.remove(n);
      // si tus factories crean geometrías/materiales custom, podrías llamar a dispose() aquí
    }
  }

  return { updates, updateAll, dispose };
}
