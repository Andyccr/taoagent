// Landscape around and through the metropolis: the river (water ribbon + stone quays), the city wall ring with
// towers and gatehouses at every avenue and water gates over the river, and rolling hills / far mountains.
// Each returns one merged geometry (one draw call).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createGeo } from './geo.js';
import { districtAt } from './metropolis-plan.js';

const rad = (d) => (d * Math.PI) / 180;
const polarXZ = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];

function normals(pts) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [-dz / l, dx / l];
  });
}
function strip(pts, off0, off1, y0, y1) {
  const ns = normals(pts), pos = [], idx = [];
  pts.forEach(([x, z], i) => { const [nx, nz] = ns[i]; pos.push(x + nx * off0, y0, z + nz * off0, x + nx * off1, y1, z + nz * off1); });
  // Wind every quad so it faces up whichever side of the centre line the strip lies on.
  const up = off1 > off0;
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; if (up) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}

// River: water surface plus sloped stone quays and a paved towpath on both banks.
export function riverGeometry(plan) {
  const half = plan.river.half, water = [], quay = [], path = [];
  for (const leg of plan.river.legs) {
    water.push(strip(leg.pts, -half - 0.3, half + 0.3, 0, 0));
    for (const s of [-1, 1]) {
      quay.push(strip(leg.pts, s * (half - 0.2), s * (half + 0.6), -0.05, 0.32));
      path.push(strip(leg.pts, s * (half + 0.6), s * (half + 1.8), 0.32, 0.06));
    }
  }
  return { water: mergeGeometries(water), quay: mergeGeometries(quay), path: mergeGeometries(path) };
}

