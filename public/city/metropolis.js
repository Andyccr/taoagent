// Renders the organic metropolis plan (metropolis-plan.js) around the agent core with as few draw calls as possible:
// - roads/canal/sea are flat merged ribbons; every filler kind/variant is one merged geometry instanced per quarter+ring;
// - parks are one vertex-coloured mesh, fields one InstancedMesh with per-instance colours; trees are instanced;
// - wonders are one merged mesh each (+ one glass mesh), built once per page and reused when the agent core rebuilds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cityMaterial, createGeo } from './geo.js';
import { polar } from './layout.js';
import { computeMetropolis, hash } from './metropolis-plan.js';
import { CHINESE_FILLERS } from './fillers-chinese.js';
import { GREEK_FILLERS } from './fillers-greek.js';
import { ROMAN_FILLERS } from './fillers-roman.js';
import { MODERN_FILLERS } from './fillers-modern.js';
import { COMMON_FILLERS, bridge } from './fillers-common.js';
import { OUTER_FILLERS } from './fillers-outer.js';
import { CHINESE_EXTRA } from './fillers-chinese-extra.js';
import { GREEK_EXTRA } from './fillers-greek-extra.js';
import { ROMAN_EXTRA } from './fillers-roman-extra.js';
import { MODERN_EXTRA } from './fillers-modern-extra.js';
import { COMMON_EXTRA } from './fillers-common-extra.js';
import { STREET_PROPS } from './street-props.js';
import { antenna, chimneyPot } from './detail-props.js';
import { createLodBatch, treeProxyGeometry } from './metro-batch.js';
import { scatterProps } from './metro-scatter.js';
import { riverGeometry, wallGeometry, terrainGeometry } from './metro-terrain.js';
import { buildLife, buildNightLights } from './metro-life.js';
import { buildPalace } from './wonder-palace.js';
import { buildGreatPagoda } from './wonder-pagoda.js';
import { buildAcropolis } from './wonder-acropolis.js';
import { buildColosseum } from './wonder-colosseum.js';
import { buildPantheon, buildTriumphalArch } from './wonder-pantheon.js';
import { buildSupertall } from './wonder-supertall.js';
import { buildCityWall } from './wonder-wall.js';
import { buildGreatAqueduct } from './wonder-aqueduct.js';
import { buildTempleOfHeaven } from './wonder-temple-heaven.js';
import { buildSkylineTowers } from './wonder-skyline.js';
import { buildLighthouse } from './wonder-lighthouse.js';

const FILLERS = {
  chinese: { ...CHINESE_FILLERS, ...CHINESE_EXTRA },
  greek: { ...GREEK_FILLERS, ...GREEK_EXTRA },
  roman: { ...ROMAN_FILLERS, ...ROMAN_EXTRA },
  modern: { ...MODERN_FILLERS, ...MODERN_EXTRA },
  common: { ...COMMON_FILLERS, ...COMMON_EXTRA },
  outer: { ...OUTER_FILLERS, ...COMMON_EXTRA },
};
const WONDER_BUILDERS = {
  palace: buildPalace, pagoda: buildGreatPagoda, acropolis: buildAcropolis, colosseum: buildColosseum, pantheon: buildPantheon, arch: buildTriumphalArch, supertall: buildSupertall, wall: () => buildCityWall(100),
  aqueduct: buildGreatAqueduct, heaven: buildTempleOfHeaven, skyline: buildSkylineTowers, lighthouse: buildLighthouse,
};
// Per-quality distances (metres from the camera): near = full filler model (proxy beyond), cull = filler hidden,
// trees = full tree model (canopy stand-in beyond, hidden past treeCull), props / people = dressing hidden beyond.
export const LOD = {
  low: { near: 150, cull: 1500, trees: 120, treeCull: 700, props: 0, people: 0 },
  medium: { near: 250, cull: 2200, trees: 280, treeCull: 1500, props: 150, people: 110 },
  high: { near: 400, cull: 2800, trees: 440, treeCull: 2200, props: 230, people: 170 },
};
const GROUND = { chinese: '#c9c19f', greek: '#cfcab4', roman: '#c8b48e', modern: '#b9bcb6', mixed: '#c4c0a4', blend: '#c9c3a6', harbour: '#b7c2b0', industrial: '#b5b0a4', suburb: '#b8bf98', country: '#a9b98a', farmland: '#a9b98a' };
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

