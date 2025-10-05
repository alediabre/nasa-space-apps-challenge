// pleiades-protocol-main/pleiades-ui/src/services/nasaApiService.js

import { NASA_API_KEY } from '../utils/constants';

// Prefer the UI-level key, fall back to NASA demo key
const API_KEY = NASA_API_KEY || 'DEMO_KEY';
const API_BASE = 'https://api.nasa.gov/neo/rest/v1';
const API_URL_BROWSE = `${API_BASE}/neo/browse?api_key=${API_KEY}`;
const API_URL_NEO = (id) => `${API_BASE}/neo/${id}?api_key=${API_KEY}`;

// Fallback data to use when the NASA API is unavailable
const FALLBACK_NEOS = [
  {
    id: "54016476",
    name: "Apophis (99942)",
    estimated_diameter: {
      meters: { estimated_diameter_min: 310, estimated_diameter_max: 340 }
    },
    close_approach_data: [{
      relative_velocity: { kilometers_per_second: "30.73" },
      close_approach_date: "2029-04-13"
    }],
    is_potentially_hazardous_asteroid: true
  },
  {
    id: "3542519",
    name: "Bennu (101955)",
    estimated_diameter: {
      meters: { estimated_diameter_min: 490, estimated_diameter_max: 510 }
    },
    close_approach_data: [{
      relative_velocity: { kilometers_per_second: "27.7" },
      close_approach_date: "2060-09-23"
    }],
    is_potentially_hazardous_asteroid: true
  },
  {
    id: "2000433",
    name: "Eros (433)",
    estimated_diameter: {
      meters: { estimated_diameter_min: 16840, estimated_diameter_max: 16840 }
    },
    close_approach_data: [{
      relative_velocity: { kilometers_per_second: "23.04" },
      close_approach_date: "2056-01-31"
    }],
    is_potentially_hazardous_asteroid: false
  }
];

export const getNEOList = async () => {
  try {
    console.log('nasaApiService: Attempting to connect to NASA API...');

    // Añadir timeout para evitar cuelgues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

    const response = await fetch(API_URL_BROWSE, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`nasaApiService: API response error. Status: ${response.status}`);
      if (response.status === 403) throw new Error('API key is invalid or lacks permissions.');
      if (response.status === 429) throw new Error('API rate limit exceeded.');
      throw new Error(`NASA API error (${response.status})`);
    }

    const data = await response.json();
    console.log('nasaApiService: Success — received real data from NASA API.');

    if (!data.near_earth_objects || data.near_earth_objects.length === 0) {
      console.warn('nasaApiService: API returned an empty NEO list. Using fallback data.');
      return FALLBACK_NEOS;
    }

    // Mapear a un shape consistente para la UI (asegura estimated_diameter y close_approach_data)
    const mapped = data.near_earth_objects.map((neo) => ({
      id: neo.id,
      name: neo.name.replace(/[()]/g, ''),
      estimated_diameter: neo.estimated_diameter || { meters: { estimated_diameter_min: null, estimated_diameter_max: null } },
      close_approach_data: neo.close_approach_data || [],
      is_potentially_hazardous_asteroid: neo.is_potentially_hazardous_asteroid || false,
    }));

    // Filtrar NEOs que tengan datos mínimos
    const validNeos = mapped.filter(neo => neo.estimated_diameter?.meters && neo.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second);
    if (validNeos.length === 0) {
      console.warn('nasaApiService: No valid NEOs with full data. Using fallback data.');
      return FALLBACK_NEOS;
    }

    return validNeos;
  } catch (error) {
    console.error('nasaApiService: Critical failure calling NASA API.', error);
    if (error.name === 'AbortError') console.warn('nasaApiService: API timeout. Using fallback data.');
    else console.warn('nasaApiService: Connection error. Using fallback data.');
    return FALLBACK_NEOS;
  }
};

export const getNEOData = async (id) => {
  try {
    const response = await fetch(API_URL_NEO(id), { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      console.error(`nasaApiService.getNEOData: API responded ${response.status}`);
      if (response.status === 404) throw new Error('NEO not found');
      throw new Error(`API Error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('nasaApiService.getNEOData: failed', err);
    throw err;
  }
};
