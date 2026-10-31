// Terrain height for the metropolis: the old core and the river/canal banks sit at water level, the land rises in
// broad rolling hills toward the walls and the countryside, the bay shores shelve down into beaches, and every
// wonder stands on a levelled platform. Sampled once into two height grids (fine over the city, coarse to the
// horizon) so placing thousands of buildings, props and movers is a cheap bilinear lookup.
import { computeMetropolis } from './metropolis-plan.js';
import { makeRoadIndex, distanceToRoads } from './metropolis-streets.js';
import { polar } from './layout.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash2(ix, iz) { let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, z) => noise(x, z) * 0.62 + noise(x * 2.03 + 17.1, z * 2.03 - 9.4) * 0.26 + noise(x * 4.1 - 3.3, z * 4.1 + 5.2) * 0.12;

// Open sea outline (shared with the sea mesh): the harbour arc widening into a ragged bay out to the horizon.
export const SEA_FAR = 2440, LAND_R = 2450;
export function seaOutline(plan) {
  const { shore, from, to } = plan.sea, pts = [];
  const wob = (r, k) => 2.2 * Math.sin(r / 37 + k) + 1.3 * Math.sin(r / 13 + k * 2.1);
  const side = (deg, dir, r) => deg + dir * (14 * smooth(shore + 40, 1150, r) + wob(r, dir + 2) * Math.min(1, (r - shore) / 120));
  for (let i = 0; i <= 40; i++) { const p = polar(shore, from + (to - from) * (i / 40)); pts.push([p.x, p.z]); }
  for (let r = shore + 15; r <= SEA_FAR; r += 30) { const p = polar(r, side(to, 1, r)); pts.push([p.x, p.z]); }
  for (let i = 0; i <= 24; i++) { const p = polar(SEA_FAR, to + 14 - (to - from + 28) * (i / 24)); pts.push([p.x, p.z]); }
  for (let r = SEA_FAR; r >= shore + 15; r -= 30) { const p = polar(r, side(from, -1, r)); pts.push([p.x, p.z]); }
  return pts;
}
// The two natural coasts of the bay (headland sides, harbour quay excluded), out to maxR.
export function coastSides(plan, maxR = 1500) {
  const { shore, from, to } = plan.sea, out = [[], []];
  const wob = (r, k) => 2.2 * Math.sin(r / 37 + k) + 1.3 * Math.sin(r / 13 + k * 2.1);
  const side = (deg, dir, r) => deg + dir * (14 * smooth(shore + 40, 1150, r) + wob(r, dir + 2) * Math.min(1, (r - shore) / 120));
  for (let r = shore + 15; r <= maxR; r += 10) {
    const a = polar(r, side(to, 1, r)), b = polar(r, side(from, -1, r));
    out[0].push([a.x, a.z]); out[1].push([b.x, b.z]);
  }
  return out;
}
function insidePoly(pts, x, z) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function makeRawHeight(plan) {
  const river = makeRoadIndex(plan.river.legs.map((l) => ({ pts: l.pts, w: 0 })));
  const canal = makeRoadIndex([{ pts: plan.canal.pts, w: 0 }]);
  const outline = seaOutline(plan);
  const coast = makeRoadIndex([{ pts: [...outline, outline[0]], w: 0 }]);
  const { from, to } = plan.sea;
  const norm = (a) => ((a % 360) + 360) % 360;
  const raw = (x, z) => {
    const r = Math.hypot(x, z);
    const rise = smooth(70, 330, r) * 13 + smooth(300, 950, r) * 13;
    let h = rise * (0.35 + 0.85 * fbm(x / 260 + 3.7, z / 260 - 1.9)) + (fbm(x / 70, z / 70) - 0.5) * 3.2 * smooth(70, 220, r);
    h *= smooth(plan.river.half + 5, plan.river.half + 85, distanceToRoads(river, x, z, 100));
    h *= smooth(plan.canal.half + 3, plan.canal.half + 26, distanceToRoads(canal, x, z, 30));
    // Coast: land falls to the sea; beaches dip just under the waterline except behind the harbour sea wall.
    const dc = distanceToRoads(coast, x, z, 90);
    if (dc < 90) {
      const wet = insidePoly(outline, x, z);
      const a = norm((Math.atan2(x, -z) * 180) / Math.PI);
      const quay = a >= from - 1 && a <= to + 1 && r < plan.sea.shore + 6;
      if (wet) h = quay ? 0 : -1.2 - Math.min(dc, 30) * 0.12;
      else h = h * smooth(0, 80, dc) + (quay ? 0.25 : -0.9 * (1 - smooth(0, 10, dc)));
    }
    return h;
  };
  // Wonders stand on levelled ground (except the ones built out in the water).
  const flats = plan.wonders.map((w) => ({ w, c: Math.cos(-w.rotY), s: Math.sin(-w.rotY), hw: w.w / 2, hd: w.d / 2, h: raw(w.x, w.z) })).filter((f) => f.h > -0.5);
  return (x, z) => {
    let h = raw(x, z);
    for (const f of flats) {
      const dx = x - f.w.x, dz = z - f.w.z;
      if (Math.abs(dx) > f.hw + f.hd + 40 || Math.abs(dz) > f.hw + f.hd + 40) continue;
      const u = dx * f.c - dz * f.s, v = dx * f.s + dz * f.c;
      // rotY rotates local x/z; the footprint is w along local x and d along local z (swapped when turned 90 degrees).
      const turned = Math.abs(Math.sin(f.w.rotY)) > 0.5, hx = turned ? f.hd : f.hw, hz = turned ? f.hw : f.hd;
      const d = Math.hypot(Math.max(0, Math.abs(u) - hx), Math.max(0, Math.abs(v) - hz));
      if (d < 30) h += (f.h - h) * (1 - smooth(0, 30, d));
    }
    return h;
  };
}

