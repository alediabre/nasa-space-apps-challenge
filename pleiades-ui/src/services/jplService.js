// Minimal wrapper for JPL Small-Body Database API (SBDB)
// Docs: https://ssd.jpl.nasa.gov/tools/sbdb_query.html  (SBDB has a REST endpoint)

export async function getSBDBObject(designation) {
  // designation can be an id or name
  const url = `https://ssd-api.jpl.nasa.gov/sbdb.api?des=${encodeURIComponent(designation)}&phys-par=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JPL SBDB API error ${res.status}`);
  const data = await res.json();
  return data;
}
