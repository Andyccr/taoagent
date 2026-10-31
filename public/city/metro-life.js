// Ambient motion for the metropolis: carts, cars and buses on the avenues and ring roads, townsfolk on the
// pavements and boats on the river and in the harbour. Everything lives in one BatchedMesh (one draw call);
// movers far from the camera are hidden instead of animated. Also builds the night window/lamp light cloud.
import * as THREE from 'three';
import { normalizeGeometry } from './metro-batch.js';
import { STREET_PROPS } from './street-props.js';
import { hash } from './metropolis-plan.js';
import { styleAt } from './metro-scatter.js';

function pathOf(pts, closed) {
  const p = closed && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1]) ? [...pts, pts[0]] : pts;
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { pts: p, cum, len: cum[cum.length - 1], closed };
}
function sample(path, s, out) {
  const { pts, cum, len } = path;
  s = path.closed ? ((s % len) + len) % len : Math.max(0, Math.min(len, s));
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
  const seg = cum[hi] - cum[lo] || 1, t = (s - cum[lo]) / seg;
  const a = pts[lo], b = pts[hi];
  out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t;
  out.dx = (b[0] - a[0]) / seg; out.dz = (b[1] - a[1]) / seg;
  return out;
}

export function buildLife(plan, material, { quality = 'medium' } = {}) {
  const budget = { low: 0, medium: 220, high: 420 }[quality] ?? 220;
  if (!budget) return null;
  const kinds = ['car', 'bus', 'handcart', 'oxcart', 'person', 'sampan', 'sailboat', 'barge', 'ferry', 'galley'];
  const geos = {};
  for (const k of kinds) { try { geos[k] = normalizeGeometry(STREET_PROPS[k](hash(k) % 3)); } catch { geos[k] = null; } }
  const roads = plan.roads.filter((r) => r.kind === 'avenue' || r.kind === 'ring').map((r) => ({ road: r, path: pathOf(r.pts, r.kind === 'ring') }));
  const rivers = plan.river.legs.map((l) => pathOf(l.pts, false));
  const harbour = [];
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const a = plan.sea.from + 6 + (plan.sea.to - plan.sea.from - 12) * (i / 40), r = plan.sea.shore + 26 + k * 34 + 8 * Math.sin(i * 0.7 + k); const rr = (a * Math.PI) / 180; pts.push([r * Math.sin(rr), -r * Math.cos(rr)]); }
    harbour.push(pathOf(pts, false));
  }
  const movers = [];
  const R = (n) => { let h = hash('life' + n); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) / 4294967296); };
  const rnd = R(quality);
  const nRoad = Math.round(budget * 0.45), nWalk = Math.round(budget * 0.4), nBoat = budget - nRoad - nWalk;
  for (let i = 0; i < nRoad && roads.length; i++) {
    const { road, path } = roads[Math.floor(rnd() * roads.length)];
    const s0 = rnd() * path.len, probe = sample(path, s0, {});
    const style = styleAt(plan, probe.x, probe.z), modern = style === 'modern' || (style === 'mixed' && rnd() < 0.5) || (style === 'outer' && rnd() < 0.4);
    const kind = modern ? (rnd() < 0.12 ? 'bus' : 'car') : rnd() < 0.6 ? 'handcart' : 'oxcart';
    const dir = rnd() < 0.5 ? 1 : -1;
    movers.push({ kind, path, s: s0, v: dir * (modern ? 7 + rnd() * 5 : 1.6 + rnd() * 1.2), lane: dir * (road.w / 2 - (kind === 'bus' ? 1.4 : 1.1)), bob: 0 });
  }
  for (let i = 0; i < nWalk && roads.length; i++) {
    const { road, path } = roads[Math.floor(rnd() * roads.length)];
    const dir = rnd() < 0.5 ? 1 : -1;
    movers.push({ kind: 'person', path, s: rnd() * path.len, v: dir * (1.0 + rnd() * 0.5), lane: (rnd() < 0.5 ? 1 : -1) * (road.w / 2 + 0.5 + rnd() * 0.4), bob: 1 });
  }
  for (let i = 0; i < nBoat; i++) {
    const onRiver = i % 3 !== 2 && rivers.length;
    const path = onRiver ? rivers[i % rivers.length] : harbour[i % harbour.length];
    const probe = sample(path, path.len / 2, {});
    const kind = onRiver ? (styleAt(plan, probe.x, probe.z) === 'chinese' || i % 2 ? 'sampan' : 'barge') : ['sailboat', 'ferry', 'galley', 'sailboat'][i % 4];
    const dir = i % 2 ? 1 : -1;
    movers.push({ kind, path, s: rnd() * path.len, v: dir * (onRiver ? 1.4 + rnd() : 2.5 + rnd() * 2), lane: onRiver ? dir * plan.river.half * 0.45 : 0, bob: 2, pingpong: !path.closed });
  }
  const used = kinds.filter((k) => geos[k] && movers.some((m) => m.kind === k));
  let verts = 0; for (const k of used) verts += geos[k].getAttribute('position').count;
  const mesh = new THREE.BatchedMesh(movers.length, verts, 0, material);
  mesh.name = 'life'; mesh.sortObjects = false; mesh.perObjectFrustumCulled = true;
  const gid = {}; for (const k of used) gid[k] = mesh.addGeometry(geos[k]);
  const live = movers.filter((m) => gid[m.kind] !== undefined);
  for (const m of live) m.id = mesh.addInstance(gid[m.kind]);
  const white = new THREE.Color(1, 1, 1);
  for (const m of live) mesh.setColorAt(m.id, white);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), at = {};
  const camPos = new THREE.Vector3();
  const maxD = { car: 260, bus: 300, handcart: 200, oxcart: 220, person: 140 };
  let t = 0;
  function update(dt, camera) {
    t += dt;
    camPos.setFromMatrixPosition(camera.matrixWorld);
    for (const m of live) {
      m.s += m.v * dt;
      if (m.pingpong && (m.s < 0 || m.s > m.path.len)) { m.v = -m.v; m.lane = -m.lane; m.s = Math.max(0, Math.min(m.path.len, m.s)); }
      sample(m.path, m.s, at);
      const nx = -at.dz, nz = at.dx, x = at.x + nx * m.lane, z = at.z + nz * m.lane;
      const lim = maxD[m.kind] || 420;
      const far = (x - camPos.x) ** 2 + (z - camPos.z) ** 2 > lim * lim;
      mesh.setVisibleAt(m.id, !far);
      if (far) continue;
      const heading = Math.atan2(at.dx, at.dz) + (m.v < 0 ? Math.PI : 0);
      const boat = m.bob === 2;
      q.setFromAxisAngle(up, heading + (boat ? Math.PI / 2 : m.kind === 'car' || m.kind === 'bus' ? 0 : 0));
      const y = m.bob === 1 ? Math.abs(Math.sin(t * 6 + m.s)) * 0.06 : boat ? 0.05 + Math.sin(t * 1.3 + m.s) * 0.05 : 0.02;
      m4.compose(p.set(x, y, z), q, sc);
      mesh.setMatrixAt(m.id, m4);
    }
  }
  mesh.computeBoundingBox(); mesh.computeBoundingSphere();
  mesh.userData.life = { update, count: live.length };
  return mesh;
}

