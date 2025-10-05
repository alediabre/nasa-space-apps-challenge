import { METRICS_SERVICES_API, FASTAPI_KEY, EARTH_RADIUS, EARTH_A } from '../../constants/index.js'
import Orbit from './Orbit.js'
import * as THREE from 'three'

export const HORIZONS_API = METRICS_SERVICES_API+'/horizons' 
export const ASTEROIDS_API = METRICS_SERVICES_API+'/asteroids/elements' 

function toJulianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Mantiene cualquier ángulo dentro de [0, 2π)
function wrap2pi(angle) {
  //
  const twoPi = 2 * Math.PI;
  return ((angle % twoPi) + twoPi) % twoPi;
}


const horizonsRequestOptions = {
    method:'GET',
    headers:{'x-api-key': FASTAPI_KEY}
}

export async function getHorizonsData(celestialObject) {
  const res = await fetch(`${HORIZONS_API}/${celestialObject}`, horizonsRequestOptions);
  if (!res.ok) throw new Error('Network response was not ok');
  const data = await res.json();

  const now = new Date(); 
  const n = 2*Math.PI / data.PR;
  const jd_now = toJulianDate(now)
  const mean_anomaly_now = wrap2pi(data.M0 + n * (jd_now - data.epoch_jd));
  //console.log('base', data.M0)
  //console.log('now', mean_anomaly_now)

  const orbit = new Orbit({
    a: Number(data.A) * EARTH_A,
    e: Number(data.E),
    periodDays: Number(data.PR),
    incl: Number(data.IN),
    Omega: Number(data.OM),
    w: Number(data.W),
    mean_anomaly: Number(data.M0),
    n: Number(data.N),
    });
    console.log(orbit)
    return orbit

}


export async function getAsteroidsData(asteroid) {
  const url = `${ASTEROIDS_API}?sstr=${encodeURIComponent(asteroid)}`;

  const asteroidsRequestOptions = {
    method: 'GET',
    headers: {
      'x-api-key': FASTAPI_KEY,
    }
  };

  const res = await fetch(url, asteroidsRequestOptions);
  console.log("[Asteroid GET] →", url, res.status);

  if (!res.ok) {
    let body;
    try { body = await res.json(); } catch { body = await res.text(); }
    const detail = typeof body === "object" ? JSON.stringify(body.detail ?? body) : body;
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${detail}`);
  }

  const data = await res.json();

  const now = new Date(); 
  const n = 2*Math.PI / data.periodDays;
  const jd_now = toJulianDate(now)
  const mean_anomaly_now = data.ma + n * (jd_now - data.epoch_jd);
  console.log(data.ma + n * (jd_now - data.epoch_jd))
  console.log(data.ma)
  console.log(data.epoch_jd)

  const orbit = new Orbit({
    a: Number(data.a) * EARTH_A,
    e: Number(data.e),
    periodDays: Number(data.periodDays),
    incl: Number(data.i),
    Omega: Number(data.om),
    w: Number(data.w),
    mean_anomaly: Number(mean_anomaly_now),
  });


  console.log(orbit)

  return new Orbit({
    a: Number(data.a) * EARTH_A,
    e: Number(data.e),
    periodDays: Number(data.periodDays),
    incl: Number(data.i),
    Omega: Number(data.om),
    w: Number(data.w),
    mean_anomaly: Number(mean_anomaly_now),
  });

}

