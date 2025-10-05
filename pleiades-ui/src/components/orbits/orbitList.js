import * as THREE from 'three'
import Orbit from './Orbit.js'
import * as constants from '../../constants'

export const EarthOrbit = new Orbit({
  a: constants.EARTH_A,
  e: constants.EARTH_EXCENT,
  periodDays: constants.EARTH_PERIOD,
  incl: 0,                          // ~0 respecto a la eclíptica en tu escena
  Omega: 0,                         // ejemplo
  w: THREE.MathUtils.degToRad(102.9372), // perihelio aprox. J2000
  mean_anomaly: THREE.MathUtils.degToRad(357.51716)    // M a la época elegida
});

export const MoonOrbit = new Orbit({
  a: constants.MOON_A,
  e: constants.MOON_EXCENT,
  periodDays: constants.MOON_PERIOD,
  incl: THREE.MathUtils.degToRad(constants.MOON_INCLINATION), // ~5.145°
  Omega: THREE.MathUtils.degToRad(125.08), // ejemplo (varía en el tiempo)
  w: THREE.MathUtils.degToRad(318.15), // ejemplo
  mean_anomaly: THREE.MathUtils.degToRad(115.3654)
});