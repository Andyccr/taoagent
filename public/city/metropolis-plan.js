import { polar, STYLE_ANGLE, ringRadius, PLOT } from './layout.js';
import { rng, CANAL_HALF, canalRadius, canalLine, ringLoop, avenueLine } from './metropolis-roads.js';
import { buildStreets, makeRoadIndex, distanceToRoads, nearestRoadPoint } from './metropolis-streets.js';

export const CORE_R = ringRadius(3) + PLOT / 2 + 1;
export const CANAL = { inner: CORE_R + 2.5, outer: CORE_R + 7.5 };
export const AVENUE_W = 5;
export const AVENUES = [0, 45, 90, 135, 180, 225, 270, 315];
export const LOT = 7;
export const CITY_EDGE = 276;
export const WALL_R = 283;
export const OUTER_EDGE = 450;
export const COUNTRY_EDGE = 580;
export const RING_ROADS = [52, 72, 92, 112, 132, 152, 176, 202, 230, 258, 292, 328, 366, 408].map((r) => ({ r, w: r === 292 ? 5 : r >= 366 ? 4 : 3 }));
export const HARBOUR = { from: 20, to: 70, shore: 420 };
export const RIVER_HALF = 5;
// The river enters from the western hills, feeds the core canal and leaves through the east of the city to the harbour.
export const RIVER_LEGS = [
  { id: 'west', from: { r: 760, a: 236 }, to: { r: CORE_R + 5, a: 236 }, wave: 13, phase: 0.4 },
  { id: 'east', from: { r: CORE_R + 5, a: 31 }, to: { r: 436, a: 33 }, wave: 11, phase: 1.7 },
];
// Meandering river polyline (points every ~4 m); the meander tapers to zero where the leg meets the canal or the sea.
export function riverLine(leg) {
  const a = polar(leg.from.r, leg.from.a), b = polar(leg.to.r, leg.to.a);
  const len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(8, Math.ceil(len / 4));
  const nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, env = Math.sin(Math.PI * t);
    const off = leg.wave * env * (Math.sin(t * 9.5 + leg.phase) + 0.45 * Math.sin(t * 23 + leg.phase * 2));
    pts.push([a.x + (b.x - a.x) * t + nx * off, a.z + (b.z - a.z) * t + nz * off]);
  }
  return pts;
}

const WONDERS = [
  // Larger ceremonial footprints (axis-aligned w×d); plazas clear lots via circleHitsBox.
  { id: 'palace', kind: 'palace', name: '紫宸宫', angle: 180, r: 96, w: 92, d: 118, rotY: Math.PI, district: 'chinese' },
  { id: 'pagoda', kind: 'pagoda', name: '万佛塔', angle: 138, r: 128, w: 40, d: 40, rotY: 0, district: 'chinese' },
  { id: 'wall', kind: 'wall', name: '万里城关', angle: 180, r: WALL_R, w: 110, d: 40, rotY: 0, district: 'chinese' },
  { id: 'acropolis', kind: 'acropolis', name: '雅典卫城', angle: 270, r: 108, w: 78, d: 62, rotY: Math.PI / 2, district: 'greek' },
  { id: 'colosseum', kind: 'colosseum', name: '大斗兽场', angle: 58, r: 108, w: 58, d: 48, rotY: 0, district: 'roman' },
  { id: 'pantheon', kind: 'pantheon', name: '万神殿', angle: 120, r: 108, w: 62, d: 42, rotY: -Math.PI / 2, district: 'roman' },
  { id: 'arch', kind: 'arch', name: '凯旋门', angle: 90, r: 68, w: 14, d: 28, rotY: Math.PI / 2, district: 'roman' },
  { id: 'supertall', kind: 'supertall', name: '天穹塔', angle: 0, r: 88, w: 48, d: 48, rotY: 0, district: 'modern' },
  { id: 'aqueduct', kind: 'aqueduct', name: '大渡槽', angle: 95, r: 206, w: 212, d: 20, rotY: -Math.PI / 2, district: 'roman' },
  { id: 'heaven', kind: 'heaven', name: '天坛', angle: 210, r: 200, w: 80, d: 80, rotY: 0, district: 'chinese' },
  { id: 'skyline', kind: 'skyline', name: '双子星塔', angle: 330, r: 192, w: 70, d: 70, rotY: 0, district: 'modern' },
  { id: 'lighthouse', kind: 'lighthouse', name: '法罗斯灯塔', angle: 45, r: 462, w: 62, d: 62, rotY: Math.PI / 4, district: 'harbour' },
];

