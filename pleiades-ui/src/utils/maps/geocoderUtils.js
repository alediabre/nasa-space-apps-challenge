export async function getAllGeocodeByName(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=20`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error("Geocoding API error");
  }
  const data = await resp.json();
  if (data.results && data.results.length > 0) {
    const resultsData = []
    for (const r of data.results) {
      const resultData =  {
        id: r.id,
        lat: r.latitude,
        lon: r.longitude,
        name: r.name,
        country: r.country_code,
        admin1: r.admin1,
        code: r.feature_code,
        size: processFeatureCode(r.feature_code)
      };
      resultsData.push(resultData)
    }
    return resultsData
  }
  return null; // no encontrado
}


export function processFeatureCode(code) {
    let size = null
    if (code.startsWith('PC') || code==='TERR' || code==='ZN') {
        //country, state, region
        size = 'big'
    }else if (code.startsWith('ADM') || code.startsWith('PPLA')) {
        //administrative division
        size = 'medium'
    }else {
        size = 'small'
    }
    return size
}