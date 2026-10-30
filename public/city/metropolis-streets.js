import { polar } from './layout.js';
import { rng, quadCurve } from './metropolis-roads.js';
const pickAngle = (a0, a1, m, rnd) => {
  const cap = Math.min(m, (a1 - a0) / 2);
  return a0 + cap + rnd() * (a1 - a0 - 2 * cap);
};
const rad = d => d * Math.PI / 180;
export function buildStreets(ringRadii, avenueAngles, seed) {
  const rnd = rng(seed), av = [...avenueAngles].sort((a, b) => a - b), roads = [];
  let st = 0, al = 0;
  for (let r = 0; r < ringRadii.length - 1; r++) {
    const r0 = ringRadii[r], r1 = ringRadii[r + 1];
    for (let i = 0; i < av.length; i++) {
      const a0 = av[i], a1 = i + 1 < av.length ? av[i + 1] : av[0] + 360;
      const k = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < k; j++) {
        const a = pickAngle(a0, a1, 4, rnd), endA = a + (rnd() - 0.5) * 6;
        const start = polar(r0 - 1.5, a), end = polar(r1 + 1.5, endA); // overshoot so streets meet the wobbly rings
        const mx = (start.x + end.x) / 2, mz = (start.z + end.z) / 2;
        const dx = end.x - start.x, dz = end.z - start.z, len = Math.hypot(dx, dz) || 1;
        const off = (3 + rnd() * 5) * (rnd() < 0.5 ? -1 : 1);
        const c = { x: mx - dz / len * off, z: mz + dx / len * off };
        let pts = quadCurve([start.x, start.z], [c.x, c.z], [end.x, end.z], 8);
        if (rnd() < 0.25) pts = pts.slice(0, Math.ceil(pts.length / 2));
        roads.push({ kind: 'street', w: 2.2, pts, id: `st${st++}` });
      }
      for (let j = 0; j < 2; j++) {
        const a = pickAngle(a0, a1, 3, rnd), L = 12 + rnd() * 13;
        const rot = (rnd() - 0.5) * 0.8, bend = (rnd() - 0.5) * 0.3;
        const s = polar(r0 - 1, a), th = rad(a);
        let ux = Math.sin(th), uz = -Math.cos(th), co = Math.cos(rot), si = Math.sin(rot);
        let dx = ux * co - uz * si, dz = ux * si + uz * co;
        const mx = s.x + dx * L * 0.6, mz = s.z + dz * L * 0.6;
        ux = dx; uz = dz; co = Math.cos(bend); si = Math.sin(bend);
        dx = ux * co - uz * si; dz = ux * si + uz * co;
        const ex = mx + dx * L * 0.4, ez = mz + dz * L * 0.4;
        roads.push({ kind: 'alley', w: 1.4, pts: [[s.x, s.z], [mx, mz], [ex, ez]], id: `al${al++}` });
      }
    }
  }
  return roads;
}
const P = (p) => (Array.isArray(p) ? { x: p[0], z: p[1] } : p);
export function makeRoadIndex(roads, cell = 20) {
  const map = new Map();
  for (const road of roads) for (let i = 1; i < road.pts.length; i++) {
    const a = P(road.pts[i - 1]), b = P(road.pts[i]), half = road.w / 2;
    const x0 = Math.floor((Math.min(a.x, b.x) - half) / cell);
    const x1 = Math.floor((Math.max(a.x, b.x) + half) / cell);
    const z0 = Math.floor((Math.min(a.z, b.z) - half) / cell);
    const z1 = Math.floor((Math.max(a.z, b.z) + half) / cell);
    const seg = { ax: a.x, az: a.z, bx: b.x, bz: b.z, half };
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const key = `${ix},${iz}`, list = map.get(key);
      if (list) list.push(seg); else map.set(key, [seg]);
    }
  }
  return { cell, map };
}
function segInfo(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + t * dx, z = az + t * dz;
  return { x, z, d: Math.hypot(px - x, pz - z) };
}
export function pointSegmentDistance(px, pz, ax, az, bx, bz) {
  return segInfo(px, pz, ax, az, bx, bz).d;
}
export function distanceToRoads(index, x, z, reach = 12) {
  const { cell, map } = index;
  const x0 = Math.floor((x - reach) / cell), x1 = Math.floor((x + reach) / cell);
  const z0 = Math.floor((z - reach) / cell), z1 = Math.floor((z + reach) / cell);
  let best = Infinity;
  for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
    const segs = map.get(`${ix},${iz}`);
    if (!segs) continue;
    for (const s of segs) {
      const d = segInfo(x, z, s.ax, s.az, s.bx, s.bz).d - s.half;
      if (d < best) best = d;
    }
  }
  return best;
}
export function nearestRoadPoint(index, x, z, reach = 14) {
  const { cell, map } = index;
  const x0 = Math.floor((x - reach) / cell), x1 = Math.floor((x + reach) / cell);
  const z0 = Math.floor((z - reach) / cell), z1 = Math.floor((z + reach) / cell);
  let best = null;
  for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
    const segs = map.get(`${ix},${iz}`);
    if (!segs) continue;
    for (const s of segs) {
      const p = segInfo(x, z, s.ax, s.az, s.bx, s.bz);
      if (!best || p.d < best.d) best = { x: p.x, z: p.z, d: p.d };
    }
  }
  return best;
}