let bridgeRailGeo = null;
function bridgeWithRail(span, width) {
  if (bridgeRailGeo) return bridgeRailGeo;
  const rails = createGeo();
  const t = 0.18, h = 0.7, zEdge = width / 2 - t / 2;
  for (const side of [-1, 1]) rails.box(span, h, t, 0, 0, side * zEdge, '#b9b2a2');
  const railGeo = rails.build();
  if (railGeo.getAttribute('uv')) railGeo.deleteAttribute('uv');
  let deck = bridge(span, width);
  if (!deck) { bridgeRailGeo = railGeo; return bridgeRailGeo; }
  if (deck.index) deck = deck.toNonIndexed();
  if (deck.getAttribute('uv')) deck.deleteAttribute('uv');
  if (deck.getAttribute('uv1')) deck.deleteAttribute('uv1');
  if (!deck.getAttribute('normal')) deck.computeVertexNormals();
  if (!deck.getAttribute('color')) {
    const n = deck.getAttribute('position').count;
    const c = new Float32Array(n * 3).fill(1);
    deck.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  bridgeRailGeo = mergeGeometries([deck, railGeo]) || railGeo;
  return bridgeRailGeo;
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

function segmentHit(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c[0] - a[0], qz = c[1] - a[1];
  const t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + rx * t, a[1] + rz * t];
}
function crosswalkGeometry(plan) {
  const avenues = plan.roads.filter((r) => r.kind === 'avenue');
  const others = plan.roads.filter((r) => r.kind !== 'avenue');
  const seen = new Set(), pos = [], idx = [];
  for (const road of avenues) {
    for (let i = 1; i < road.pts.length; i++) {
      const a = road.pts[i - 1], b = road.pts[i];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
      const ux = dx / len, uz = dz / len, vx = -uz, vz = ux;
      for (const other of others) {
        for (let j = 1; j < other.pts.length; j++) {
          const p = segmentHit(a, b, other.pts[j - 1], other.pts[j]);
          if (!p) continue;
          const key = Math.round(p[0] * 2) + ':' + Math.round(p[1] * 2);
          if (seen.has(key)) continue;
          seen.add(key);
          const span = road.w * 0.92, bar = 0.42, gap = 0.42;
          const n = Math.max(3, Math.floor((span + gap) / (bar + gap)));
          const width = n * bar + (n - 1) * gap;
          for (let k = 0; k < n; k++) {
            const off = -width / 2 + bar / 2 + k * (bar + gap);
            const cx = p[0] + vx * off, cz = p[1] + vz * off;
            const hx = ux * span / 2, hz = uz * span / 2, bx = vx * bar / 2, bz = vz * bar / 2;
            const base = pos.length / 3;
            pos.push(cx - hx - bx, 0, cz - hz - bz, cx + hx - bx, 0, cz + hz - bz, cx + hx + bx, 0, cz + hz + bz, cx - hx + bx, 0, cz - hz + bz);
            idx.push(base, base + 3, base + 1, base + 1, base + 3, base + 2);
          }
        }
      }
    }
  }
  if (!pos.length) return null;
  const nor = new Float32Array(pos.length);
  for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
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

  const sea = new THREE.RingGeometry(plan.sea.shore, plan.outerR + 900, 64, 1,
    THREE.MathUtils.degToRad(90 - plan.sea.to), THREE.MathUtils.degToRad(plan.sea.to - plan.sea.from)).rotateX(-Math.PI / 2);

  sharedStatic = {
    roads, waterGeo, kerbs, sea, crosswalks: crosswalkGeometry(plan), bridge: bridgeWithRail(canal.half * 2 + 1.5, 5.2),
    riverBridge: bridge(plan.river.half * 2 + 2, 6.4), wall: wallGeometry(plan), terrain: terrainGeometry(plan),
  };
  return sharedStatic;
}

// Build the metropolis into `scene`. claimedLots: Set of lot ids now occupied by agent buildings (their fillers are skipped).
export function buildMetropolis(scene, { claimedLots = new Set(), quality = 'medium', pickables = [] } = {}) {
  const plan = computeMetropolis();
  const root = new THREE.Group(); root.name = 'metropolis';
  const solid = cityMaterial('solid');
  const stats = { fillers: 0, fillerKinds: new Set(), instancedMeshes: 0, trees: 0, props: 0, movers: 0, wonders: [], parks: plan.parks.length, fields: plan.fields.length, chimneys: [], piers: [] };
  const batches = [];
  const st = staticGeometry();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();

  const base = new THREE.Mesh(new THREE.CircleGeometry(plan.outerR + 1100, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#aeb89a', roughness: 1 }));
  base.position.y = 0.002; base.receiveShadow = quality !== 'low'; root.add(base);

  const patchGroups = new Map();
  const patches = plan.patches || [];
  const capParks = patches.length > 1800;
  let parkSeen = 0;
  for (const patch of patches) {
    const style = patch.style || patch.zone || patch.kind || patch.type || 'mixed';
    const isPark = style === 'park' || patch.kind === 'park' || patch.zone === 'park';
    if (capParks && isPark && (parkSeen++ % 2 === 1)) continue;
    const pts = patch.pts || patch.points;
    if (!pts || pts.length < 3) continue;
    const color = GROUND[style] || GROUND.mixed;
    if (!patchGroups.has(color)) patchGroups.set(color, []);
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], -pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    g.deleteAttribute('uv');
    patchGroups.get(color).push(g);
  }
  for (const [color, geos] of patchGroups) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    mesh.position.y = 0.006;
    mesh.receiveShadow = quality !== 'low';
    root.add(mesh);
  }

  const sea = new THREE.Mesh(st.sea, cityMaterial('water')); sea.position.y = 0.04; root.add(sea);

  for (const r of st.roads) { const m = new THREE.Mesh(r.geo, new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.95 })); m.position.y = r.y; m.receiveShadow = quality !== 'low'; root.add(m); }
  if (st.crosswalks) { const m = new THREE.Mesh(st.crosswalks, new THREE.MeshStandardMaterial({ color: '#eae6da', roughness: 0.9 })); m.position.y = 0.045; m.receiveShadow = quality !== 'low'; root.add(m); }
  const water = new THREE.Mesh(st.waterGeo, cityMaterial('water')); water.position.y = 0.03; root.userData.water = water; root.add(water);
  const edges = new THREE.Mesh(st.kerbs, new THREE.MeshStandardMaterial({ color: '#b9b2a2', roughness: 0.9 })); edges.position.y = 0.15; root.add(edges);

  // Bridges over the canal.
  const bridges = new THREE.InstancedMesh(st.bridge, solid, plan.bridges.length);
  plan.bridges.forEach((b, i) => { q.setFromAxisAngle(up, Math.PI - THREE.MathUtils.degToRad(b.angle)); m4.compose(pos.set(b.x, 0, b.z), q, sc.set(1, 1, 1)); bridges.setMatrixAt(i, m4); });
  bridges.computeBoundingSphere(); root.add(bridges); stats.instancedMeshes++;

  // Fillers: one distance-LOD BatchedMesh for every unclaimed lot (near: full model, far: two-tone proxy).
  const lod = LOD[quality] || LOD.medium;
  const fillers = createLodBatch(solid, { name: 'fillers', castShadow: quality === 'high', receiveShadow: quality !== 'low' });
  const tint = new THREE.Color();
  for (const lot of plan.lots) {
    if (claimedLots.has(lot.id)) continue;
    const handle = fillers.geometry(lot.style + ':' + lot.kind + ':' + lot.variant, () => fillerGeometry(lot.style, lot.kind, lot.variant), true);
    if (!handle) continue;
    const s = lot.size / 7;
    q.setFromAxisAngle(up, lot.rotY);
    m4.compose(pos.set(lot.x - Math.sin(lot.rotY) * lot.setback, 0, lot.z - Math.cos(lot.rotY) * lot.setback), q, sc.set(s, lot.scaleY * s, s));
    const th = hash(lot.id + 'tint'), b = 0.92 + (th % 17) / 100, warm = ((th >>> 5) % 9 - 4) / 500;
    fillers.instance(handle, m4, tint.setRGB(b + warm, b, b - warm), lod.cull, lod.near);
    stats.fillers++; stats.fillerKinds.add(lot.style + ':' + lot.kind);
  }
  const fillerMesh = fillers.finish();
  if (fillerMesh) { fillerMesh.userData.info = { name: '空置建筑', dept: '可分配给新成员', state: '', label: '' }; root.add(fillerMesh); batches.push(fillerMesh); stats.instancedMeshes++; }

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

  // Street-level dressing (trees by district, lamps, stalls, signs, carts, moored boats, townsfolk) plus rooftop
  // micro-props, all in one distance-culled batch.
  const props = createLodBatch(solid, { name: 'props', castShadow: false, receiveShadow: false });
  const placed = scatterProps(plan, { claimedLots, quality });
  const range = { tree: lod.treeCull, prop: lod.props, boat: lod.props * 1.6, people: lod.people };
  for (const p of placed) {
    const lim = range[p.cls];
    if (!lim) continue;
    const tree = p.cls === 'tree';
    const handle = props.geometry('sp:' + p.kind + ':' + p.variant, () => STREET_PROPS[p.kind]?.(p.variant), tree ? treeProxyGeometry : false);
    q.setFromAxisAngle(up, p.rotY);
    m4.compose(pos.set(p.x, 0, p.z), q, sc.setScalar(p.scale || 1));
    props.instance(handle, m4, null, lim, tree ? lod.trees : Infinity);
    if (p.cls === 'tree') stats.trees++; else stats.props++;
  }
  if (lod.props) {
    const roofs = [['antenna', antenna, 8], ['chimney', chimneyPot, 5]];
    for (const lot of plan.lots) {
      if (claimedLots.has(lot.id)) continue;
      const h = hash(lot.id + 'prop');
      const which = (lot.style === 'modern' || lot.kind === 'workshop' || lot.kind === 'factory') && (h & 3) === 0 ? roofs[0]
        : (lot.kind === 'house' || lot.kind === 'siheyuan' || lot.kind === 'cottage' || lot.kind === 'farmhouse') && (h & 7) === 0 ? roofs[1] : null;
      if (!which) continue;
      const handle = props.geometry('roof:' + which[0], () => which[1](0));
      const hh = hash(lot.id + 'py'), tall = (lot.scaleY || 1) * (lot.size / 7);
      q.setFromAxisAngle(up, lot.rotY + ((hh % 20) - 10) / 40);
      m4.compose(pos.set(lot.x, which[2] * tall, lot.z), q, sc.setScalar(0.85 + (hh % 30) / 100));
      props.instance(handle, m4, null, lod.props);
    }
  }
  const propMesh = props.finish();
  if (propMesh) { root.add(propMesh); batches.push(propMesh); stats.instancedMeshes++; }

  // River, quays and towpaths; city wall with gates; hills and mountains.
  const river = riverGeometry(plan);
  const riverWater = new THREE.Mesh(river.water, cityMaterial('water')); riverWater.position.y = 0.035; root.add(riverWater);
  const quay = new THREE.Mesh(mergeGeometries([river.quay, river.path]), new THREE.MeshStandardMaterial({ color: '#bdb39f', roughness: 0.95 })); quay.receiveShadow = quality !== 'low'; root.add(quay);
  if (plan.riverBridges.length) {
    const rb = new THREE.InstancedMesh(st.riverBridge, solid, plan.riverBridges.length);
    plan.riverBridges.forEach((b, i) => { q.setFromAxisAngle(up, b.rotY); m4.compose(pos.set(b.x, 0, b.z), q, sc.set(b.w / 6.4, 1, 1)); rb.setMatrixAt(i, m4); });
    rb.computeBoundingSphere(); root.add(rb); stats.instancedMeshes++;
  }
  const wall = new THREE.Mesh(st.wall, solid); wall.name = 'cityWall'; wall.castShadow = quality === 'high'; wall.receiveShadow = quality !== 'low'; root.add(wall);
  if (st.terrain.hills) { const hills = new THREE.Mesh(st.terrain.hills, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); hills.name = 'hills'; root.add(hills); }
  if (st.terrain.mountains) { const range = new THREE.Mesh(st.terrain.mountains, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, fog: false })); range.name = 'mountains'; root.add(range); }

  // Ambient life and night lights.
  const life = buildLife(plan, solid, { quality });
  if (life) { root.add(life); stats.movers = life.userData.life.count; }
  const night = buildNightLights(plan, placed, claimedLots);
  root.add(night);

  // Wonders: district anchors, each on a paved pad that hides the roads under it.
  const pad = new THREE.MeshStandardMaterial({ color: '#d6cdb6', roughness: 0.95 });
  const wonders = [];
  for (const w of plan.wonders) {
    const parts = wonderParts(w.kind); if (!parts || !parts.solid) continue;
    const g = new THREE.Group(); g.position.set(w.x, 0, w.z); g.rotation.y = w.rotY;
    if (w.kind !== 'lighthouse') {
    const base2 = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(Math.sin(w.rotY)) > 0.5 ? w.d : w.w, 0.08, Math.abs(Math.sin(w.rotY)) > 0.5 ? w.w : w.d), pad); base2.position.y = 0.04; base2.receiveShadow = quality !== 'low'; g.add(base2);
    }
    const body = new THREE.Mesh(parts.solid, solid); body.castShadow = quality === 'high'; body.receiveShadow = quality === 'high'; g.add(body);
    const meshes = [body];
    if (parts.glass) { const glass = new THREE.Mesh(parts.glass, cityMaterial('glass')); g.add(glass); meshes.push(glass); }
    const info = { wonder: true, id: w.id, name: parts.name || w.name, dept: '奇观 · ' + ({ chinese: '宫城', greek: '希腊学园', roman: '罗马工程区', modern: '现代都会', harbour: '港口' }[w.district] || ''), state: '', label: '' };
    for (const m of meshes) { m.userData.info = info; pickables.push(m); }
    root.add(g);
    wonders.push({ id: w.id, name: info.name, group: g, height: parts.height || 20, radius: parts.radius || 20, x: w.x, z: w.z });
    stats.wonders.push({ id: w.id, name: info.name, triangles: Math.round(parts.solid.getAttribute('position').count / 3 + (parts.glass ? parts.glass.getAttribute('position').count / 3 : 0)) });
  }

  if (quality !== 'low') {
    for (const lot of plan.lots) {
      if (lot.kind === 'factory' || lot.kind === 'silos') stats.chimneys.push({ x: lot.x, z: lot.z, kind: lot.kind });
      if (lot.kind === 'pier' || (lot.style === 'harbour' && lot.kind === 'pier')) stats.piers.push({ x: lot.x, z: lot.z });
    }
  }

  scene.add(root);
  // Per frame: refresh LOD/culling of the batches (only does work when the camera moved) and animate life.
  let lodScale = 1;
  function update(camera, dt) {
    for (const b of batches) { b.userData.lod.setScale(lodScale); b.userData.lod.update(camera); }
    if (life) life.userData.life.update(dt, camera);
  }
  function setNight(on) { night.visible = !!on; }
  function lodStats() { return Object.fromEntries(batches.map((b) => [b.name, b.userData.lod.stats()])); }
  return { root, plan, wonders, update, setNight, lodStats, setLodScale: (k) => { lodScale = k; }, stats: { ...stats, fillerKinds: [...stats.fillerKinds] } };
}
