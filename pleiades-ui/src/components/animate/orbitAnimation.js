import { SECONDS_PER_DAY } from "../../constants";

export function animateOrbit(M, deltaTime, orbitingObject, orbit, clockwise=false) {
  const direction = clockwise ? 1 : -1
  const deltaDays = deltaTime / SECONDS_PER_DAY;
  const radPerDays = orbit.getRadPerDay();  

  function wrap2pi(angle) {
    const twoPi = 2 * Math.PI;
    return ((angle % twoPi) + twoPi) % twoPi;
  }

  // Avanza M respetando el M0 almacenado en tu estado (o suma M0 al inicial)
  M = wrap2pi(M + direction * radPerDays * deltaDays);

  // Kepler
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = E - (E - orbit.e * Math.sin(E) - M) / (1 - orbit.e * Math.cos(E));
  }

  const a = orbit.a;
  const b = a * Math.sqrt(1 - orbit.e*orbit.e);
  const x = a * (Math.cos(E) - orbit.e);
  const z = b * Math.sin(E);

  orbitingObject.position.set(x, 0, z);
  //console.log(orbitingObject.name, M)
  return M;
}


