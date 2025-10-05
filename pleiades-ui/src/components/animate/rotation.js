import * as THREE from 'three'
import { SECONDS_PER_DAY } from '../../constants';


export function rotate(mesh, tilt, deltaTime, prevAngle) {
    if (mesh) {
        const omega = 2 * Math.PI;
        const earthAngle = prevAngle + omega * (deltaTime/SECONDS_PER_DAY);

        //Quaternion for tilt (Z axis)
        const tiltQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1), tilt
        );

        //Quaternion for rotation (Y axis)
        const rotQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), earthAngle
        );

        mesh.quaternion.copy(tiltQuat).multiply(rotQuat);
        return earthAngle
    }
}