function grid(fn, half, cell, maxR = Infinity) {
  const n = Math.round((half * 2) / cell) + 1, data = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + i * cell, z = -half + j * cell;
    if (x * x + z * z < maxR * maxR) data[j * n + i] = fn(x, z);
  }
  return { n, half, cell, data };
}
function sample(g, x, z) {
  const fx = (x + g.half) / g.cell, fz = (z + g.half) / g.cell;
  const i = Math.min(g.n - 2, Math.max(0, Math.floor(fx))), j = Math.min(g.n - 2, Math.max(0, Math.floor(fz)));
  const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j)), d = g.data, n = g.n;
  const a = d[j * n + i], b = d[j * n + i + 1], c = d[(j + 1) * n + i], e = d[(j + 1) * n + i + 1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
}

let field = null;
export const FINE_R = 600, FINE_HALF = 612, FINE_CELL = 5;
function ensure() {
  if (field) return field;
  const plan = computeMetropolis(), fn = makeRawHeight(plan);
  field = { fine: grid(fn, FINE_HALF, FINE_CELL, FINE_R + 2 * FINE_CELL), coarse: grid(fn, LAND_R + 40, 24), raw: fn };
  return field;
}
// Ground height at world x/z (metres above sea level).
export function heightAt(x, z) {
  const f = ensure();
  if (x * x + z * z < FINE_R * FINE_R) return sample(f.fine, x, z);
  return sample(f.coarse, x, z);
}
// Lowest ground under a square footprint (so a building never floats on a slope; the uphill side sinks in).
export function footprintHeight(x, z, size, rotY = 0) {
  const h = size / 2, c = Math.cos(rotY), s = Math.sin(rotY);
  let m = heightAt(x, z);
  for (const [a, b] of [[-h, -h], [h, -h], [-h, h], [h, h]]) m = Math.min(m, heightAt(x + a * c + b * s, z - a * s + b * c));
  return m;
}
// Drape a flat (y ≈ const) BufferGeometry over the terrain: split long edges, then lift every vertex by the height.
// Keeps position (+ colour when present); normals are recomputed.
export function drape(geo, lift = 0, maxEdge = 6) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const P = g.getAttribute('position'), C = g.getAttribute('color');
  const max2 = maxEdge * maxEdge;
  let pos = new Float32Array(P.count * 6), col = C ? new Float32Array(P.count * 6) : null, n = 0;
  const put = (x, y, z, r, gg, b) => {
    if (n * 3 + 3 > pos.length) { const np = new Float32Array(pos.length * 2); np.set(pos); pos = np; if (col) { const nc = new Float32Array(col.length * 2); nc.set(col); col = nc; } }
    pos[n * 3] = x; pos[n * 3 + 1] = y + heightAt(x, z) + lift; pos[n * 3 + 2] = z;
    if (col) { col[n * 3] = r; col[n * 3 + 1] = gg; col[n * 3 + 2] = b; }
    n++;
  };
  // Each vertex: [x, y, z, r, g, b]. Recursively split the longest edge.
  const tri = (a, b, c, depth) => {
    const e0 = (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2, e1 = (b[0] - c[0]) ** 2 + (b[2] - c[2]) ** 2, e2 = (c[0] - a[0]) ** 2 + (c[2] - a[2]) ** 2;
    const m = Math.max(e0, e1, e2);
    if (m <= max2 || depth > 14) { put(...a); put(...b); put(...c); return; }
    const mid = (u, v) => u.map((x, i) => (x + v[i]) / 2);
    if (m === e0) { const d = mid(a, b); tri(a, d, c, depth + 1); tri(d, b, c, depth + 1); }
    else if (m === e1) { const d = mid(b, c); tri(a, b, d, depth + 1); tri(a, d, c, depth + 1); }
    else { const d = mid(c, a); tri(a, b, d, depth + 1); tri(d, b, c, depth + 1); }
  };
  const V = (i) => [P.getX(i), P.getY(i), P.getZ(i), C ? C.getX(i) : 1, C ? C.getY(i) : 1, C ? C.getZ(i) : 1];
  for (let i = 0; i + 2 < P.count; i += 3) tri(V(i), V(i + 1), V(i + 2), 0);
  const out = new geo.constructor();
  out.setAttribute('position', new P.constructor(pos.slice(0, n * 3), 3));
  if (col) out.setAttribute('color', new P.constructor(col.slice(0, n * 3), 3));
  out.computeVertexNormals();
  out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}
