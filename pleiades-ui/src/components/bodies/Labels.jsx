import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MIN_LABEL_RENDER_FACTOR } from '../../constants';

// === una sola vez, junto al WebGLRenderer ===
let _labelRenderer = null;

export function createLabelRenderer(container, width, height) {
  // Si ya existe, solo ajusta tamaño y devuelve
  if (_labelRenderer) {
    _labelRenderer.setSize(width, height);
    // Garantiza que está en el contenedor correcto
    if (_labelRenderer.domElement.parentElement !== container) {
      _labelRenderer.domElement.remove();
      container.appendChild(_labelRenderer.domElement);
    }
    return _labelRenderer;
  }

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';

  container.appendChild(labelRenderer.domElement);
  _labelRenderer = labelRenderer;
  
  return _labelRenderer;
}

export function getLabelRenderer() {
  return _labelRenderer;
}


// === cuando creas un objeto ===
export function addLabel(mesh, text) {

    if (mesh.children?.length) {
        for (const c of [...mesh.children]) {
            if (c instanceof CSS2DObject) mesh.remove(c);
        }
    }

    if (mesh.userData.__label) {
        mesh.userData.__label.element.querySelector('.obj-label').textContent = text;
        return mesh.userData.__label;
    }

    const outer = document.createElement('div'); // lo posiciona CSS2DRenderer
    const inner = document.createElement('div'); // lo movemos en px nosotros

    inner.className = 'obj-label';
    inner.textContent = text;
    inner.style.padding = '2px 6px';
    inner.style.borderRadius = '6px';
    inner.style.background = 'rgba(0,0,0,0.3)';
    inner.style.color = '#fff';
    inner.style.fontSize = '16px';
    inner.style.whiteSpace = 'nowrap';
    inner.style.pointerEvents = 'auto';
    inner.style.position = 'relative';
    inner.style.transform = 'translate(0%, calc(-100% - 0px))';
    inner.style.fontFamily = "Russo One";
    inner.style.fontWeight = 400;
    inner.style.fontStyle = "normal";

    outer.appendChild(inner);


    const label = new CSS2DObject(outer);
    label.position.set(0, 0, 0); // SIN offset en mundo
    mesh.add(label);

    // Guardamos referencia para actualizar si quieres variar el px dinámicamente
    label.userData.inner = inner;
    label.userData.labeledBody = mesh;
    mesh.userData.__label = label;
    return label;
}

//Updates label rendering. If the anchored body is too near, hide its label
export function updateLabel(labelsRef, anchor, distanceToAnchor) {
  for (const label of labelsRef.current) {
    const labeledBody = label.userData.labeledBody
    if (labeledBody == anchor.parent && distanceToAnchor < MIN_LABEL_RENDER_FACTOR * labeledBody.userData.radius){
      label.element.firstChild.style.visibility = "hidden"
    } else {
      label.element.firstChild.style.visibility = "visible"
    }
  }
}


export function disposeLabelRenderer() {
  if (_labelRenderer) {
    _labelRenderer.domElement?.remove()
    _labelRenderer = null
  }
}


export function onResize(container, camera, renderer, labelRenderer) {
    const w = container.clientWidth;
    const h = container.clientHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
}