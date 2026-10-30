// Renders the organic metropolis plan (metropolis-plan.js) around the agent core with as few draw calls as possible:
// - roads/canal/sea are flat merged ribbons; every filler kind/variant is one merged geometry instanced per quarter+ring;
// - parks are one vertex-coloured mesh, fields one InstancedMesh with per-instance colours; trees are instanced;
// - wonders are one merged mesh each (+ one glass mesh), built once per page and reused when the agent core rebuilds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cityMaterial } from './geo.js';
import { polar } from './layout.js';
import { computeMetropolis, hash } from './metropolis-plan.js';
import { CHINESE_FILLERS } from './fillers-chinese.js';
import { GREEK_FILLERS } from './fillers-greek.js';
import { ROMAN_FILLERS } from './fillers-roman.js';
import { MODERN_FILLERS } from './fillers-modern.js';
import { COMMON_FILLERS, tree, bridge } from './fillers-common.js';
import { OUTER_FILLERS } from './fillers-outer.js';
import { buildPalace } from './wonder-palace.js';
import { buildGreatPagoda } from './wonder-pagoda.js';
import { buildAcropolis } from './wonder-acropolis.js';
import { buildColosseum } from './wonder-colosseum.js';
import { buildPantheon, buildTriumphalArch } from './wonder-pantheon.js';
import { buildSupertall } from './wonder-supertall.js';
import { buildCityWall } from './wonder-wall.js';

const FILLERS = { chinese: CHINESE_FILLERS, greek: GREEK_FILLERS, roman: ROMAN_FILLERS, modern: MODERN_FILLERS, common: COMMON_FILLERS, outer: OUTER_FILLERS };
const WONDER_BUILDERS = { palace: buildPalace, pagoda: buildGreatPagoda, acropolis: buildAcropolis, colosseum: buildColosseum, pantheon: buildPantheon, arch: buildTriumphalArch, supertall: buildSupertall, wall: () => buildCityWall(72) };
const GROUND = { chinese: '#c9c19f', greek: '#cfcab4', roman: '#c8b48e', modern: '#b9bcb6', mixed: '#c4c0a4' };
const PARK = { park: '#8fb36a', plaza: '#d6cdb6', market: '#cdbf9f' };
const CROP = ['#c9b458', '#8fae5a', '#a7c46a', '#b98e4f'];

const fillerCache = new Map();
function fillerGeometry(style, kind, variant) {
  const key = style + ':' + kind + ':' + variant;
  if (!fillerCache.has(key)) {
    const make = FILLERS[style]?.[kind];
    let g = null;
    try { g = make ? make(variant) : null; } catch (error) { console.warn('filler failed', key, error); }
    fillerCache.set(key, g && g.getAttribute && g.getAttribute('position') ? g : null);
  }
  return fillerCache.get(key);
}
const wonderCache = new Map();
function wonderParts(kind) {
  if (!wonderCache.has(kind)) {
    let w = null;
    try { w = WONDER_BUILDERS[kind]?.() || null; } catch (error) { console.warn('wonder failed', kind, error); }
    wonderCache.set(kind, w);
  }
  return wonderCache.get(kind);
}

