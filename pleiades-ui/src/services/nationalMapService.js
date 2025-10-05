// Minimal wrapper for USGS National Map elevation tile or API
// This file provides a helper that retrieves elevation from a REST endpoint where available.

export async function getElevationForCoords(lat, lon) {
  // For demonstration, try the USGS Elevation Point Query Service
  // Docs: https://nationalmap.gov/epqs/
  const url = `https://nationalmap.gov/epqs/pqs.php?x=${lon}&y=${lat}&units=Meters&output=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`National Map EPQS error ${res.status}`);
  const data = await res.json();
  // Response structure: data.USGS_Elevation_Point_Query_Service.Elevation_Query.Elevation
  const elev = data?.USGS_Elevation_Point_Query_Service?.Elevation_Query?.Elevation;
  if (elev === undefined || elev === null) throw new Error('Elevation not found');
  return Number(elev);
}
