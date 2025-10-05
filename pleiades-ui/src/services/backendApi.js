const API_BASE = 'http://localhost:8000/impacts';

export async function postKineticEnergy({ diameter_m, velocity_mps, density_kgm3 }) {
  const res = await fetch(`${API_BASE}/energy/kinetic_energy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diameter_m, velocity_mps, density_kgm3 }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Backend energy error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function postPopulationEstimate({ lat, lon, radius_m }) {
  const res = await fetch(`http://localhost:8000/population/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, radius_m }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Backend population error ${res.status}: ${txt}`);
  }
  return res.json();
}