function polylineNormals(pts, closed = false) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? pts[i - 1] : (closed ? pts[n - 1] : null);
    const next = i < n - 1 ? pts[i + 1] : (closed ? pts[0] : null);
    let dx = 0, dz = 0;
    if (next) { dx += next[0] - pts[i][0]; dz += next[1] - pts[i][1]; }
    if (prev) { dx += pts[i][0] - prev[0]; dz += pts[i][1] - prev[1]; }
    const len = Math.hypot(dx, dz) || 1;
    out.push([-dz / len, dx / len]);
  }
  return out;
}
function offsetPolyline(pts, off, closed = false) {
  const ns = polylineNormals(pts, closed);
  return pts.map(([x, z], i) => [x + ns[i][0] * off, z + ns[i][1] * off]);
}
function ribbon(pts, w, closed = false) {
  const n = pts.length, half = w / 2, ns = polylineNormals(pts, closed);
  const pos = [], nor = [], idx = [];
  for (let i = 0; i < n; i++) {
    const [x, z] = pts[i], [nx, nz] = ns[i];
    pos.push(x + nx * half, 0, z + nz * half, x - nx * half, 0, z - nz * half);
    nor.push(0, 1, 0, 0, 1, 0);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = i * 2, b = a + 1, c = ((i + 1) % n) * 2, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

let sharedStatic = null;
function staticGeometry() {
  if (sharedStatic) return sharedStatic;
  const plan = computeMetropolis();
  const byKind = { ring: [], avenue: [], street: [], alley: [] };
  for (const road of plan.roads) {
    const a = road.pts[0], b = road.pts[road.pts.length - 1];
    const closed = road.kind === 'ring' && (a[0] !== b[0] || a[1] !== b[1]);
    (byKind[road.kind] || (byKind[road.kind] = [])).push(ribbon(road.pts, road.w, closed));
  }
  const merge = (gs) => gs && gs.length ? mergeGeometries(gs) : null;
  const roads = [];
  const main = merge([...byKind.ring, ...byKind.avenue]);
  if (main) roads.push({ geo: main, color: '#d8d0bc', y: 0.02 });
  const street = merge(byKind.street); if (street) roads.push({ geo: street, color: '#cfc5ae', y: 0.025 });
  const alley = merge(byKind.alley); if (alley) roads.push({ geo: alley, color: '#c4b99f', y: 0.03 });

  const canal = plan.canal, cp = canal.pts, last = cp[cp.length - 1];
  const canalPts = cp.length > 2 && cp[0][0] === last[0] && cp[0][1] === last[1] ? cp.slice(0, -1) : cp;
  const waterGeo = ribbon(canalPts, canal.half * 2, true);
  const kerbs = mergeGeometries([-1, 1].map((side) => ribbon(offsetPolyline(canalPts, side * canal.half, true), 0.7, true)));

  const sea = new THREE.RingGeometry(plan.sea.shore, plan.outerR + 140, 48, 1,
    THREE.MathUtils.degToRad(90 - plan.sea.to), THREE.MathUtils.degToRad(plan.sea.to - plan.sea.from)).rotateX(-Math.PI / 2);

  const districts = [];
  for (const [angle, style] of [[0, 'modern'], [90, 'roman'], [180, 'chinese'], [270, 'greek']]) {
    const g = new THREE.CircleGeometry(plan.cityEdge + 6, 24, THREE.MathUtils.degToRad(-angle + 90 - 45), Math.PI / 2).rotateX(-Math.PI / 2);
    districts.push({ style, g });
  }
  const blend = new THREE.RingGeometry(plan.cityEdge + 6, 222, 96, 1).rotateX(-Math.PI / 2);
  const outer = new THREE.RingGeometry(222, plan.outerEdge, 96, 1).rotateX(-Math.PI / 2);
  const country = new THREE.RingGeometry(plan.outerEdge, plan.outerR + 140, 96, 1).rotateX(-Math.PI / 2);

  sharedStatic = { roads, waterGeo, kerbs, sea, districts, blend, outer, country, bridge: bridge(canal.half * 2 + 1.5, 5.2), tree: tree(0), tree2: tree(1), tree3: tree(2) };
  return sharedStatic;
}

// Build the metropolis into `scene`. claimedLots: Set of lot ids now occupied by agent buildings (their fillers are skipped).
export function buildMetropolis(scene, { claimedLots = new Set(), quality = 'medium', pickables = [] } = {}) {
  const plan = computeMetropolis();
  const root = new THREE.Group(); root.name = 'metropolis';
  const solid = cityMaterial('solid');
  const stats = { fillers: 0, fillerKinds: new Set(), instancedMeshes: 0, trees: 0, wonders: [], parks: plan.parks.length, fields: plan.fields.length };
  const st = staticGeometry();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();

  for (const d of st.districts) { const m = new THREE.Mesh(d.g, new THREE.MeshStandardMaterial({ color: GROUND[d.style], roughness: 1 })); m.position.y = 0.006; m.receiveShadow = quality !== 'low'; root.add(m); }
  const blend = new THREE.Mesh(st.blend, new THREE.MeshStandardMaterial({ color: '#c9c3a6', roughness: 1 })); blend.position.y = 0.005; blend.receiveShadow = quality !== 'low'; root.add(blend);
  const outer = new THREE.Mesh(st.outer, new THREE.MeshStandardMaterial({ color: '#b8bf98', roughness: 1 })); outer.position.y = 0.004; outer.receiveShadow = quality !== 'low'; root.add(outer);
  const country = new THREE.Mesh(st.country, new THREE.MeshStandardMaterial({ color: '#a9b98a', roughness: 1 })); country.position.y = 0.003; country.receiveShadow = quality !== 'low'; root.add(country);

  const sea = new THREE.Mesh(st.sea, cityMaterial('water')); sea.position.y = 0.04; root.add(sea);

  for (const r of st.roads) { const m = new THREE.Mesh(r.geo, new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.95 })); m.position.y = r.y; m.receiveShadow = quality !== 'low'; root.add(m); }
  const water = new THREE.Mesh(st.waterGeo, cityMaterial('water')); water.position.y = 0.03; root.add(water);
  const edges = new THREE.Mesh(st.kerbs, new THREE.MeshStandardMaterial({ color: '#b9b2a2', roughness: 0.9 })); edges.position.y = 0.15; root.add(edges);

  // Bridges over the canal.
  const bridges = new THREE.InstancedMesh(st.bridge, solid, plan.bridges.length);
  plan.bridges.forEach((b, i) => { q.setFromAxisAngle(up, -b.angle); m4.compose(pos.set(b.x, 0, b.z), q, sc.set(1, 1, 1)); bridges.setMatrixAt(i, m4); });
  bridges.computeBoundingSphere(); root.add(bridges); stats.instancedMeshes++;

  // Fillers grouped by quarter+ring (finer frustum culling) and kind/variant (one geometry each).
  const groups = new Map();
  for (const lot of plan.lots) {
    if (claimedLots.has(lot.id)) continue;
    const quarter = Math.floor((((lot.angle + 45) % 360) + 360) % 360 / 90);
    const key = quarter + (Math.hypot(lot.x, lot.z) < 175 ? 'in' : 'out') + '|' + lot.style + '|' + lot.kind + '|' + lot.variant;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lot);
  }
  for (const [key, lots] of groups) {
    const [, style, kind, variant] = key.split('|');
    const geo = fillerGeometry(style, kind, Number(variant));
    if (!geo) continue;
    const mesh = new THREE.InstancedMesh(geo, solid, lots.length);
    lots.forEach((lot, i) => {
      const s = lot.size / 7;
      q.setFromAxisAngle(up, lot.rotY);
      m4.compose(pos.set(lot.x - Math.sin(lot.rotY) * lot.setback, 0, lot.z - Math.cos(lot.rotY) * lot.setback), q, sc.set(s, lot.scaleY * s, s));
      mesh.setMatrixAt(i, m4);
    });
    mesh.computeBoundingSphere();
    mesh.userData.info = { name: '空置建筑', dept: lots[0].claimable ? '可分配给新成员' : '装饰建筑', state: '', label: '' };
    root.add(mesh); stats.instancedMeshes++; stats.fillers += lots.length; stats.fillerKinds.add(style + ':' + kind);
  }

  // Parks: one merged vertex-coloured mesh.
  const parkGeos = [];
  for (const p of plan.parks) {
    const g = new THREE.CircleGeometry(p.r, 20).rotateX(-Math.PI / 2).translate(p.x, 0.012, p.z);
    g.deleteAttribute('uv');
    const c = new THREE.Color(PARK[p.kind] || PARK.park);
    const n = g.getAttribute('position').count, colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parkGeos.push(g);
  }
  if (parkGeos.length) {
    const parks = new THREE.Mesh(mergeGeometries(parkGeos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    parks.receiveShadow = quality !== 'low'; root.add(parks);
  }

  // Fields: one instanced flat box with per-instance crop colours.
  if (plan.fields.length) {
    const fields = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), plan.fields.length);
    plan.fields.forEach((f, i) => {
      q.setFromAxisAngle(up, f.rotY);
      m4.compose(pos.set(f.x, 0.04, f.z), q, sc.set(f.w, 1, f.d));
      fields.setMatrixAt(i, m4);
      const ci = typeof f.crop === 'number' ? ((Math.floor(f.crop) % 4) + 4) % 4 : hash(String(f.crop)) % 4;
      fields.setColorAt(i, new THREE.Color(CROP[ci]));
    });
    fields.instanceColor.needsUpdate = true;
    fields.computeBoundingSphere(); fields.receiveShadow = quality !== 'low'; root.add(fields); stats.instancedMeshes++;
  }

  // Street trees along avenues plus park trees (skipped on low quality).
  if (quality !== 'low') {
    const spots = [];
    for (const road of plan.roads) {
      if (road.kind !== 'avenue') continue;
      const pts = road.pts, off = road.w / 2 + 0.9;
      let carry = 4;
      for (let s = 0; s < pts.length - 1; s++) {
        const [x0, z0] = pts[s], [x1, z1] = pts[s + 1];
        const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
        if (!len) continue;
        const nx = -dz / len, nz = dx / len;
        let d = carry;
        while (d < len) {
          const t = d / len, x = x0 + dx * t, z = z0 + dz * t;
          for (const side of [-1, 1]) {
            const tx = x + nx * off * side, tz = z + nz * off * side;
            if (plan.wonders.some((w) => tx > w.x0 - 1 && tx < w.x1 + 1 && tz > w.z0 - 1 && tz < w.z1 + 1)) continue;
            if (plan.lots.some((l) => (l.x - tx) ** 2 + (l.z - tz) ** 2 < 9)) continue;
            spots.push([tx, tz, hash(road.kind + ':' + s + ':' + Math.round(d) + ':' + side)]);
          }
          d += 7;
        }
        carry = d - len;
      }
    }
    for (const p of plan.parks) {
      const count = 2 + hash(p.x + ':' + p.z + ':n') % 5;
      for (let i = 0; i < count; i++) {
        const a = (hash(p.x + ':' + p.z + ':a' + i) % 628) / 100;
        const rr = p.r * (0.2 + (hash(p.x + ':' + p.z + ':r' + i) % 65) / 100);
        const tx = p.x + Math.cos(a) * rr, tz = p.z + Math.sin(a) * rr;
        if (plan.wonders.some((w) => tx > w.x0 - 1 && tx < w.x1 + 1 && tz > w.z0 - 1 && tz < w.z1 + 1)) continue;
        spots.push([tx, tz, hash(p.x + ':' + p.z + ':h' + i)]);
      }
    }
    const kinds = [st.tree, st.tree2, st.tree3];
    kinds.forEach((g, k) => {
      const mine = spots.filter((s) => s[2] % 3 === k); if (!g || !mine.length) return;
      const mesh = new THREE.InstancedMesh(g, solid, mine.length);
      mine.forEach(([x, z, h], i) => { q.setFromAxisAngle(up, (h % 628) / 100); m4.compose(pos.set(x, 0, z), q, sc.setScalar(0.9 + (h % 30) / 100)); mesh.setMatrixAt(i, m4); });
      mesh.computeBoundingSphere(); root.add(mesh); stats.instancedMeshes++; stats.trees += mine.length;
    });
  }

  // Wonders: district anchors, each on a paved pad that hides the roads under it.
  const pad = new THREE.MeshStandardMaterial({ color: '#d6cdb6', roughness: 0.95 });
  const wonders = [];
  for (const w of plan.wonders) {
    const parts = wonderParts(w.kind); if (!parts || !parts.solid) continue;
    const g = new THREE.Group(); g.position.set(w.x, 0, w.z); g.rotation.y = w.rotY;
    const base = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(Math.sin(w.rotY)) > 0.5 ? w.d : w.w, 0.08, Math.abs(Math.sin(w.rotY)) > 0.5 ? w.w : w.d), pad); base.position.y = 0.04; base.receiveShadow = quality !== 'low'; g.add(base);
    const body = new THREE.Mesh(parts.solid, solid); body.castShadow = quality === 'high'; body.receiveShadow = quality === 'high'; g.add(body);
    const meshes = [body];
    if (parts.glass) { const glass = new THREE.Mesh(parts.glass, cityMaterial('glass')); g.add(glass); meshes.push(glass); }
    const info = { wonder: true, id: w.id, name: parts.name || w.name, dept: '奇观 · ' + ({ chinese: '宫城', greek: '希腊学园', roman: '罗马工程区', modern: '现代都会' }[w.district] || ''), state: '', label: '' };
    for (const m of meshes) { m.userData.info = info; pickables.push(m); }
    root.add(g);
    wonders.push({ id: w.id, name: info.name, group: g, height: parts.height || 20, radius: parts.radius || 20, x: w.x, z: w.z });
    stats.wonders.push({ id: w.id, name: info.name, triangles: Math.round(parts.solid.getAttribute('position').count / 3 + (parts.glass ? parts.glass.getAttribute('position').count / 3 : 0)) });
  }
  scene.add(root);
  return { root, plan, wonders, stats: { ...stats, fillerKinds: [...stats.fillerKinds] } };
}
