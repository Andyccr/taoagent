// Merged, vertex-coloured low-poly geometry builder for city fillers and wonders.
// Everything a builder adds is baked into ONE BufferGeometry (position, normal, color) so a whole
// building or wonder costs one draw call, and fillers can be drawn with InstancedMesh.
// Conventions: units are metres-ish (agent plot = 8 x 8), y is up, buildings face +z, y passed to
// primitives is the BOTTOM of the shape. Colours are hex numbers or CSS strings.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSurfaceTexture } from './textures.js';

export { THREE };

// Simplified builds (low preset): while active, parts smaller than `min` (bounding radius, metres) are dropped and
// round shapes get at most `seg` segments, so the same builder code yields a much lighter model.
let SIMPLE = null;
export function buildSimplified(fn, { min = 0.55, seg = 6 } = {}) {
  const prev = SIMPLE; SIMPLE = { min, seg };
  try { return fn(); } finally { SIMPLE = prev; }
}

export function createGeo() {
  const parts = [];
  const stack = [new THREE.Matrix4()];
  const color = new THREE.Color();
  const tmp = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let tris = 0;

  // Generated builders sometimes pass a colour where a segment count belongs; clamp so a typo cannot explode the mesh.
  const segs = (n, d, max = 48) => { const v = Number.isFinite(n) && n >= 3 && n <= 256 ? Math.min(Math.round(n), max) : d; return SIMPLE ? Math.min(v, SIMPLE.seg) : v; };
  function push(geometry, hex, x, y, z, rot = {}) {
    if (rot === null || typeof rot !== 'object') rot = {};
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!g.getAttribute('uv')) {
      const n = g.getAttribute('position').count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    if (g.getAttribute('uv1')) g.deleteAttribute('uv1');
    e.set(rot.rx || 0, rot.ry || 0, rot.rz || 0);
    q.setFromEuler(e);
    tmp.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(rot.sx ?? 1, rot.sy ?? 1, rot.sz ?? 1));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(stack[stack.length - 1], tmp));
    if (SIMPLE) { g.computeBoundingSphere(); if (g.boundingSphere.radius < SIMPLE.min) return g; }
    color.set(hex);
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    tris += n / 3;
    parts.push(g);
    return g;
  }

  const api = {
    THREE,
    // Run fn with an extra transform (translate x,y,z, rotate ry, uniform scale s) applied to everything it adds.
    group(opts, fn) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(opts.x || 0, opts.y || 0, opts.z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, opts.ry || 0, 0)), new THREE.Vector3(opts.s ?? 1, opts.s ?? 1, opts.s ?? 1));
      stack.push(new THREE.Matrix4().multiplyMatrices(stack[stack.length - 1], m));
      try { fn(api); } finally { stack.pop(); }
    },
    // Axis-aligned box, bottom at y. rot: { ry, rx, rz }.
    box(w, h, d, x, y, z, hex, rot) { return push(new THREE.BoxGeometry(w, h, d), hex, x, y + h / 2, z, rot); },
    // Cylinder / frustum, bottom at y.
    cyl(rTop, rBottom, h, x, y, z, hex, seg = 10, rot) { return push(new THREE.CylinderGeometry(rTop, rBottom, h, segs(seg, 10), 1, false), hex, x, y + h / 2, z, rot); },
    // Cone, bottom at y.
    cone(r, h, x, y, z, hex, seg = 10, rot) { return push(new THREE.ConeGeometry(r, h, segs(seg, 10)), hex, x, y + h / 2, z, rot); },
    // Upper hemisphere dome of radius r whose base circle sits at y.
    dome(r, x, y, z, hex, seg = 16) { seg = segs(seg, 16); return push(new THREE.SphereGeometry(r, seg, Math.max(4, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2), hex, x, y, z); },
    sphere(r, x, y, z, hex, seg = 10) { seg = segs(seg, 10, 24); return push(new THREE.SphereGeometry(r, seg, Math.max(4, seg >> 1)), hex, x, y, z); },
    // Torus lying flat (ring) at height y.
    ring(r, tube, x, y, z, hex, seg = 24) { return push(new THREE.TorusGeometry(r, tube, 4, segs(seg, 24, 64)), hex, x, y, z, { rx: Math.PI / 2 }); },
    // Gable roof: triangular prism, ridge along x, width w (x), depth d (z), height h, bottom at y.
    gable(w, h, d, x, y, z, hex, rot) {
      const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
      g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2);
      return push(g, hex, x, y, z, rot);
    },
    // Hip roof (4 slopes) with eaves overhang: base w x d at y, ridge length w-d (or a point), height h.
    // flare > 0 adds a thin upturned eave skirt (Chinese style).
    hip(w, d, h, x, y, z, hex, flare = 0, rot) {
      // 4-sided frustum: the top keeps a narrow ridge band (12% of the base), reads as a hip roof in low poly.
      const g = new THREE.CylinderGeometry(0.7071 * 0.12, 0.7071, 1, 4, 1); g.rotateY(Math.PI / 4);
      g.scale(w, h, d); g.translate(0, h / 2, 0);
      const out = push(g, hex, x, y, z, rot);
      if (flare > 0) {
        const s = new THREE.CylinderGeometry(0.7071, 0.7071 + flare * 0.12, 0.12, 4, 1, true); s.rotateY(Math.PI / 4);
        s.scale(w * (1 + flare * 0.06), 1, d * (1 + flare * 0.06)); s.translate(0, 0.02, 0);
        push(s, hex, x, y, z, rot);
      }
      return out;
    },
    // Semicircular arch opening frame: a flat arch ring of outer radius r, thickness t, depth d, centre at (x, y, z), facing z.
    arch(r, t, d, x, y, z, hex, seg = 8, rot) {
      const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI, false); s.lineTo(-r + t, 0); s.absarc(0, 0, r - t, Math.PI, 0, true); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: segs(seg, 8, 24) }); g.translate(0, 0, -d / 2);
      return push(g, hex, x, y, z, rot);
    },
    // Extruded polygon footprint (points [[x,z]...]) of height h, bottom at y.
    prism(points, h, y, hex) {
      const s = new THREE.Shape(points.map(([px, pz]) => new THREE.Vector2(px, -pz)));
      const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
      return push(g, hex, 0, y, 0);
    },
    // Add any THREE.BufferGeometry (it is consumed).
    raw(geometry, hex, x = 0, y = 0, z = 0, rot) { return push(geometry, hex, x, y, z, rot); },
    triangles() { return Math.round(tris); },
    // Merge everything added so far into one geometry (with bounding sphere computed).
    build() {
      if (!parts.length) return new THREE.BufferGeometry();
      const g = mergeGeometries(parts, false);
      for (const p of parts) p.dispose();
      parts.length = 0;
      g.computeBoundingBox(); g.computeBoundingSphere();
      return g;
    },
  };
  return api;
}

// Shared materials: one per surface type for the whole city.
// createGeo keeps uv so the shared solid material can carry the plaster bump and roughness detail.
const shared = new Map();
export function cityMaterial(kind = 'solid') {
  if (shared.has(kind)) return shared.get(kind);
  const solid = kind !== 'glass' && kind !== 'water';
  const surface = solid ? createSurfaceTexture('plaster') : null;
  const m = kind === 'glass'
    ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.55, emissive: new THREE.Color('#1d3550'), emissiveIntensity: 0.35 })
    : kind === 'water'
      ? new THREE.MeshStandardMaterial({ color: '#5f8fa8', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.88 })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.02, flatShading: true, bumpMap: surface, bumpScale: 0.03, roughnessMap: surface });
  shared.set(kind, m);
  return m;
}
