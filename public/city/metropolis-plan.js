// 帝国之城 metropolis plan: a pure, deterministic description of the city that surrounds the agent core.
// No three.js here so Node tests can check it. Angles follow layout.js: degrees clockwise seen from above,
// 0 = back (-z), 90 = right (+x), 180 = front (+z, camera side). polar(r, deg) -> { x, z }.
import { polar, STYLE_ANGLE, ringRadius, PLOT } from './layout.js';

export const CORE_R = ringRadius(3) + PLOT / 2 + 1;          // agent core (central hall + 3 rings of plots)
export const CANAL = { inner: CORE_R + 2.5, outer: CORE_R + 7.5 }; // moat around the core
export const RING_ROADS = [52, 72, 92, 112, 132, 152].map((r) => ({ r, w: 3 }));
export const CITY_EDGE = 170;
export const AVENUE_W = 5;
export const AVENUES = [0, 45, 90, 135, 180, 225, 270, 315];
export const LOT = 7;            // filler lot size (agent buildings are scaled to fit when they claim one)
const LOT_SPACING = 8.4;
const MARGIN = 0.8;

// Wonders: axis-aligned footprints w (x) by d (z) in world space; rotY is a multiple of 90 degrees.
const WONDERS = [
  { id: 'palace', kind: 'palace', name: '紫宸宫', angle: 180, r: 92, w: 54, d: 70, rotY: Math.PI, district: 'chinese' },
  { id: 'pagoda', kind: 'pagoda', name: '万佛塔', angle: 145, r: 102, w: 28, d: 28, rotY: 0, district: 'chinese' },
  { id: 'wall', kind: 'wall', name: '万里城关', angle: 180, r: 178, w: 82, d: 18, rotY: 0, district: 'chinese' },
  { id: 'acropolis', kind: 'acropolis', name: '雅典卫城', angle: 270, r: 96, w: 50, d: 42, rotY: Math.PI / 2, district: 'greek' },
  { id: 'colosseum', kind: 'colosseum', name: '大斗兽场', angle: 66, r: 94, w: 38, d: 32, rotY: 0, district: 'roman' },
  { id: 'pantheon', kind: 'pantheon', name: '万神殿', angle: 113, r: 94, w: 46, d: 26, rotY: -Math.PI / 2, district: 'roman' },
  { id: 'arch', kind: 'arch', name: '凯旋门', angle: 90, r: 62, w: 6, d: 16, rotY: Math.PI / 2, district: 'roman' },
  { id: 'supertall', kind: 'supertall', name: '天穹塔', angle: 0, r: 84, w: 34, d: 34, rotY: 0, district: 'modern' },
];

const KINDS = {
  chinese: [['siheyuan', 3], ['house', 3], ['pagoda', 1], ['temple', 1], ['pavilion', 1], ['garden', 1]],
  greek: [['house', 4], ['stoa', 2], ['temple', 1], ['tholos', 1], ['agora', 1], ['garden', 1]],
  roman: [['insula', 4], ['villa', 2], ['baths', 1], ['market', 1], ['temple', 1], ['plaza', 1]],
  modern: [['towerTall', 2], ['towerMid', 3], ['office', 2], ['residential', 3], ['glassSlab', 1], ['plaza', 1]],
};
const MIXED = [['stalls', 2], ['plaza', 1], ['garden', 2], ['home', 3]];
const HOME = { chinese: 'siheyuan', greek: 'house', roman: 'insula', modern: 'residential' };
export const CLAIMABLE = { chinese: ['siheyuan', 'house'], greek: ['house'], roman: ['insula', 'villa'], modern: ['office', 'residential'] };
const COMMON = new Set(['garden', 'plaza', 'stalls']);