// Warm window and street-lamp lights for the night view, one Points draw call.
export function buildNightLights(plan, props, claimedLots) {
  const pos = [], col = [];
  const warm = [new THREE.Color(0xffc777), new THREE.Color(0xffa94d), new THREE.Color(0xfff0c2)];
  for (const lot of plan.lots) {
    if (claimedLots.has(lot.id) || lot.kind === 'garden' || lot.kind === 'plaza' || lot.kind === 'pier' || lot.kind === 'crane' || lot.kind === 'vineyard') continue;
    const h = hash(lot.id + 'night'), tall = lot.style === 'modern' ? 8 + (lot.kind === 'towerTall' || lot.kind === 'glassTower' || lot.kind === 'hotel' ? 26 : 8) * (lot.scaleY || 1) : 4;
    const n = lot.style === 'modern' ? 6 : 2 + (h % 2);
    for (let i = 0; i < n; i++) {
      const hh = hash(lot.id + 'w' + i);
      if (hh % 4 === 0) continue;
      const a = lot.rotY + ((hh % 4) * Math.PI) / 2, rr = lot.size * 0.42;
      pos.push(lot.x + Math.sin(a) * rr + ((hh >>> 4) % 10 - 5) / 6, 1.4 + ((hh >>> 8) % 100) / 100 * tall, lot.z + Math.cos(a) * rr + ((hh >>> 12) % 10 - 5) / 6);
      const c = warm[hh % 3]; col.push(c.r, c.g, c.b);
    }
  }
  for (const p of props) {
    if (p.kind !== 'lanternPost' && p.kind !== 'modernLamp' && p.kind !== 'gasLamp' && p.kind !== 'romanTorch') continue;
    pos.push(p.x, p.kind === 'romanTorch' ? 1.6 : 3.1, p.z);
    const c = p.kind === 'lanternPost' ? new THREE.Color(0xff6a2e) : p.kind === 'modernLamp' ? new THREE.Color(0xfff4d6) : warm[0];
    col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32;
  const ctx = dot.getContext('2d'), grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.75)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(dot); tex.colorSpace = THREE.SRGBColorSpace;
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 4.6, map: tex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true, fog: false, blending: THREE.AdditiveBlending }));
  pts.name = 'nightLights'; pts.visible = false; pts.frustumCulled = false;
  return pts;
}
