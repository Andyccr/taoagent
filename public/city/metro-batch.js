// Distance-LOD batches: every filler building / street prop of the metropolis lives in a THREE.BatchedMesh
// (one multi-draw call per batch). We cull per instance ourselves (range + frustum, recomputed only when the
// camera moves), so three's own per-object culling and sorting are switched off and its draw list is rebuilt
// only when visibility actually changes. Fillers far from the camera swap to a two-tone proxy (body + roof).
import * as THREE from 'three';
import { createGeo } from './geo.js';

const ATTRS = { position: 3, normal: 3, uv: 2, color: 3 };

// Make a geometry compatible with every other one in a batch: non-indexed with exactly position/normal/uv/color.
export function normalizeGeometry(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (!(name in ATTRS)) g.deleteAttribute(name);
  const n = g.getAttribute('position').count;
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.getAttribute('color')) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  for (const [name, size] of Object.entries(ATTRS)) {
    const a = g.getAttribute(name);
    if (a.itemSize !== size || a.normalized || !(a.array instanceof Float32Array)) {
      const out = new Float32Array(n * size);
      for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) out[i * size + k] = k < a.itemSize ? a.getComponent(i, k) : 0;
      g.setAttribute(name, new THREE.BufferAttribute(out, size));
    }
  }
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

// Two-tone stand-in for a filler seen from afar: wall-coloured block plus a roof-coloured cap, ~24 triangles.
export function proxyGeometry(geo) {
  const pos = geo.getAttribute('position'), col = geo.getAttribute('color');
  const box = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
  const h = Math.max(0.3, box.max.y), cut = h * 0.72;
  const body = [0, 0, 0, 0], roof = [0, 0, 0, 0];
  for (let i = 0; i < pos.count; i += 3) {
    const y = pos.getY(i), acc = y > cut ? roof : body;
    acc[0] += col.getX(i); acc[1] += col.getY(i); acc[2] += col.getZ(i); acc[3]++;
  }
  const c = (a, fb) => (a[3] ? new THREE.Color(a[0] / a[3], a[1] / a[3], a[2] / a[3]) : fb);
  const bodyC = c(body, new THREE.Color(0xcfc6b2)), roofC = c(roof, bodyC.clone().multiplyScalar(0.8));
  const w = box.max.x - box.min.x, d = box.max.z - box.min.z, cx = (box.max.x + box.min.x) / 2, cz = (box.max.z + box.min.z) / 2;
  const g = createGeo();
  g.box(w * 0.86, cut, d * 0.86, cx, 0, cz, bodyC.getHex());
  if (h / Math.max(w, d) > 2.2) g.box(w * 0.7, h - cut, d * 0.7, cx, cut, cz, roofC.getHex());
  else g.hip(w * 0.92, d * 0.92, h - cut, cx, cut, cz, roofC.getHex());
  return normalizeGeometry(g.build());
}

// Far stand-in for a tree: one low-poly canopy blob in the average leaf colour, ~16 triangles.
export function treeProxyGeometry(geo) {
  const pos = geo.getAttribute('position'), col = geo.getAttribute('color');
  const box = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
  const h = Math.max(0.5, box.max.y), cut = h * 0.35, acc = [0, 0, 0, 0];
  for (let i = 0; i < pos.count; i += 3) if (pos.getY(i) > cut) { acc[0] += col.getX(i); acc[1] += col.getY(i); acc[2] += col.getZ(i); acc[3]++; }
  const leaf = acc[3] ? new THREE.Color(acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3]) : new THREE.Color(0x5d8a3c);
  const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const g = createGeo();
  g.raw(new THREE.OctahedronGeometry(0.5, 0), leaf.getHex(), 0, cut + (h - cut) * 0.5, 0, { sx: w, sy: h - cut, sz: w });
  g.box(w * 0.12, cut, w * 0.12, 0, 0, 0, 0x6b4a2f);
  return normalizeGeometry(g.build());
}

