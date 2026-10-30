import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function bakeStatic(root, { keep = [] } = {}) {
  root.updateMatrixWorld(true);
  const protectedSet = new Set();
  for (const k of keep) {
    if (k && k.isObject3D && typeof k.traverse === 'function') k.traverse(o => protectedSet.add(o));
  }

  const groups = new Map();
  root.traverse(o => {
    if (o === root || !o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isSprite) return;
    if (!o.visible || protectedSet.has(o) || o.userData.noBake) return;
    if (!o.material || Array.isArray(o.material)) return;
    const geo = o.geometry;
    if (!geo || !geo.attributes.position || Object.keys(geo.morphAttributes || {}).length) return;
    for (let p = o.parent; p; p = p.parent) {
      if (!p.visible) return;
      if (p !== root && protectedSet.has(p)) return;
      if (p === root) break;
    }
    const key = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow + '|' + o.renderOrder;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });

  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const bakedMeshes = [];
  let removed = 0;

  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const clones = [];
    const removedEntries = [];
    let baked = null;
    try {
      const geoms = meshes.map(mesh => {
        const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
        clones.push(g);
        return g;
      });
      // Intersect attributes; missing normals are rebuilt after merging.
      const common = new Set(Object.keys(geoms[0].attributes));
      for (const g of geoms) for (const n of [...common]) if (!g.attributes[n]) common.delete(n);
      for (const g of geoms) for (const n of Object.keys(g.attributes)) if (!common.has(n)) g.deleteAttribute(n);
      const merged = mergeGeometries(geoms, false);
      if (!merged) continue;
      if (!common.has('normal')) merged.computeVertexNormals();
      const m = new THREE.Mesh(merged, meshes[0].material);
      m.name = 'baked';
      m.castShadow = meshes[0].castShadow;
      m.receiveShadow = meshes[0].receiveShadow;
      m.renderOrder = meshes[0].renderOrder;
      m.userData = { ...meshes[0].userData };
      root.add(m);
      baked = m;
      for (const mesh of meshes) {
        const parent = mesh.parent;
        if (parent) { removedEntries.push([mesh, parent]); parent.remove(mesh); }
      }
      removed += removedEntries.length;
      bakedMeshes.push(m);
    } catch (e) {
      for (const [mesh, parent] of removedEntries) parent.add(mesh);
      if (baked && baked.parent) { baked.parent.remove(baked); baked.geometry.dispose(); }
    } finally {
      for (const g of clones) g.dispose();
    }
  }

  // Remove groups emptied by the bake, repeating for newly empty parents.
  let empty;
  do {
    empty = [];
    root.traverse(o => {
      if (o !== root && o.isGroup && o.children.length === 0 && !protectedSet.has(o)) empty.push(o);
    });
    for (const g of empty) if (g.parent) g.parent.remove(g);
  } while (empty.length);

  return { merged: bakedMeshes, removed };
}
export function countMeshes(root) {
  let count = 0;
  root.traverse(o => { if (o.isMesh) count++; });
  return count;
}
