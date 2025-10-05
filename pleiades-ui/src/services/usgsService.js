// Minimal USGS Earthquake query helper
// Uses USGS earthquake search API
// Docs: https://earthquake.usgs.gov/fdsnws/event/1/

export async function queryEarthquakes({ starttime, endtime, minmagnitude, maxmagnitude, latitude, longitude, maxradiuskm }) {
  const params = new URLSearchParams();
  if (starttime) params.set('starttime', starttime);
  if (endtime) params.set('endtime', endtime);
  if (minmagnitude) params.set('minmagnitude', String(minmagnitude));
  if (maxmagnitude) params.set('maxmagnitude', String(maxmagnitude));
  if (latitude && longitude && maxradiuskm) {
    params.set('latitude', String(latitude));
    params.set('longitude', String(longitude));
    params.set('maxradiuskm', String(maxradiuskm));
  }
  params.set('format', 'geojson');

  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS API error ${res.status}`);
  const data = await res.json();
  return data;
}
