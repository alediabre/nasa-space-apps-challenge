
import { createEarth } from '../bodies/Earth'
import { createMoon } from '../bodies/Moon'
import { createMercury } from '../bodies/Mercury'
import { createVenus } from '../bodies/Venus'
import { createMars } from '../bodies/Mars'
import { createJupyter } from '../bodies/Jupyter'
import { createSaturn } from '../bodies/Saturn'
import { createUranus } from '../bodies/Uranus'
import { createNeptune } from '../bodies/Neptune'
import { createPluto } from '../bodies/Pluto'
import { initTiles} from '../../utils/events/eventFunctions'


export const BODIES_CONFIG = [
  // id, fábrica, etiqueta, color órbita, segs, parent?, onCreate?
  {
    id: 'earth',
    factory: createEarth,
    label: 'Earth',
    orbitColor: 0x87CEFA,
    segs: 5000,
    onCreate: (mesh, ctx) => {
      // cosas especiales de Earth
      initTiles(mesh);
      ctx.cameraAnchorRef.current = mesh.userData.anchor;
      ctx.surfaceRef.current = mesh.userData.surface;
    }
  },
  {
    id: 'moon',
    factory: createMoon,
    label: 'Moon',
    orbitColor: 0xffffff,
    segs: 5000,
    parent: 'earth' // órbita/mesh colgados de Earth
  },
  { id: 'mercury', factory: createMercury, label: 'Mercury', orbitColor: 0xC0C0C0, segs: 5000 },
  { id: 'venus',   factory: createVenus,   label: 'Venus',   orbitColor: 0xADFF2F, segs: 5000 },
  { id: 'mars',    factory: createMars,    label: 'Mars',    orbitColor: 0xdb6037, segs: 5000 },
  { id: 'jupiter', factory: createJupyter, label: 'Jupiter', orbitColor: 0xD4A373, segs: 5000 },
  { id: 'saturn',  factory: createSaturn,  label: 'Saturn',  orbitColor: 0xD8C16F, segs: 5000 },
  { id: 'uranus',  factory: createUranus,  label: 'Uranus',  orbitColor: 0x78DBE2, segs: 10000 },
  { id: 'neptune', factory: createNeptune, label: 'Neptune', orbitColor: 0x4169E1, segs: 10000 },
  { id: 'pluto',   factory: createPluto,   label: 'Pluto',   orbitColor: 0xC2A383, segs: 10000 },
];