// City wall: crenellated curtain wall on plan.wallR with bastions; gatehouses where avenues cross,
// water gates where the river crosses, and a gap where the 万里城关 wonder stands in for the main gate.
export function wallGeometry(plan) {
  const g = createGeo(), R = plan.wallR, H = 8.5, T = 3.4;
  const gates = [];
  for (const av of plan.avenues) gates.push({ a: av.angle, kind: 'gate', half: 7 });
  for (const leg of plan.river.legs) {
    for (let i = 1; i < leg.pts.length; i++) {
      const r0 = Math.hypot(...leg.pts[i - 1]), r1 = Math.hypot(...leg.pts[i]);
      if ((r0 - R) * (r1 - R) <= 0) { const [x, z] = leg.pts[i]; gates.push({ a: ((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360, kind: 'water', half: plan.river.half + 3 }); break; }
    }
  }
  const main = plan.wonders.find((w) => w.kind === 'wall');
  const blocked = (deg) => {
    const [x, z] = polarXZ(R, deg);
    if (main && x > main.x0 - 2 && x < main.x1 + 2 && z > main.z0 - 2 && z < main.z1 + 2) return true;
    return plan.wonders.some((w) => w.kind !== 'wall' && x > w.x0 - 3 && x < w.x1 + 3 && z > w.z0 - 3 && z < w.z1 + 3);
  };
  const gateAt = (deg) => gates.find((gt) => { const d = Math.abs(((deg - gt.a + 540) % 360) - 180); return (d * Math.PI / 180) * R < gt.half; });
  const STONE = { chinese: 0x8e8a82, greek: 0xc9c0a8, roman: 0xb9a07a, modern: 0xa49e92, mixed: 0xaaa190 };
  const CAP = { chinese: 0x4a4f57, greek: 0xb5562f, roman: 0x9a4a2c, modern: 0x6f6a62, mixed: 0x7c5a44 };
  const step = 5.5, n = Math.round((2 * Math.PI * R) / step), dDeg = 360 / n;
  for (let i = 0; i < n; i++) {
    const deg = i * dDeg;
    if (blocked(deg) || gateAt(deg)) continue;
    const style = districtAt(deg, 0), [x, z] = polarXZ(R, deg), ry = -rad(deg) + Math.PI;
    g.group({ x, z, ry }, (w) => {
      w.box(step + 0.3, H, T, 0, 0, 0, STONE[style] || STONE.mixed);
      w.box(step + 0.3, 0.5, T + 0.5, 0, H - 0.5, 0, 0x9b958a);
      for (const m of [-1.6, 1.1]) w.box(1.3, 1.2, 0.5, m, H, T / 2 - 0.25, STONE[style] || STONE.mixed);
      w.box(step + 0.3, 0.7, 0.35, 0, H, -T / 2 + 0.2, STONE[style] || STONE.mixed);
      if (i % 9 === 0) {
        w.box(8, H + 3.5, 8, 0, 0, 1, STONE[style] || STONE.mixed);
        for (let k = 0; k < 4; k++) w.box(1.5, 1.2, 0.6, -3 + k * 2, H + 3.5, 4.7, STONE[style] || STONE.mixed);
        if (style === 'chinese' || style === 'mixed') { w.box(6, 2.6, 6, 0, H + 3.5, 1, 0xa8322b); w.hip(8.4, 8.4, 2.6, 0, H + 6.1, 1, CAP.chinese, 1.2); }
        else w.box(8.4, 0.5, 8.4, 0, H + 3.5, 1, CAP[style] || CAP.mixed);
      }
    });
  }
  for (const gt of gates) {
    const style = districtAt(gt.a, 0), [x, z] = polarXZ(R, gt.a), ry = -rad(gt.a) + Math.PI, stone = STONE[style] || STONE.mixed;
    if (blocked(gt.a)) continue;
    g.group({ x, z, ry }, (w) => {
      const span = gt.half * 2;
      for (const s of [-1, 1]) {
        w.box(7, H + 6, 9, s * (gt.half + 2.5), 0, 0, stone);
        w.box(7.6, 0.6, 9.6, s * (gt.half + 2.5), H + 6, 0, 0x9b958a);
        for (let k = 0; k < 3; k++) w.box(1.4, 1.2, 0.6, s * (gt.half + 2.5) - 2.2 + k * 2.2, H + 6.6, 4.6, stone);
      }
      if (gt.kind === 'water') {
        w.arch(gt.half, 1.6, T + 0.4, 0, 0, 0, stone, 12);
        w.box(span, 2, T + 0.4, 0, gt.half - 0.2, 0, stone);
        for (let k = -gt.half + 1; k < gt.half; k += 1.4) w.box(0.18, gt.half - 1.5, 0.18, k, 0.8, -1, 0x3a3733);
      } else {
        w.box(span, H - 6.2, T + 2, 0, 6.2, 0, stone);
        w.arch(gt.half, 1.2, T + 2.2, 0, 4.8 - gt.half * 0.5, 0, 0x8f877a, 10);
        if (style === 'chinese' || style === 'mixed') {
          w.box(span + 10, 4, 7, 0, H, 0, 0xa8322b);
          for (let k = -2; k <= 2; k++) w.box(0.5, 4, 0.5, k * (span + 8) / 4, H, 3.6, 0x7a2a22);
          w.hip(span + 14, 10, 3.2, 0, H + 4, 0, CAP.chinese, 1.4);
          w.box(span + 6, 3, 5.5, 0, H + 7.2, 0, 0xa8322b);
          w.hip(span + 9, 8, 3, 0, H + 10.2, 0, CAP.chinese, 1.4);
        } else if (style === 'modern') {
          w.box(span + 12, 1.2, T + 3, 0, H, 0, 0x6f6a62);
          w.box(2, 2.5, 0.4, 0, H + 1.2, 2.6, 0xd9a520);
        } else {
          w.box(span + 12, 1, T + 3, 0, H, 0, 0xd8cfb8);
          w.gable(span + 6, 2.4, T + 2.4, 0, H + 1, 0, CAP[style] || CAP.mixed);
          for (const s of [-1, 1]) w.cyl(0.5, 0.6, H - 0.4, s * (gt.half + 0.2), 0, 3.4, 0xe0d8c4, 8);
        }
      }
    });
  }
  return g.build();
}

// Hills and mountains as smooth mounds with height-coloured vertices (grass, forest, rock, snow).
// Mountains are pre-hazed towards the horizon colour and drawn without fog, so they read as a distant range from
// street level instead of turning into flat fog-coloured cut-outs.
export function terrainGeometry(plan) {
  const parts = [], far = [];
  const haze = new THREE.Color(0xc9cfd2);
  const grass = new THREE.Color(0x9fb27c), forest = new THREE.Color(0x6f8a58), rock = new THREE.Color(0x9a9183), snow = new THREE.Color(0xf1efe8);
  const c = new THREE.Color();
  for (const [hi, h] of plan.hills.entries()) {
    const rings = h.mountain ? 9 : 6, segs = h.mountain ? 22 : 16;
    const base = new THREE.RingGeometry(0.0001, 1, segs, rings);
    base.rotateX(-Math.PI / 2);
    const pos = base.getAttribute('position'), colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), d = Math.min(1, Math.hypot(x, z));
      const ang = Math.atan2(z, x);
      const wob = 1 + 0.18 * Math.sin(ang * 3 + hi) + 0.1 * Math.sin(ang * 7 + hi * 2);
      const prof = Math.pow(Math.cos((Math.min(1, d * wob * 0.92) * Math.PI) / 2), h.mountain ? 1.4 : 2);
      const ridge = h.mountain ? 0.12 * Math.sin(ang * 5 + hi) * (1 - d) : 0;
      const y = h.h * Math.max(0, prof + ridge);
      pos.setXYZ(i, h.x + x * h.r, y - 0.4, h.z + z * h.r);
      const k = y / 260;
      if (!h.mountain) c.copy(grass).lerp(forest, Math.min(1, y / (h.h + 1) * 0.9 + ((hi + i) % 3) * 0.05));
      else if (k > 0.62) c.copy(snow);
      else if (k > 0.32) c.copy(rock).lerp(snow, (k - 0.32) * 1.2);
      else c.copy(forest).lerp(rock, k * 2.6);
      if (h.mountain) c.lerp(haze, 0.42);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    base.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    base.deleteAttribute('uv');
    base.computeVertexNormals();
    (h.mountain ? far : parts).push(base.toNonIndexed());
  }
  return { hills: parts.length ? mergeGeometries(parts) : null, mountains: far.length ? mergeGeometries(far) : null };
}