export function hash(text) { let h = 2166136261; for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const angDist = (a, b) => { const d = Math.abs((((a - b) % 360) + 360) % 360); return Math.min(d, 360 - d); };
function pick(list, seed) { const total = list.reduce((s, [, w]) => s + w, 0); let n = seed % total; for (const [k, w] of list) { if (n < w) return k; n -= w; } return list[0][0]; }

// District of a direction: four style quarters with blended (mixed) zones around the diagonals.
export function districtAt(angle) {
  const a = ((angle % 360) + 360) % 360;
  for (const b of [45, 135, 225, 315]) if (angDist(a, b) <= 10) return 'mixed';
  let best = 'modern', dist = 999;
  for (const [style, at] of Object.entries(STYLE_ANGLE)) { const d = angDist(a, at); if (d < dist) { dist = d; best = style; } }
  return best;
}
function neighbours(angle) { return Object.entries(STYLE_ANGLE).map(([s, at]) => [s, angDist(angle, at)]).sort((p, q) => p[1] - q[1]).slice(0, 2).map(([s]) => s); }

function wonderBox(w) { const p = polar(w.r, w.angle); return { ...w, x: p.x, z: p.z, x0: p.x - w.w / 2, x1: p.x + w.w / 2, z0: p.z - w.d / 2, z1: p.z + w.d / 2 }; }
export function circleHitsBox(x, z, r, b, margin = 0) {
  const cx = Math.max(b.x0 - margin, Math.min(x, b.x1 + margin)), cz = Math.max(b.z0 - margin, Math.min(z, b.z1 + margin));
  return Math.hypot(x - cx, z - cz) < r;
}

let cached = null;
export function computeMetropolis() {
  if (cached) return cached;
  const wonders = WONDERS.map(wonderBox);
  const lots = [];
  const bands = RING_ROADS.map((road, i) => [road.r + road.w / 2, i + 1 < RING_ROADS.length ? RING_ROADS[i + 1].r - RING_ROADS[i + 1].w / 2 : CITY_EDGE]);
  const half = LOT / 2;
  bands.forEach(([inner, outer], band) => {
    const rows = [inner + MARGIN + half, outer - MARGIN - half].filter((r, i, all) => i === 0 || r - all[0] >= LOT + 0.6);
    rows.forEach((r, row) => {
      for (let seg = 0; seg < AVENUES.length; seg++) {
        const a0 = AVENUES[seg], clear = ((AVENUE_W / 2 + half + MARGIN) / r) * (180 / Math.PI);
        const from = a0 + clear, to = a0 + 45 - clear, arc = ((to - from) * Math.PI / 180) * r;
        const count = Math.max(0, Math.floor(arc / LOT_SPACING) + 1);
        for (let k = 0; k < count; k++) {
          const angle = count === 1 ? (from + to) / 2 : from + ((to - from) * k) / (count - 1);
          const p = polar(r, angle);
          if (wonders.some((w) => circleHitsBox(p.x, p.z, half * 1.15, w, 1.2))) continue;
          const id = `b${band}r${row}s${seg}k${k}`;
          const district = districtAt(angle);
          const seed = hash(id);
          let style = district, kind;
          if (district === 'mixed') { const pair = neighbours(angle); style = pair[seed % 2]; kind = pick(MIXED, seed >>> 3); if (kind === 'home') kind = HOME[style]; }
          else kind = pick(KINDS[district], seed >>> 3);
          // Taller modern towers cluster around the supertall.
          if (style === 'modern' && kind === 'towerMid' && band >= 1 && (seed & 3) === 0) kind = 'towerTall';
          const common = COMMON.has(kind);
          lots.push({ id, band, row, seg, angle, r, x: p.x, z: p.z, rotY: Math.atan2(-p.x, -p.z), size: LOT, district, style: common ? 'common' : style, kind, variant: seed % 3, claimable: !common && CLAIMABLE[style].includes(kind) });
        }
      }
    });
  });
  const bridges = AVENUES.map((angle) => ({ angle, r: (CANAL.inner + CANAL.outer) / 2 }));
  cached = Object.freeze({ coreR: CORE_R, canal: CANAL, ringRoads: RING_ROADS, avenues: AVENUES.map((angle) => ({ angle, w: AVENUE_W, from: CANAL.outer, to: CITY_EDGE + 2 })), bridges, lots, wonders, outerR: CITY_EDGE + 12 });
  return cached;
}

function compareKeys(a, b) { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0; }

// Deterministic claim of free filler lots for agents that no longer fit in the core rings:
// same-style lots first, then inner bands, then nearest to the style's quarter, then lot id.
export function assignClaims(bots, plan = computeMetropolis()) {
  const free = plan.lots.filter((l) => l.claimable);
  const taken = new Set();
  const out = new Map();
  for (const b of bots) {
    const want = STYLE_ANGLE[b.style] ?? 0;
    let best = null, key = null;
    for (const l of free) {
      if (taken.has(l.id)) continue;
      const k = [l.style === b.style ? 0 : 1, l.band, angDist(l.angle, want), l.id];
      if (!key || compareKeys(k, key) < 0) { best = l; key = k; }
    }
    if (!best) break;
    taken.add(best.id);
    out.set(b.id, best);
  }
  return out;
}
