// Renders the metropolis plan (metropolis-plan.js) around the agent core with as few draw calls as possible:
// - every filler kind/variant is ONE merged geometry, drawn with InstancedMesh per district quarter (frustum-culled per quarter);
// - roads, canal edges and trees are instanced or merged; all fillers share one vertex-coloured material;
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
import { buildPalace } from './wonder-palace.js';
import { buildGreatPagoda } from './wonder-pagoda.js';
import { buildAcropolis } from './wonder-acropolis.js';
import { buildColosseum } from './wonder-colosseum.js';
import { buildPantheon, buildTriumphalArch } from './wonder-pantheon.js';
import { buildSupertall } from './wonder-supertall.js';
import { buildCityWall } from './wonder-wall.js';

const FILLERS = { chinese: CHINESE_FILLERS, greek: GREEK_FILLERS, roman: ROMAN_FILLERS, modern: MODERN_FILLERS, common: COMMON_FILLERS };
const WONDER_BUILDERS = { palace: buildPalace, pagoda: buildGreatPagoda, acropolis: buildAcropolis, colosseum: buildColosseum, pantheon: buildPantheon, arch: buildTriumphalArch, supertall: buildSupertall, wall: () => buildCityWall(72) };
const GROUND = { chinese: '#c9c19f', greek: '#cfcab4', roman: '#c8b48e', modern: '#b9bcb6', mixed: '#c4c0a4' };

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
let sharedStatic = null;
function staticGeometry() {
  if (sharedStatic) return sharedStatic;
  const plan = computeMetropolis();
  const roads = [];
  for (const road of plan.ringRoads) roads.push(new THREE.RingGeometry(road.r - road.w / 2, road.r + road.w / 2, 128, 1).rotateX(-Math.PI / 2));
  for (const av of plan.avenues) {
    const len = av.to - av.from, mid = polar(av.from + len / 2, av.angle);
    const g = new THREE.PlaneGeometry(av.w, len).rotateX(-Math.PI / 2);
    g.rotateY(-THREE.MathUtils.degToRad(av.angle)); g.translate(mid.x, 0, mid.z); roads.push(g);
  }
  const roadGeo = mergeGeometries(roads.map((g) => { g.deleteAttribute('uv'); return g; }));
  const water = new THREE.RingGeometry(plan.canal.inner, plan.canal.outer, 128, 1).rotateX(-Math.PI / 2);
  const edges = mergeGeometries([plan.canal.inner, plan.canal.outer].map((r) => { const g = new THREE.TorusGeometry(r, 0.35, 4, 128).rotateX(Math.PI / 2); g.deleteAttribute('uv'); return g; }));
  const districts = [];
  for (const [angle, style] of [[0, 'modern'], [90, 'roman'], [180, 'chinese'], [270, 'greek']]) {
    // three.js circle theta runs counter-clockwise from +x; our angles run clockwise from -z.
    const g = new THREE.CircleGeometry(plan.outerR + 30, 24, THREE.MathUtils.degToRad(-angle + 90 - 45), Math.PI / 2).rotateX(-Math.PI / 2);
    districts.push({ style, g });
  }
  sharedStatic = { roadGeo, water, edges, districts, bridge: bridge(plan.canal.outer - plan.canal.inner + 1.5, 5.2), tree: tree(0), tree2: tree(1), tree3: tree(2) };
  return sharedStatic;
}

// Build the metropolis into `scene`. claimedLots: Set of lot ids now occupied by agent buildings (their fillers are skipped).
export function buildMetropolis(scene, { claimedLots = new Set(), quality = 'medium', pickables = [] } = {}) {
  const plan = computeMetropolis();
  const root = new THREE.Group(); root.name = 'metropolis';
  const solid = cityMaterial('solid');
  const stats = { fillers: 0, fillerKinds: new Set(), instancedMeshes: 0, trees: 0, wonders: [] };
  const st = staticGeometry();

  for (const d of st.districts) { const m = new THREE.Mesh(d.g, new THREE.MeshStandardMaterial({ color: GROUND[d.style], roughness: 1 })); m.position.y = 0.005; m.receiveShadow = quality !== 'low'; root.add(m); }
  const roads = new THREE.Mesh(st.roadGeo, new THREE.MeshStandardMaterial({ color: '#d8d0bc', roughness: 0.95 })); roads.position.y = 0.02; roads.receiveShadow = quality !== 'low'; root.add(roads);
  const water = new THREE.Mesh(st.water, cityMaterial('water')); water.position.y = 0.03; root.add(water);
  const edges = new THREE.Mesh(st.edges, new THREE.MeshStandardMaterial({ color: '#b9b2a2', roughness: 0.9 })); edges.position.y = 0.15; root.add(edges);
  // Bridges over the canal on every avenue.
  const bridges = new THREE.InstancedMesh(st.bridge, solid, plan.bridges.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  plan.bridges.forEach((b, i) => { const p = polar(b.r, b.angle); q.setFromAxisAngle(up, -THREE.MathUtils.degToRad(b.angle)); m4.compose(pos.set(p.x, 0, p.z), q, sc.set(1, 1, 1)); bridges.setMatrixAt(i, m4); });
  bridges.computeBoundingSphere(); root.add(bridges); stats.instancedMeshes++;

  // Fillers grouped by quarter (frustum culling per quarter) and kind/variant (one geometry each).
  const groups = new Map();
  for (const lot of plan.lots) {
    if (claimedLots.has(lot.id)) continue;
    const quarter = Math.floor((((lot.angle + 45) % 360) + 360) % 360 / 90);
    const key = quarter + '|' + lot.style + '|' + lot.kind + '|' + lot.variant;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lot);
  }
  for (const [key, lots] of groups) {
    const [, style, kind, variant] = key.split('|');
    const geo = fillerGeometry(style, kind, Number(variant));
    if (!geo) continue;
    const mesh = new THREE.InstancedMesh(geo, solid, lots.length);
    lots.forEach((lot, i) => {
      const h = hash(lot.id + 'h');
      const tall = style === 'modern' ? 0.8 + (h % 60) / 100 : 0.94 + (h % 12) / 100;
      q.setFromAxisAngle(up, lot.rotY);
      m4.compose(pos.set(lot.x, 0, lot.z), q, sc.set(1, tall, 1));
      mesh.setMatrixAt(i, m4);
    });
    mesh.computeBoundingSphere();
    mesh.userData.info = { name: lots.length > 1 ? '空置建筑' : '空置建筑', dept: lots[0].claimable ? '可分配给新成员' : '装饰建筑', state: '', label: '' };
    root.add(mesh); stats.instancedMeshes++; stats.fillers += lots.length; stats.fillerKinds.add(style + ':' + kind);
  }

  // Street trees along the avenues (skipped on low quality).
  if (quality !== 'low') {
    const spots = [];
    for (const av of plan.avenues) for (let r = av.from + 4; r < av.to - 2; r += 7) for (const side of [-1, 1]) {
      const off = (av.w / 2 + 0.9) * side, a = THREE.MathUtils.degToRad(av.angle);
      const p = polar(r, av.angle), x = p.x + Math.cos(a) * off, z = p.z + Math.sin(a) * off;
      if (plan.wonders.some((w) => x > w.x0 - 1 && x < w.x1 + 1 && z > w.z0 - 1 && z < w.z1 + 1)) continue;
      spots.push([x, z, hash(av.angle + ':' + r + ':' + side)]);
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
