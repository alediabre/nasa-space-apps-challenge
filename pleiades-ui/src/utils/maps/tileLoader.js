import * as THREE from 'three';
import {
  MAPTILER_API_KEY,
  EARTH_RADIUS,
  MIN_ZOOM,
  MAX_RENDER_LATITUDE,
  EARTH_TEXTURE_URL
} from '../../constants/index.js'
import { getBumpTile } from './bumpLoader.js';
import { tileXToLon, tileYToLat, latLonToTile, cameraCenterLatLon, cropTexture } from './tileUtils.js';


// simple cache for image objects by tile key
const tileCache = new Map()
// simple cache for mesh textures
const meshCache = new Map()


// decides zoom level based on camera distance
function getZoomFromDistance(dist) {
  if (dist < 1.001) return 13
  if (dist < 1.0022) return 12
  if (dist < 1.0035) return 11
  if (dist < 1.007) return 10
  if (dist < 1.014) return 9
  if (dist < 1.03) return 8
  if (dist < 1.07) return 7
  if (dist < 1.14) return 6
  if (dist < 1.3) return 5
  //if (dist < 1.7) return 4
  return MIN_ZOOM
}

// loads a single tile image, with caching
function loadTileImage(z, x, y) {
  const num = Math.pow(2, z)
  const xWrapped = ((x % num) + num) % num // wrap X
  const yClamped = Math.max(0, Math.min(num - 1, y)) // clamp Y
  const key = `${z}-${xWrapped}-${yClamped}`
  if (tileCache.has(key)) 
    return Promise.resolve(tileCache.get(key))

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      tileCache.set(key, img)
      resolve(img)
    }
    img.onerror = () => {
      console.warn('Failed to load tile', key)
      resolve(null)
    }
    img.src = `https://api.maptiler.com/tiles/satellite-v2/${z}/${xWrapped}/${yClamped}.jpg?key=${MAPTILER_API_KEY}`
  })
}


// Create tile mesh prepared for a tile
// z,x,y are tile parameters and radius will determine the geometry
function createTileMesh(z, x, y, radius = EARTH_RADIUS) {
  const lonLeft = tileXToLon(x, z)
  const lonRight = tileXToLon(x + 1, z)
  const latTop = tileYToLat(y, z)
  const latBottom = tileYToLat(y + 1, z)

  // Create sphere segment geometry
  // phi = longitude, theta = latitude
  // phiStart is on the equator at lonLeft, thetaStart is at the north pole at latTop
  const phiStart = THREE.MathUtils.degToRad(180 + lonLeft)
  const phiLength = THREE.MathUtils.degToRad(lonRight - lonLeft)

  const thetaStart = THREE.MathUtils.degToRad(90 - latTop)
  const thetaLength = THREE.MathUtils.degToRad(latTop - latBottom)
  //console.log(lonLeft, latTop)

  const geometry = new THREE.SphereGeometry(
    radius,
    32, 32,
    phiStart, phiLength,
    thetaStart, thetaLength
  )

  const material = new THREE.MeshPhongMaterial({ 
    side: THREE.FrontSide
   })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.userData = { z, x, y }
  return mesh
}


// calculates which tiles are visible from the camera at given zoom
function getVisibleTilesForCamera(camera, zoom, quaternion) {
  const center = cameraCenterLatLon(camera, quaternion)
  const centerTile = latLonToTile(center.lat, center.lon, zoom)
  //console.log(`Center lat/lon: ${center.lat}, ${center.lon}`)
  //console.log(`Tile x: ${centerTile.x}, y: ${centerTile.y}, zoom: ${zoom}`)
  //console.log(`URL: https://api.maptiler.com/tiles/satellite-v2/${zoom}/${centerTile.x}/${centerTile.y}.jpg?key=${MAPTILER_API_KEY}`)

  // range around center tile
  let baseRange = 2

  // Range is increased in higher latitudes
  const latFactor = 1 + Math.abs(center.lat) / 45;
  const range = Math.min(10, Math.ceil(baseRange * latFactor));
  //console.log(`latFactor ${latFactor}, range ${range}`)

  const tiles = []
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const x = centerTile.x + dx
      const y = centerTile.y + dy
      const latTop = tileYToLat(y, zoom)
      const latBottom = tileYToLat(y + 1, zoom)

      // filter tiles that are near poles
      if (latTop < MAX_RENDER_LATITUDE && latBottom > -MAX_RENDER_LATITUDE) {
        tiles.push({ x, y, z: zoom })
      }
    }
  }
  return tiles
}


