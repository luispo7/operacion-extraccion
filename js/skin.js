import * as THREE from 'three';

export function fixSkinBind(root) {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.isSkinnedMesh && o.skeleton) o.bind(o.skeleton, new THREE.Matrix4());
  });
}
