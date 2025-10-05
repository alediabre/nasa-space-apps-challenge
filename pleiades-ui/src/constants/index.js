//Earth Tiles rendering
export const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
export const TILE_SIZE = 256;
export const MIN_ZOOM = 4; //Minimum Tile zoom to render
export const MAX_RENDER_LATITUDE = 85; //Maximum latitude to render tiles

//General constants
export const SECONDS_PER_DAY = 86400;
export const CONTROL_MIN_DISTANCE = 1.0003;
export const MIN_LABEL_RENDER_FACTOR = 6; //Distance from which the label is displayed (multiplied by body radius)

//IMPORTANTE: Las distancias se miden en unidades de escena: 1 = radio de la tierra = 6378km

//Earth
export const EARTH_TEXTURE_URL =
`https://api.maptiler.com/tiles/satellite-v2/0/0/0.jpg?key=${MAPTILER_API_KEY}`
export const EARTH_INCLINATION = -23.5;
export const EARTH_RADIUS = 1;
export const EARTH_A = 23455 // semieje mayor Tierra a Sol
export const EARTH_EXCENT = 0.0167 // excentricidad orbita tierra sol
export const EARTH_PERIOD = 365.256 // periodo terrestre

//Moon
export const MOON_RADIUS = 0.2727
export const MOON_A = 60.27 // semieje mayor Luna a Tierra
export const MOON_EXCENT = 0.055 // excentricidad orbita luna tierra
export const MOON_PERIOD = 27.321661 // Periodo lunar
export const MOON_INCLINATION = 5.145

//Sun
export const SUN_RADIUS = 109 // el radio del sol.. es grande el cabron..

//APIS
export const METRICS_SERVICES_API = import.meta.env.VITE_METRICS_SERVICES_API;
export const FASTAPI_KEY = import.meta.env.VITE_FASTAPI_KEY;

//Planets
export const VENUS_RADIUS = 0.949
export const MERCURY_RADIUS = 0.363
export const MARS_RADIUS = 0.53
export const JUPYTER_RADIUS = 10.97
export const SATURN_RADIUS = 9.14
export const URANUS_RADIUS = 3.98
export const NEPTUNE_RADIUS = 3.87
export const PLUTO_RADIUS = 0.19
export const CERES_RADIUS = 0.074