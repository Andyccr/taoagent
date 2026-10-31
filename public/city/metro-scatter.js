// Street-level dressing of the metropolis, computed once from the static plan: street trees by district, lamps,
// riverside willows, park furniture, market stalls, shop signs, parked carts and cars, moored boats and small
// groups of townsfolk. Returns plain placement records; metropolis.js turns them into LOD batch instances.
import { districtAt, hash } from './metropolis-plan.js';
import { makeRoadIndex, distanceToRoads } from './metropolis-streets.js';

const TREES = {
  chinese: ['willow', 'blossom', 'pine', 'planeTree', 'blossom'],
  greek: ['cypress', 'pine', 'planeTree', 'cypress', 'bush'],
  roman: ['pine', 'cypress', 'planeTree', 'pine'],
  modern: ['planeTree', 'poplar', 'planeTree', 'bush'],
  mixed: ['planeTree', 'cypress', 'blossom', 'pine'],
  outer: ['poplar', 'planeTree', 'cypress', 'poplar'],
  harbour: ['palm', 'pine', 'palm'],
};
const LAMPS = { chinese: 'lanternPost', greek: 'romanTorch', roman: 'romanTorch', modern: 'modernLamp', mixed: 'gasLamp', outer: 'gasLamp', harbour: 'gasLamp' };
const SHOPS = new Set(['shophouse', 'teahouse', 'tabernae', 'thermopolium', 'market', 'stalls', 'marketHall', 'mall', 'house']);
const CIVIC = new Set(['temple', 'pagoda', 'drumTower', 'treasury', 'tholos', 'basilica', 'bouleuterion', 'gymnasium', 'baths', 'theatre']);
const OFFICE = new Set(['office', 'towerMid', 'towerTall', 'glassTower', 'hotel', 'residential', 'apartmentBlock', 'glassSlab', 'loftRow', 'stationHall']);