// A batch of instances drawn with one material. add() collects geometries/instances, finish() builds the mesh.
export function createLodBatch(material, { name = 'batch', castShadow = false, receiveShadow = false } = {}) {
  const geos = [], geoIndex = new Map(), items = [];
  const api = {
    // Register a geometry under key (once); returns a handle used by instance().
    geometry(key, make, withProxy = false) {
      if (geoIndex.has(key)) return geoIndex.get(key);
      let g = null;
      try { g = make(); } catch (error) { console.warn('batch geometry failed', key, error); }
      if (!g || !g.getAttribute || !g.getAttribute('position') || !g.getAttribute('position').count) { geoIndex.set(key, null); return null; }
      const near = normalizeGeometry(g);
      const handle = { near: geos.push(near) - 1, far: -1, radius: near.boundingSphere.radius };
      if (withProxy) handle.far = geos.push(typeof withProxy === 'function' ? withProxy(near) : proxyGeometry(near)) - 1;
      geoIndex.set(key, handle);
      return handle;
    },
    // Add an instance: matrix (THREE.Matrix4), colour (THREE.Color or null), max draw distance, and the distance
    // beyond which the proxy is used (Infinity = never).
    instance(handle, matrix, color, maxDist, proxyDist = Infinity) {
      if (!handle) return -1;
      const e = matrix.elements;
      const s = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
      items.push({ handle, matrix: matrix.clone(), color: color ? color.clone() : null, maxDist, proxyDist, x: e[12], y: e[13] + handle.radius * s * 0.5, z: e[14], r: handle.radius * s });
      return items.length - 1;
    },
    get count() { return items.length; },
    finish() {
      if (!items.length) return null;
      const used = new Set();
      for (const it of items) { used.add(it.handle.near); if (it.handle.far >= 0 && it.proxyDist < Infinity) used.add(it.handle.far); }
      let verts = 0;
      for (const i of used) verts += geos[i].getAttribute('position').count;
      const mesh = new THREE.BatchedMesh(items.length, verts, 0, material);
      mesh.name = name;
      mesh.perObjectFrustumCulled = false;
      mesh.sortObjects = false;
      mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
      const ids = new Map();
      for (const i of used) ids.set(i, mesh.addGeometry(geos[i]));
      const n = items.length;
      const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n), pr = new Float32Array(n);
      const maxD = new Float32Array(n), proxyD = new Float32Array(n), nearId = new Int32Array(n), farId = new Int32Array(n), state = new Int8Array(n).fill(-1);
      let hasColor = false;
      items.forEach((it, k) => {
        const near = ids.get(it.handle.near), far = it.handle.far >= 0 && ids.has(it.handle.far) ? ids.get(it.handle.far) : -1;
        const id = mesh.addInstance(near);
        mesh.setMatrixAt(id, it.matrix);
        if (it.color) { mesh.setColorAt(id, it.color); hasColor = true; }
        mesh.setVisibleAt(id, false);
        px[k] = it.x; py[k] = it.y; pz[k] = it.z; pr[k] = it.r; maxD[k] = it.maxDist; proxyD[k] = far >= 0 ? it.proxyDist : Infinity;
        nearId[k] = near; farId[k] = far;
      });
      if (!hasColor) { const white = new THREE.Color(1, 1, 1); for (let k = 0; k < n; k++) mesh.setColorAt(k, white); }
      mesh.computeBoundingBox(); mesh.computeBoundingSphere();
      geos.length = 0; items.length = 0;
      const frustum = new THREE.Frustum(), m = new THREE.Matrix4(), last = new THREE.Matrix4(), camPos = new THREE.Vector3();
      let scale = 1, lastScale = -1, visibleCount = 0, proxyCount = 0;
      mesh.userData.lod = {
        // distanceScale lets the quality preset shrink or stretch every range at once.
        setScale(s) { scale = s; },
        update(camera) {
          m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
          if (m.equals(last) && scale === lastScale) return false;
          last.copy(m); lastScale = scale;
          frustum.setFromProjectionMatrix(m);
          camPos.setFromMatrixPosition(camera.matrixWorld);
          const planes = frustum.planes;
          let changed = false; visibleCount = 0; proxyCount = 0;
          for (let k = 0; k < n; k++) {
            const dx = px[k] - camPos.x, dy = py[k] - camPos.y, dz = pz[k] - camPos.z;
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz), lim = maxD[k] * scale;
            let want = -1;
            if (d - pr[k] < lim) {
              let inside = true;
              for (let p = 0; p < 6; p++) { const pl = planes[p]; if (pl.normal.x * px[k] + pl.normal.y * py[k] + pl.normal.z * pz[k] + pl.constant < -pr[k] * 1.1) { inside = false; break; } }
              if (inside) want = d > proxyD[k] * scale ? 1 : 0;
            }
            if (want !== state[k]) {
              if (want < 0) mesh.setVisibleAt(k, false);
              else {
                const g = want === 1 ? farId[k] : nearId[k];
                if (mesh.getGeometryIdAt(k) !== g) mesh.setGeometryIdAt(k, g);
                if (state[k] < 0) mesh.setVisibleAt(k, true);
                mesh._visibilityChanged = true;
              }
              state[k] = want; changed = true;
            }
            if (want >= 0) { visibleCount++; if (want === 1) proxyCount++; }
          }
          return changed;
        },
        stats: () => ({ instances: n, visible: visibleCount, proxies: proxyCount }),
      };
      return mesh;
    },
  };
  return api;
}