// Civic kinds cluster near the centre, homes and shops dominate the outer neighbourhoods.
const KINDS = {
  chinese: [['siheyuan', 5], ['house', 5], ['shophouse', 5], ['teahouse', 3], ['courtyardLarge', 2], ['pagoda', 1], ['temple', 2], ['pavilion', 1], ['drumTower', 1], ['gatehouse', 1], ['waterPavilion', 1], ['garden', 2]],
  greek: [['house', 7], ['villa', 3], ['stoa', 3], ['workshop', 3], ['temple', 1], ['treasury', 1], ['tholos', 1], ['gymnasium', 1], ['bouleuterion', 1], ['fountainHouse', 1], ['agora', 2], ['garden', 2]],
  roman: [['insula', 7], ['domus', 3], ['tabernae', 4], ['villa', 2], ['thermopolium', 2], ['granary', 1], ['baths', 1], ['basilica', 1], ['theatre', 1], ['market', 2], ['temple', 1], ['plaza', 1]],
  modern: [['towerTall', 2], ['towerMid', 4], ['glassTower', 1], ['office', 3], ['residential', 4], ['apartmentBlock', 3], ['loftRow', 2], ['hotel', 1], ['mall', 1], ['stationHall', 1], ['glassSlab', 1], ['plaza', 1]],
};
const CIVIC = new Set(['pagoda', 'temple', 'drumTower', 'gatehouse', 'tholos', 'treasury', 'bouleuterion', 'gymnasium', 'baths', 'basilica', 'theatre', 'stationHall', 'hotel', 'mall']);
const MIXED = [['stalls', 2], ['plaza', 1], ['garden', 2], ['home', 3], ['fountainSquare', 1], ['marketHall', 1], ['statueSquare', 1]];
const HOME = { chinese: 'siheyuan', greek: 'house', roman: 'insula', modern: 'residential' };
const HOME2 = { chinese: 'shophouse', greek: 'villa', roman: 'domus', modern: 'apartmentBlock' };
export const CLAIMABLE = {
  chinese: ['siheyuan', 'house', 'shophouse'],
  greek: ['house', 'villa'],
  roman: ['insula', 'villa', 'domus'],
  modern: ['office', 'residential', 'apartmentBlock', 'loftRow'],
  outer: ['cottage', 'workshop', 'farmhouse'],
};
const COMMON = new Set(['garden', 'plaza', 'stalls', 'fountainSquare', 'statueSquare', 'playground', 'bandstand', 'marketHall']);
const COMMON_KINDS = ['garden', 'plaza', 'stalls', 'fountainSquare', 'statueSquare', 'playground', 'bandstand', 'marketHall', 'garden'];
const STYLES = Object.keys(STYLE_ANGLE);