const angleOf = (x, z) => ((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360;
const inHarbour = (plan, a) => a >= plan.sea.from && a <= plan.sea.to;

export function styleAt(plan, x, z) {
  const r = Math.hypot(x, z), a = angleOf(x, z);
  if (r < plan.cityEdge) return districtAt(a, r);
  if (inHarbour(plan, a) && r > 340) return 'harbour';
  if (r < 366) { const d = districtAt(a, 0); return d === 'mixed' ? 'mixed' : d; }
  return 'outer';
}

export function scatterProps(plan, { claimedLots = new Set(), quality = 'medium' } = {}) {
  const out = [];
  const roadIdx = makeRoadIndex(plan.roads);
  const waterIdx = makeRoadIndex([...plan.river.legs.map((l) => ({ pts: l.pts, w: plan.river.half * 2 })), { pts: plan.canal.pts, w: plan.canal.half * 2 }]);
  const cells = new Map();
  for (const lot of plan.lots) {
    const k = Math.floor(lot.x / 16) + ',' + Math.floor(lot.z / 16);
    (cells.get(k) || cells.set(k, []).get(k)).push(lot);
  }
  const lotHit = (x, z, m) => {
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
      for (const lot of cells.get(i + ',' + j) || []) if (Math.abs(lot.x - x) < lot.size / 2 + m && Math.abs(lot.z - z) < lot.size / 2 + m && Math.hypot(lot.x - x, lot.z - z) < lot.size * 0.71 + m) return true;
    }
    return false;
  };
  const wonderHit = (x, z, m = 1) => plan.wonders.some((w) => x > w.x0 - m && x < w.x1 + m && z > w.z0 - m && z < w.z1 + m);
  const wallHit = (x, z) => Math.abs(Math.hypot(x, z) - plan.wallR) < 6;
  const coreHit = (x, z) => Math.hypot(x, z) < plan.canal.outer + 4;
  const free = (x, z, m = 0.6, road = 0.3) => !coreHit(x, z) && !wonderHit(x, z) && !wallHit(x, z) && !lotHit(x, z, m)
    && distanceToRoads(roadIdx, x, z) > road && distanceToRoads(waterIdx, x, z) > 0.8;
  const push = (kind, x, z, rotY, scale, cls, variant) => out.push({ kind, x, z, rotY, scale, cls, variant: variant ?? 0 });
  const pickTree = (style, h) => { const list = TREES[style] || TREES.outer; return list[h % list.length]; };

  // Walk a polyline at a fixed spacing, calling fn(x, z, nx, nz, dirAngle, i) at each step.
  const walk = (pts, step, start, fn) => {
    let carry = start, i = 0;
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, z0] = pts[s], [x1, z1] = pts[s + 1];
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
      if (!len) continue;
      let d = carry;
      while (d < len) { const t = d / len; fn(x0 + dx * t, z0 + dz * t, -dz / len, dx / len, Math.atan2(dx, dz), i++); d += step; }
      carry = d - len;
    }
  };

  // 1. Street trees and lamps along avenues, ring roads and streets.
  const lowTrees = quality === 'low';
  for (const road of plan.roads) {
    const avenue = road.kind === 'avenue', ring = road.kind === 'ring';
    if (!avenue && !ring && road.kind !== 'street') continue;
    if (lowTrees && !avenue) continue;
    const step = avenue ? 7 : ring ? 9 : 12, off = road.w / 2 + (avenue ? 1.0 : 0.8);
    walk(road.pts, step, 3 + (hash(road.id || road.r || road.angle) % 5), (x, z, nx, nz, dir, i) => {
      for (const side of avenue || ring ? [-1, 1] : [(i % 2) * 2 - 1]) {
        const tx = x + nx * off * side, tz = z + nz * off * side;
        const r = Math.hypot(tx, tz);
        if (r > plan.outerEdge + 40) continue;
        if (!free(tx, tz, 0.5, 0.2)) continue;
        const h = hash(Math.round(tx * 3) + ':' + Math.round(tz * 3));
        const style = styleAt(plan, tx, tz);
        const lampHere = (avenue && i % 3 === 1) || (ring && i % 4 === 2) || (!avenue && !ring && i % 5 === 3);
        if (lampHere) push(LAMPS[style] || 'gasLamp', tx, tz, dir + (side > 0 ? Math.PI : 0), 1, 'prop', h % 3);
        else push(pickTree(style, h >>> 3), tx, tz, (h % 628) / 100, 0.85 + (h % 35) / 100, 'tree', h % 3);
      }
    });
  }

  // 2. River and canal embankments: willows/poplars, lamps and the odd moored boat.
  for (const leg of plan.river.legs) {
    const off = plan.river.half + 2.2;
    walk(leg.pts, 8, 2, (x, z, nx, nz, dir, i) => {
      for (const side of [-1, 1]) {
        const tx = x + nx * off * side, tz = z + nz * off * side;
        if (Math.hypot(tx, tz) > 760 || !free(tx, tz, 0.4, 0.6)) continue;
        const h = hash('rv' + i + side);
        const style = styleAt(plan, tx, tz);
        if (i % 4 === 0 && Math.hypot(tx, tz) < plan.outerEdge) push(LAMPS[style] || 'gasLamp', tx, tz, dir, 1, 'prop', h % 3);
        else push(style === 'chinese' || h % 3 === 0 ? 'willow' : style === 'modern' ? 'planeTree' : 'poplar', tx, tz, (h % 628) / 100, 0.9 + (h % 30) / 100, 'tree', h % 3);
      }
      if (i % 11 === 5 && Math.hypot(x, z) < plan.outerEdge + 60) {
        const side = (i % 2) * 2 - 1, bx = x + nx * (plan.river.half - 1.4) * side, bz = z + nz * (plan.river.half - 1.4) * side;
        if (distanceToRoads(roadIdx, bx, bz) > 4) push(styleAt(plan, bx, bz) === 'chinese' ? 'sampan' : 'barge', bx, bz, dir + Math.PI / 2, 0.8, 'boat', i % 3);
      }
    });
  }

  // 3. Parks, plazas and markets: trees, fountains, statues, benches, stalls and people.
  for (const p of plan.parks) {
    const style = styleAt(plan, p.x, p.z), seed = hash(p.id);
    const nTrees = p.kind === 'park' ? 8 + (seed % 9) : 3 + (seed % 4);
    for (let i = 0; i < nTrees; i++) {
      const a = (hash(p.id + 'a' + i) % 628) / 100, rr = p.r * (0.35 + (hash(p.id + 'r' + i) % 60) / 100);
      const tx = p.x + Math.cos(a) * rr, tz = p.z + Math.sin(a) * rr;
      if (!free(tx, tz, 0.3, 0.3)) continue;
      push(pickTree(style, hash(p.id + 't' + i)), tx, tz, a, 0.9 + (i % 4) * 0.1, 'tree', i % 3);
    }
    const centre = free(p.x, p.z, 1.5, 1.5);
    if (centre) push(p.kind === 'park' ? (seed % 3 ? 'fountainSmall' : 'statue') : p.kind === 'plaza' ? (seed % 2 ? 'statue' : 'fountainSmall') : 'kiosk', p.x, p.z, (seed % 628) / 100, 1.1, 'prop', seed % 3);
    const ringN = p.kind === 'market' ? 10 : 5;
    for (let i = 0; i < ringN; i++) {
      const a = (i / ringN) * Math.PI * 2 + (seed % 100) / 50, rr = p.kind === 'market' ? 3.6 + (i % 2) * 2.2 : 3.2;
      const tx = p.x + Math.cos(a) * rr, tz = p.z + Math.sin(a) * rr;
      if (!free(tx, tz, 0.3, 0.3)) continue;
      const kind = p.kind === 'market' ? (i % 4 === 3 ? 'handcart' : 'marketStall') : p.kind === 'plaza' ? (i % 2 ? 'umbrellaTable' : 'bench') : 'bench';
      push(kind, tx, tz, Math.atan2(p.x - tx, p.z - tz), 1, 'prop', (seed + i) % 3);
    }
    for (let i = 0; i < (p.kind === 'park' ? 4 : 9); i++) {
      const a = (hash(p.id + 'pp' + i) % 628) / 100, rr = 1.8 + (hash(p.id + 'pr' + i) % 50) / 10;
      const tx = p.x + Math.cos(a) * rr, tz = p.z + Math.sin(a) * rr;
      if (free(tx, tz, 0.2, 0.2)) push('person', tx, tz, a * 3, 0.95 + (i % 3) * 0.05, 'people', i % 3);
    }
  }

  // 4. Lot frontages: shop signs and banners, temple banners, flags, amphorae and barrels, fences, carts and cars.
  for (const lot of plan.lots) {
    if (claimedLots.has(lot.id)) continue;
    const h = hash(lot.id + 'dress');
    const fx = Math.sin(lot.rotY), fz = Math.cos(lot.rotY), tx = Math.cos(lot.rotY), tz = -Math.sin(lot.rotY);
    const front = lot.size / 2 + 0.7;
    const at = (lat, fwd) => [lot.x + fx * fwd + tx * lat, lot.z + fz * fwd + tz * lat];
    const put = (kind, lat, fwd, rot, cls, scale = 1) => { const [x, z] = at(lat, fwd); if (free(x, z, 0.05, 0.15)) push(kind, x, z, lot.rotY + rot, scale, cls, h % 3); };
    const side = (h & 1) ? 1 : -1;
    if (SHOPS.has(lot.kind)) {
      if (h % 3 === 0) put('signboard', side * lot.size * 0.3, front - 0.3, 0, 'prop');
      if (h % 4 === 1) put(lot.style === 'chinese' ? 'bannerPole' : lot.style === 'modern' ? 'kiosk' : 'umbrellaTable', -side * lot.size * 0.25, front, 0, 'prop');
      if (h % 5 === 2) put('person', side * 0.6, front + 0.2, Math.PI, 'people');
      if (h % 7 === 3) put('person', -side * 1.1, front + 0.5, 0.6, 'people');
    }
    if (CIVIC.has(lot.kind) && h % 2 === 0) { put('bannerPole', -lot.size * 0.35, front, 0, 'prop'); put('bannerPole', lot.size * 0.35, front, 0, 'prop'); }
    if (OFFICE.has(lot.kind)) {
      if (h % 3 === 0) put('car', side * lot.size * 0.25, front + 0.6, Math.PI / 2, 'prop');
      if (h % 5 === 1) put('flagPole', -side * lot.size * 0.35, front - 0.2, 0, 'prop');
      if (h % 6 === 2) put('person', 0.3, front + 0.4, Math.PI, 'people');
    }
    if (lot.kind === 'tabernae' || lot.kind === 'thermopolium' || lot.kind === 'granary' || (lot.style === 'greek' && lot.kind === 'workshop')) put('amphoraStack', side * lot.size * 0.36, front - 0.4, 0, 'prop');
    if (lot.kind === 'warehouse' || lot.kind === 'workshop' || lot.kind === 'factory' || lot.kind === 'boathouse') { if (h % 2 === 0) put('barrelStack', side * lot.size * 0.3, front, 0, 'prop'); if (h % 5 === 0) put('handcart', -side * lot.size * 0.2, front + 0.3, 0.4, 'prop'); }
    if (lot.kind === 'barn' || lot.kind === 'farmhouse' || lot.kind === 'windmill') { put('haystack', side * lot.size * 0.62, 0, 0, 'prop'); if (h % 3 === 0) put('oxcart', -side * lot.size * 0.3, front + 0.4, 0.3, 'prop'); }
    if (lot.kind === 'cottage' || lot.kind === 'farmhouse' || lot.kind === 'vineyard') {
      for (const lat of [-2.1, 0, 2.1]) if (Math.abs(lat) > 0.5 || h % 3) put('fence', lat * lot.size / 7, lot.size / 2 - 0.25, 0, 'prop');
      if (h % 2) put(pickTree('outer', h >>> 4), -side * (lot.size / 2 + 1.3), -0.8, 0, 'tree', 0.9);
    }
    if ((lot.style === 'chinese' || lot.style === 'common') && (lot.kind === 'siheyuan' || lot.kind === 'courtyardLarge') && h % 3 === 0) put('blossom', side * (lot.size / 2 + 1.1), 0.5, 0, 'tree', 0.85);
  }

  // 5. Harbour: ships moored at the piers and the quay.
  for (const lot of plan.lots) {
    if (lot.kind !== 'pier') continue;
    const h = hash(lot.id + 'ship');
    const dx = Math.sin(lot.rotY), dz = Math.cos(lot.rotY);
    for (const k of [0, 1]) {
      const along = lot.size * 0.9 + 5 + k * 9, lat = (k ? -1 : 1) * 4.5;
      const x = lot.x + dx * along + dz * lat, z = lot.z + dz * along - dx * lat;
      push(['galley', 'sailboat', 'barge', 'ferry'][(h + k) % 4], x, z, lot.rotY + Math.PI / 2, 1, 'boat', (h + k) % 3);
    }
  }

  // 6. Wonder forecourts: ceremonial trees, banners and visitors.
  for (const w of plan.wonders) {
    if (w.kind === 'lighthouse') continue;
    const rx = (w.x1 - w.x0) / 2 + 2.5, rz = (w.z1 - w.z0) / 2 + 2.5, style = styleAt(plan, w.x, w.z);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2, x = w.x + Math.cos(a) * rx, z = w.z + Math.sin(a) * rz;
      if (!free(x, z, 0.4, 0.4) || wonderHit(x, z, 0.5)) continue;
      push(i % 5 === 0 ? 'bannerPole' : pickTree(style, i), x, z, a, 1.1, i % 5 === 0 ? 'prop' : 'tree', i % 3);
    }
    for (let i = 0; i < 14; i++) {
      const a = (hash(w.id + 'v' + i) % 628) / 100, x = w.x + Math.cos(a) * (rx + 2 + (i % 3)), z = w.z + Math.sin(a) * (rz + 2 + (i % 3));
      if (free(x, z, 0.2, 0.2) && !wonderHit(x, z, 0.5)) push('person', x, z, a, 1, 'people', i % 3);
    }
  }

  // 7. Farmland: haystacks and poplar windbreaks.
  for (const f of plan.fields) {
    const h = hash(f.id);
    if (h % 3 === 0 && free(f.x, f.z, 0.2, 1)) push('haystack', f.x + 2, f.z - 1, f.rotY, 1, 'prop', h % 3);
    if (h % 2 === 0) for (let k = -2; k <= 2; k++) {
      const x = f.x + Math.cos(f.rotY) * (f.w / 2 + 1.5) + Math.sin(f.rotY) * k * 3.2, z = f.z - Math.sin(f.rotY) * (f.w / 2 + 1.5) + Math.cos(f.rotY) * k * 3.2;
      if (free(x, z, 0.4, 0.5)) push('poplar', x, z, k, 1, 'tree', (h + k) & 1);
    }
  }
  // 8. Groves and orchards on open land outside the walls, thinning out into the countryside.
  const GR = (n) => { let h = hash('grove' + n); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) / 4294967296); };
  const gr = GR(quality);
  for (let x = -640; x <= 640; x += 13) for (let z = -640; z <= 640; z += 13) {
    const jx = x + (gr() - 0.5) * 9, jz = z + (gr() - 0.5) * 9, r = Math.hypot(jx, jz);
    if (r < plan.wallR + 10 || r > 640) continue;
    const a = angleOf(jx, jz);
    if (inHarbour(plan, a) && r > plan.sea.shore - 6) continue;
    const clump = Math.sin(jx * 0.021 + 1.3) * Math.cos(jz * 0.017 - 0.7) + Math.sin((jx + jz) * 0.011);
    if (clump < 0.2 || gr() > 0.8) continue;
    if (plan.fields.some((f) => Math.abs(f.x - jx) < f.w / 2 + 1.5 && Math.abs(f.z - jz) < f.d / 2 + 1.5)) continue;
    if (!free(jx, jz, 1.2, 1.2)) continue;
    const h = hash(Math.round(jx) + ':' + Math.round(jz) + 'g');
    const orchard = r > plan.outerEdge && h % 3 === 0;
    push(orchard ? 'blossom' : ['planeTree', 'poplar', 'pine', 'cypress', 'planeTree'][h % 5], jx, jz, (h % 628) / 100, orchard ? 0.8 : 0.95 + (h % 40) / 100, 'tree', h % 3);
  }
  return out;
}
