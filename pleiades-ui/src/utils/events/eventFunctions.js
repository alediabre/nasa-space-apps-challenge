import * as THREE from 'three'
import { adjustCamera, flyToPlace } from '../../components/animate/cameraAnimation'
import { pickLatLon } from './pickUtils'
import { CONTROL_MIN_DISTANCE } from '../../constants'
import { createSphereMarker } from './impactUtils'


export const initTiles = (earth) => {
  if (typeof earth?.userData?.initTiles === 'function') {
    earth.userData.initTiles()
  }
}

export const getUpdateTiles = (meshesRef, camera) => {
  return () => {
    const earth = meshesRef.current.get('earth')
    if (earth && typeof earth?.userData?.updateTiles === 'function') {
      earth.userData.updateTiles(camera)
    }
  }
}

//Function to execute when controls change, to change controls parameters
export const getUpdateControls = (anchorRef, distToAnchorRef, controls, camera) => {
  return () => {
    const anchor = anchorRef.current
    const anchorPosition = new THREE.Vector3();
    anchor.getWorldPosition(anchorPosition);

    const bodyRadius = anchor.parent.userData.radius //Radius of achored group
    const controlMinDistance = bodyRadius * CONTROL_MIN_DISTANCE //Min distance you can scroll
    const nearestDistance = controlMinDistance - bodyRadius - 0.0001 //Min distance you can see

    const distToAnchor = new THREE.Vector3().subVectors(camera.position, anchorPosition).length()
    distToAnchorRef.current = distToAnchor

    const distToMesh = distToAnchor - bodyRadius
    const rotateVariationScale = 3.8 //increase factor for speed when rotating out
    const zoomVariationScale = 1.1
    const rotateOffsetScale = nearestDistance * 0.9 //offset from where rotating speed starts to increase
    const zoomOffsetScale = nearestDistance * 0.75
    //console.log(distToAnchor)

    controls.rotateSpeed = THREE.MathUtils.clamp(distToMesh/rotateVariationScale - rotateOffsetScale, nearestDistance, 0.6)
    controls.zoomSpeed = THREE.MathUtils.clamp(distToMesh/zoomVariationScale - zoomOffsetScale, nearestDistance, 1.35)
    controls.minDistance = controlMinDistance
  }
}


// Function to add eventlisteners to every label, so they do their logic :)
export const addLabelsClickEvents = (cameraAnchorRef, labelsRef, controls, camera) => {
  for (const label of labelsRef.current) {
      const inner = label.element.firstChild
      inner.addEventListener("click", () => {
          const labeledBody = label.userData.labeledBody
          if (labeledBody.userData.canFocus){
              cameraAnchorRef.current = labeledBody.userData.anchor
              adjustCamera(cameraAnchorRef.current, controls, camera, true)
          }
      });
  }
}


// Function to define the event that occurs when clicking on the renderer
export const getRendererClickEvents = (camera, surface) => {
  return (event) => {
    const res = pickLatLon(event, camera, surface);
    if (res) {
      console.log("Click at", res)
      const radius1 = 0.02
      const radius2 = 0.03
      const radius3 = 0.045
      const marker1 = createSphereMarker(res.lat, res.lon, radius1, '#d96609', 0.0012)
      const marker2 = createSphereMarker(res.lat, res.lon, radius2, '#e8544d', 0.0008)
      const marker3 = createSphereMarker(res.lat, res.lon, radius3, '#bce84d', 0.0005)
      surface.add(marker1);
      surface.add(marker2);
      surface.add(marker3);
    }
  }
}