export function hash(text) { let h = 2166136261; for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const angDist = (a, b) => { const d = Math.abs((((a - b) % 360) + 360) % 360); return Math.min(d, 360 - d); };
function pick(list, seed) { const total = list.reduce((s, [, w]) => s + w, 0); let n = seed % total; for (const [k, w] of list) { if (n < w) return k; n -= w; } return list[0][0]; }

// Mixed seams between the quarters widen with distance from the centre, so the outer city blends the four styles.
export function districtAt(angle, r = 0) {
  const a = ((angle % 360) + 360) % 360;
  const seam = 10 + Math.max(0, r - 176) * 0.09;
  for (const b of [45, 135, 225, 315]) if (angDist(a, b) <= seam) return 'mixed';
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

const NORM = (a) => ((a % 360) + 360) % 360;
const inHarbour = (a) => { const n = NORM(a); return n >= HARBOUR.from && n <= HARBOUR.to; };
const SIZE_RANGE = { inner: [5, 7.2], blend: [5.5, 8], suburb: [6, 7], industrial: [8, 9], harbour: [7, 8.5], country: [7, 9] };
const RADIAL_STEP = { inner: 7, blend: 7.2, suburb: 7.6, industrial: 9.5, harbour: 8.5, country: 14 };
const KEEP_PROB = { inner: 0.95, blend: 0.92, suburb: 0.8, industrial: 0.8, harbour: 0.85, country: 0.24 };

function zoneAt(r, a) {
  if (r < CITY_EDGE) return 'inner';
  if (r < 292) return null; // the city wall and its glacis
  if (r < 366) return inHarbour(a) && r > HARBOUR.shore ? null : 'blend';
  if (r < OUTER_EDGE) {
    if (inHarbour(a)) return r < HARBOUR.shore + 2 ? 'harbour' : null;
    const n = NORM(a);
    if ((n >= 70 && n <= 120) || (n >= 290 && n <= 330)) return 'industrial';
    return 'suburb';
  }
  if (r >= OUTER_EDGE && r < COUNTRY_EDGE) return inHarbour(a) ? null : 'country';
  return null;
}

function weightedStyle(angle, R) {
  if (R() < 0.25) return STYLES[Math.floor(R() * STYLES.length)];
  const weights = STYLES.map((s) => [s, 1 / (1 + angDist(angle, STYLE_ANGLE[s]) / 40)]);
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let n = R() * total;
  for (const [s, w] of weights) { if (n < w) return s; n -= w; }
  return STYLES[0];
}

let cached = null;
export function computeMetropolis() {
  if (cached) return cached;
  const wonders = WONDERS.map(wonderBox);
  const canal = { ...CANAL, half: CANAL_HALF, pts: canalLine(CANAL.inner, CANAL.outer) };
  const river = { half: RIVER_HALF, legs: RIVER_LEGS.map((leg) => ({ id: leg.id, pts: riverLine(leg) })) };
  // Grid-indexed distance to the river / canal centre lines (exact within `reach`, Infinity beyond).
  const riverIdx = makeRoadIndex(river.legs.map((leg) => ({ pts: leg.pts, w: 0 })));
  const canalIdx = makeRoadIndex([{ pts: canal.pts, w: 0 }]);
  const riverDistance = (x, z, reach = 100) => distanceToRoads(riverIdx, x, z, reach);
  const rings = RING_ROADS.map((x) => ringLoop(x.r, x.w));
  const avenues = AVENUES.map((a, i) => avenueLine(a, CANAL.outer + 1, OUTER_EDGE, AVENUE_W, i));
  const rawStreets = buildStreets(RING_ROADS.map((x) => x.r), AVENUES, 'empire-city');
  const streets = [];
  for (const road of rawStreets) {
    let cut = road.pts.length;
    for (let i = 0; i < road.pts.length; i++) {
      const p = road.pts[i];
      if (wonders.some((w) => circleHitsBox(p[0], p[1], 1, w, 1)) || riverDistance(p[0], p[1]) < RIVER_HALF + 1.5) { cut = i; break; }
    }
    if (cut >= 2) streets.push({ ...road, pts: road.pts.slice(0, cut) });
  }
  const roads = [...rings, ...avenues, ...streets];
  const index = makeRoadIndex(roads);


  const boundaries = [CANAL.outer, ...RING_ROADS.map((x) => x.r), OUTER_EDGE, COUNTRY_EDGE];
  const bands = boundaries.slice(0, -1).map((inner, i) => [inner, boundaries[i + 1]]);

  const parks = [];
  bands.forEach(([inner, outer], band) => {
    for (let sector = 0; sector < 8; sector++) {
      const pr = rng(`park${band}-${sector}`);
      const count = Math.floor(pr() * 3);
      for (let i = 0; i < count; i++) {
        const rad = inner + 3 + pr() * Math.max(1, outer - inner - 6);
        const ang = sector * 45 + 2 + pr() * 41;
        const zone = zoneAt(rad, ang);
        if (zone !== 'inner' && zone !== 'blend' && zone !== 'suburb') continue;
        const p = polar(rad, ang);
        parks.push({ band, x: p.x, z: p.z, r: 7 + pr() * 7, kind: ['park', 'plaza', 'market'][Math.floor(pr() * 3)], used: false });
      }
    }
  });

  const lots = [];
  const cells = new Map();
  const cellKey = (x, z) => (Math.floor(x / 16) + 4096) * 8192 + Math.floor(z / 16) + 4096;
  const addCell = (lot) => {
    const key = cellKey(lot.x, lot.z);
    const list = cells.get(key);
    if (list) list.push(lot); else cells.set(key, [lot]);
  };
  const overlaps = (x, z, size) => {
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iz = cz - 1; iz <= cz + 1; iz++) {
      const list = cells.get((ix + 4096) * 8192 + iz + 4096);
      if (!list) continue;
      for (const lot of list) if (Math.hypot(x - lot.x, z - lot.z) < (size + lot.size) / 2 + 0.3) return true;
    }
    return false;
  };
  const counts = new Map();

  bands.forEach(([inner, outer], band) => {
    const R = rng('band' + band);
    const midR = (inner + outer) / 2;
    const dense = midR < 125;
    const midZone = zoneAt(midR, 0);
    const rowStep = dense ? 3.6 : (midZone ? RADIAL_STEP[midZone] : 7);
    const rows = Math.max(1, Math.floor((outer - inner - 2) / rowStep));
    const innerRing = rings.find((ring) => ring.r === inner);
    const outerRing = rings.find((ring) => ring.r === outer);
    const innerAt = (a) => {
      if (innerRing) return innerRing.radiusAt(a) + innerRing.w / 2;
      if (inner === CANAL.outer) return canalRadius(a, CANAL.inner, CANAL.outer) + CANAL_HALF;
      return inner;
    };
    const outerAt = (a) => (outerRing ? outerRing.radiusAt(a) - outerRing.w / 2 : outer);
    const rr = (a, t) => {
      const ri = innerAt(a), ro = outerAt(a);
      return ri + (ro - ri) * (t + 0.5) / rows;
    };

    for (let t = 0; t < rows; t++) {
      let a = 0;
      while (a < 360) {
        const baseA = a;
        const rowR = rr(baseA, t);
        const zone = zoneAt(rowR, baseA);
        if (!zone) {
          a += (6 / Math.max(rowR, 1)) * (180 / Math.PI);
          continue;
        }
        const range = dense ? [3.8, 5.4] : SIZE_RANGE[zone];
        const size = range[0] + R() * (range[1] - range[0]);
        const gap = dense ? 0.25 + R() * 0.45 : (zone === 'country' ? 6 + R() * 8 : zone === 'inner' ? 0.4 + R() * 1.0 : 0.6 + R() * 1.6);
        const stepDeg = ((size + gap) / rowR) * (180 / Math.PI);
        a += stepDeg;
        const jr = rowR + (R() - 0.5) * 1.2;
        const ja = baseA + (R() - 0.5) * stepDeg * 0.4;
        const jp = polar(jr, ja);

        let park = null;
        for (const pk of parks) {
          if (pk.band === band && Math.hypot(jp.x - pk.x, jp.z - pk.z) < pk.r) { park = pk; break; }
        }
        if (park && R() < 0.6) { park.used = true; continue; }
        if (R() > (dense ? 0.99 : KEEP_PROB[zone])) continue;

        let harbourKind = null;
        if (zone === 'harbour') {
          harbourKind = R() < 0.82 ? 'warehouse' : 'boathouse';
          if (jr >= HARBOUR.shore - 14 && jr <= HARBOUR.shore + 2) harbourKind = R() < 0.5 ? 'pier' : 'crane';
        }

        const centre = rr(ja, t);
        const dir = jr < centre ? 1 : -1;
        const tang = 1.0 / Math.max(jr, 1) * (180 / Math.PI);
        const attempts = dense ? [
          { jr, ja, size },
          { jr, ja: ja + tang, size },
          { jr, ja: ja - tang, size },
          { jr: jr + 1.0, ja, size },
          { jr: jr - 1.0, ja, size },
        ] : [
          { jr, ja, size },
          { jr, ja, size: size * 0.85 },
          { jr: jr + dir * 1.2, ja, size: size * 0.85 },
        ];
        let chosen = null;
        for (const att of attempts) {
          const p = polar(att.jr, att.ja);
          const x = p.x, z = p.z;
          const half = att.size / 2;
          if (distanceToRoads(index, x, z) < half + (dense ? 0.2 : 0.4)) continue;
          if (distanceToRoads(canalIdx, x, z, 16) < CANAL_HALF + half + 0.8) continue;
          if (riverDistance(x, z, 20) < RIVER_HALF + half + 2.2) continue;
          if (att.jr - half <= CANAL.outer + 0.5) continue;
          if (Math.abs(att.jr - WALL_R) < half + 3) continue;
          if (wonders.some((w) => circleHitsBox(x, z, half * 1.1, w, 1.2))) continue;
          if (inHarbour(att.ja)) {
            if (harbourKind === 'pier' || harbourKind === 'crane') {
              if (att.jr < HARBOUR.shore - 8 || att.jr > HARBOUR.shore + 2) continue;
            } else if (att.jr + half >= HARBOUR.shore) continue;
          }
          if (overlaps(x, z, att.size)) continue;
          chosen = { jr: att.jr, ja: att.ja, size: att.size, x, z };
          break;
        }
        if (!chosen) continue;

        const x = chosen.x, z = chosen.z;
        const pjr = chosen.jr, pja = chosen.ja, psize = chosen.size;
        const sector = Math.floor(NORM(pja) / 45);
        const countKey = `${band}:${sector}`;
        const k = counts.get(countKey) || 0;
        counts.set(countKey, k + 1);
        const id = `b${band}s${sector}n${k}`;
        let style, kind, district;

        if (park) {
          style = 'common';
          kind = COMMON_KINDS[Math.floor(R() * COMMON_KINDS.length)];
          district = zone === 'inner' ? districtAt(pja) : zone;
        } else if (zone === 'harbour') {
          style = 'outer';
          kind = harbourKind;
          district = 'harbour';
        } else if (zone === 'inner') {
          district = districtAt(pja, pjr);
          const seed = hash(id);
          style = district;
          if (district === 'mixed') {
            const pair = neighbours(pja);
            style = pair[seed % 2];
            kind = pick(MIXED, seed >>> 3);
            if (kind === 'home') kind = (seed >>> 9) % 3 ? HOME[style] : HOME2[style];
          } else kind = pick(KINDS[district], seed >>> 3);
          // Monuments thin out towards the walls; the outer neighbourhoods are homes, shops and workshops.
          if (CIVIC.has(kind) && pjr > 200 && (seed >>> 12) % 3) kind = (seed >>> 14) % 2 ? HOME[style] : HOME2[style];
          if (style === 'modern' && kind === 'towerMid' && band >= 1 && (seed & 3) === 0) kind = 'towerTall';
          if (COMMON.has(kind)) style = 'common';
        } else if (zone === 'blend') {
          district = 'blend';
          style = weightedStyle(pja, R);
          const roll = R();
          if (roll < 0.22) { kind = 'workshop'; style = 'outer'; }
          else if (roll < 0.5) kind = HOME[style];
          else if (roll < 0.65) kind = HOME2[style];
          else if (roll < 0.73) { kind = COMMON_KINDS[Math.floor(R() * COMMON_KINDS.length)]; style = 'common'; }
          else if (roll < 0.80) { kind = 'towerMid'; style = 'modern'; }
          else if (roll < 0.83) { kind = 'towerTall'; style = 'modern'; }
          else kind = pick(KINDS[style], Math.floor(R() * 1000));
        } else if (zone === 'industrial') {
          district = 'industrial';
          style = 'outer';
          kind = ['warehouse', 'factory', 'silos', 'workshop'][Math.floor(R() * 4)];
        } else if (zone === 'suburb') {
          district = 'suburb';
          const roll = R();
          if (roll < 0.62) { kind = 'cottage'; style = 'outer'; }
          else if (roll < 0.7) { kind = R() < 0.5 ? 'garden' : 'playground'; style = 'common'; }
          else if (roll < 0.8) { kind = 'farmhouse'; style = 'outer'; }
          else if (roll < 0.86) { kind = 'vineyard'; style = 'outer'; }
          else if (roll < 0.9) { kind = 'bandstand'; style = 'common'; }
          else { style = neighbours(pja)[0]; kind = HOME[style]; }
        } else {
          district = 'country';
          style = 'outer';
          const roll = R();
          if (riverDistance(x, z) < RIVER_HALF + 14) kind = 'watermill';
          else kind = roll < 0.45 ? 'farmhouse' : roll < 0.75 ? 'barn' : roll < 0.88 ? 'windmill' : 'vineyard';
        }

        if (COMMON.has(kind)) style = 'common';
        const rp = nearestRoadPoint(index, x, z);
        let rotY;
        if (kind === 'pier' || kind === 'crane') rotY = Math.atan2(x, z);
        else if (rp) rotY = Math.atan2(rp.x - x, rp.z - z) + (R() - 0.5) * 0.24;
        else rotY = Math.atan2(-x, -z);
        const setback = R() * 1.2;
        let scaleY;
        if (style === 'modern' && (kind === 'towerMid' || kind === 'towerTall')) {
          scaleY = Math.max(0.7, Math.min(1.6, 1.6 - Math.hypot(x, z + 84) / 150));
        } else scaleY = 0.9 + R() * 0.2;
        const spike = R() < 0.03;
        if (spike) scaleY *= 1.5;

        const lot = {
          id, band, angle: pja, r: pjr, x, z, size: psize, rotY, setback, scaleY, spike, district, zone, style, kind,
          variant: hash(id) % 3,
          claimable: !COMMON.has(kind) && (CLAIMABLE[style] || []).includes(kind),
        };
        lots.push(lot);
        addCell(lot);
      }
    }
  });

  const fields = [];
  let fieldIndex = 0;
  for (let fr = 466; fr <= 572; fr += 17) {
    const FR = rng('field' + fr);
    let a = 0;
    while (a < 360) {
      const stepDeg = ((20 + FR() * 10) / fr) * (180 / Math.PI);
      const ja = a + stepDeg / 2;
      a += stepDeg;
      if (inHarbour(ja)) continue;
      const p = polar(fr, ja);
      const w = 10 + FR() * 10, d = 8 + FR() * 8;
      const radius = Math.max(w, d) / 2;
      if (distanceToRoads(index, p.x, p.z) < radius) continue;
      if (riverDistance(p.x, p.z) < RIVER_HALF + radius + 1) continue;
      let hit = false;
      for (const lot of lots) {
        if (Math.hypot(p.x - lot.x, p.z - lot.z) < radius + lot.size / 2) { hit = true; break; }
      }
      if (hit) continue;
      fields.push({ id: `fd${fieldIndex}`, x: p.x, z: p.z, w, d, rotY: Math.atan2(-p.x, -p.z) + (FR() - 0.5) * 0.5, crop: fieldIndex % 4 });
      fieldIndex++;
    }
  }

  const bridges = AVENUES.map((angle) => {
    const p = polar(canalRadius(angle, CANAL.inner, CANAL.outer), angle);
    return { x: p.x, z: p.z, angle };
  });
  // River bridges wherever a ring road or avenue crosses the river (rotY spans the deck along the road).
  const riverBridges = [];
  for (const road of [...rings, ...avenues]) {
    for (const leg of river.legs) {
      for (let i = 1; i < road.pts.length; i++) {
        const a = road.pts[i - 1], b = road.pts[i];
        for (let j = 1; j < leg.pts.length; j++) {
          const hit = segmentCross(a, b, leg.pts[j - 1], leg.pts[j]);
          if (!hit) continue;
          if (riverBridges.some((br) => Math.hypot(br.x - hit[0], br.z - hit[1]) < 6)) continue;
          riverBridges.push({ x: hit[0], z: hit[1], rotY: Math.atan2(b[0] - a[0], b[1] - a[1]), w: road.w + 1.6, kind: road.kind });
        }
      }
    }
  }

  // Rolling hills and a mountain range beyond the farmland (deterministic; rendered as one terrain mesh).
  const hills = [];
  const HR = rng('hills');
  for (let i = 0; i < 70; i++) {
    const far = i >= 40;
    const r = far ? 1150 + HR() * 450 : 610 + HR() * 300, a = HR() * 360;
    if (inHarbour(a) || NORM(a - 45) < 40 || NORM(45 - a) < 40) continue;
    const p = polar(r, a);
    if (riverDistance(p.x, p.z) < (far ? 90 : 50)) continue;
    hills.push({ x: p.x, z: p.z, r: far ? 140 + HR() * 170 : 45 + HR() * 70, h: far ? 55 + HR() * 105 : 10 + HR() * 26, mountain: far });
  }

  const usedParks = parks.filter((p) => p.used).map((p, i) => ({ id: `pk${i}`, x: p.x, z: p.z, r: p.r, kind: p.kind }));
  const result = {
    coreR: CORE_R,
    canal,
    river,
    riverBridges,
    hills,
    wallR: WALL_R,
    roads,
    ringRoads: rings,
    avenues,
    streets,
    bridges,
    lots,
    parks: usedParks,
    fields,
    sea: HARBOUR,
    wonders,
    cityEdge: CITY_EDGE,
    outerEdge: OUTER_EDGE,
    outerR: COUNTRY_EDGE,
  };
  result.patches = buildGroundPatches(result);
  cached = Object.freeze(result);
  return cached;
}

export function buildGroundPatches(plan) {
  const MAX = 9000;
  const patches = [];
  const vertices = (radius, seed) => {
    const R = rng(`patch-${seed}`);
    const n = 7 + Math.floor(R() * 3);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const rr = radius * (0.82 + R() * 0.36);
      pts.push([Math.cos(ang) * rr, Math.sin(ang) * rr]);
    }
    return pts;
  };
  const lotStyle = (lot) => {
    if (lot.zone === 'inner') return districtAt(lot.angle, lot.r);
    if (lot.zone === 'blend') return 'blend';
    if (lot.zone === 'harbour') return 'harbour';
    if (lot.zone === 'industrial') return 'industrial';
    if (lot.zone === 'suburb') return 'suburb';
    if (lot.zone === 'country') return 'country';
    return lot.style || lot.zone;
  };
  for (const lot of plan.lots) {
    if (patches.length >= MAX) break;
    const pts = vertices(lot.size * 0.72, lot.id).map(([px, pz]) => [lot.x + px, lot.z + pz]);
    patches.push({ zone: lot.zone, style: lotStyle(lot), pts });
  }
  for (const park of plan.parks) {
    if (patches.length >= MAX) break;
    const pts = vertices(park.r, park.id).map(([px, pz]) => [park.x + px, park.z + pz]);
    patches.push({ zone: 'park', style: park.kind || 'park', pts });
  }
  return patches;
}

function segmentCross(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c[0] - a[0], qz = c[1] - a[1];
  const t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + rx * t, a[1] + rz * t];
}

function compareKeys(a, b) { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0; }

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