// Get the array of keys for every existant tile at a certain zoom level
function getAllTilesAtZoom(z) {
  const n = Math.pow(2, z); //Tile number per longitudinal edge
  const tiles = [];
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      tiles.push({ z, x, y });
    }
  }
  return tiles;
}


function clearMesh(surface, key, mesh) {
  surface.remove(mesh)
  mesh.geometry.dispose()
  if (mesh.material.map) mesh.material.map.dispose()
  mesh.material.dispose()
  meshCache.delete(key)
}


// Update visible tile meshes
export async function updateTileMeshes(camera, surface, radius = EARTH_RADIUS) {
  const earthPosition = new THREE.Vector3();
  surface.getWorldPosition(earthPosition);
  //Get earth position and calculate distance from camera. Then get zoom level
  const dist = new THREE.Vector3().subVectors(camera.position, earthPosition).length()
  const zoom = getZoomFromDistance(dist)
  //console.log(`Camera distance: ${dist}, Zoom level: ${zoom}`)
  //console.log('Mesh cache size: ', meshCache.size)

  if (zoom == MIN_ZOOM) {
    //Means no update is needed, just base tiles are shown and old meshes removed
    const toRemoveTiles = getAllTilesAtZoom(MIN_ZOOM + 1)
    toRemoveTiles.map(t => `${t.z}-${t.x}-${t.y}`)
                .forEach((key) => {
      if (meshCache.has(key)) {
        const mesh = meshCache.get(key)
        clearMesh(surface, key, mesh)
      }
    });
    return 
  }
  const visibleTiles = getVisibleTilesForCamera(camera, zoom, surface)
  const newKeys = new Set(visibleTiles.map(t => `${t.z}-${t.x}-${t.y}`))

  // remove old meshes not visible
  for (const [key, mesh] of meshCache) {
    if (!newKeys.has(key)) {
      clearMesh(surface, key, mesh)
    }
  }
  // add new meshes
  for (const t of visibleTiles) {
    const key = `${t.z}-${t.x}-${t.y}`
    if (!meshCache.has(key)) {
      const mesh = createTileMesh(t.z, t.x, t.y, radius)
      surface.add(mesh)
      meshCache.set(key, mesh)

      // load texture async
      loadTileImage(t.z, t.x, t.y).then((img) => {
        if (!img) return
        const tex = new THREE.Texture(img)
        tex.needsUpdate = true
        tex.colorSpace = THREE.SRGBColorSpace
        mesh.material.map = tex

        const bumpTex = getBumpTile(t.z, t.x, t.y)
        if (bumpTex) {
          mesh.material.bumpMap = bumpTex;
          mesh.material.bumpScale = 5;
        }
        mesh.material.needsUpdate = true
      })
    }
  }
}


// loads all base tiles with minimum zoom level. They are not cached, just keep loaded
export async function loadBaseTiles(surface, radius=EARTH_RADIUS) {
  const visibleTiles = getAllTilesAtZoom(MIN_ZOOM)
  const zdepth = 0.001 //How far below the texture will be from the updating tiles
  for (const t of visibleTiles) {
    const mesh = createTileMesh(t.z, t.x, t.y, radius - zdepth)
    surface.add(mesh)

    // load texture async
    loadTileImage(t.z, t.x, t.y).then((img) => {
      if (!img) return
      const tex = new THREE.Texture(img)
      tex.needsUpdate = true
      tex.colorSpace = THREE.SRGBColorSpace
      mesh.material.map = tex

      const bumpTex = getBumpTile(t.z, t.x, t.y)
      if (bumpTex) {
        mesh.material.bumpMap = bumpTex;
        mesh.material.bumpScale = 5;
      }
      mesh.material.needsUpdate = true
    })
  }
}


// Create a mesh with the pole geometry
export function createPoleMesh(start_degree, length_degree) {
  const widthSegments = 32;
  const heightSegments = 16;
  const thetaStart = THREE.MathUtils.degToRad(start_degree);
  const thetaLength = THREE.MathUtils.degToRad(length_degree);

  const geometry = new THREE.SphereGeometry(
    EARTH_RADIUS,
    widthSegments,
    heightSegments,
    0, Math.PI * 2,
    thetaStart,
    thetaLength
  );
  const bottomRatio = (start_degree > 90) ? 1 : length_degree/180

  const loader = new THREE.ImageLoader()
  const image = loader.load(EARTH_TEXTURE_URL)
  const material = new THREE.MeshPhongMaterial({
    map: cropTexture(image, start_degree/180, bottomRatio)
  })

  return new THREE.Mesh(geometry, material);
}
