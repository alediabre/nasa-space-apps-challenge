import Bump from '../../assets/earth/bump.jpg'
import {
  TILE_SIZE
} from '../../constants'
import * as THREE from 'three';


let bumpBaseImage = null;
loadGlobalBumpMap();
// simple cache for bump map textures
const bumpTileCache = new Map();

// Initialize bump base image
export async function loadGlobalBumpMap(src = Bump) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      bumpBaseImage = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}


// Returns a texture for the bump map of the specified tile (z, x, y)
export function getBumpTile(z, x, y, targetWidth = TILE_SIZE, targetHeight = TILE_SIZE) {
  const key = `${z}-${x}-${y}`;
  if (bumpTileCache.has(key)) return bumpTileCache.get(key);

  if (!bumpBaseImage) return null;

  const n = Math.pow(2, z);

  // calculate lon/lat bounds of the tile
  const lonLeft = (x / n) * 360 - 180;
  const lonRight = ((x + 1) / n) * 360 - 180;
  const latTop = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI - (2 * Math.PI * y) / n));
  const latBottom = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI - (2 * Math.PI * (y + 1)) / n));

  // global bump map image size
  const imgW = bumpBaseImage.width;
  const imgH = bumpBaseImage.height;

  const leftPx = ((lonLeft + 180) / 360) * imgW;
  const rightPx = ((lonRight + 180) / 360) * imgW;
  const topPx = ((90 - latTop) / 180) * imgH;
  const bottomPx = ((90 - latBottom) / 180) * imgH;

  const w = rightPx - leftPx;
  const h = bottomPx - topPx;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bumpBaseImage, leftPx, topPx, w, h, 0, 0, targetWidth, targetHeight);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  bumpTileCache.set(key, tex);

  return tex;
}