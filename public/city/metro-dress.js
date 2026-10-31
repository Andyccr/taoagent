// Street-level and rooftop dressing for unclaimed city lots: doors and steps on the street face, shutters, flower
// boxes, awnings and signs on shops, lantern strings, balconies, laundry lines across lanes, rooftop clutter (water
// tanks, AC units, roof gardens, solar panels, dishes) and the odd bicycle or crate pile. Placement reads the actual
// filler geometry (front wall at street level, roof height, flat or pitched), so props sit on the walls and roofs.
import { hash } from './metropolis-plan.js';
import { footprintHeight } from './metro-height.js';

const SHOPS = new Set(['thermopolium', 'tabernae', 'shophouse', 'teahouse', 'marketHall', 'market', 'mall', 'loftRow', 'workshop']);
const HOMES = new Set(['domus', 'house', 'insula', 'siheyuan', 'villa', 'residential', 'apartmentBlock', 'cottage', 'farmhouse', 'shophouse', 'loftRow', 'courtyardLarge']);
const SKIP = new Set(['garden', 'bandstand', 'plaza', 'fountainSquare', 'playground', 'statueSquare', 'vineyard', 'pier', 'crane', 'silos', 'windmill', 'watermill', 'pagoda', 'tholos', 'theatre', 'stoa', 'agora', 'stalls', 'gymnasium', 'temple', 'boathouse', 'barn']);
const FLAT = new Set(['insula', 'residential', 'apartmentBlock', 'office', 'towerMid', 'towerTall', 'glassTower', 'glassSlab', 'hotel', 'mall', 'loftRow', 'warehouse', 'factory', 'stationHall', 'tabernae', 'workshop']);

// Per filler geometry: the street-level front wall (max z of low vertices near the axis), its half width, roof top
// and whether the roof is flat (many vertices close to the top over a wide area).
const statCache = new Map();
function geoStats(key, geo) {
  if (statCache.has(key)) return statCache.get(key);
  const p = geo.getAttribute('position');
  let top = 0, fz = -Infinity, hw = 0, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < p.count; i++) top = Math.max(top, p.getY(i));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y > 0.25 && y < 1.6) { if (Math.abs(x) < 1.2) fz = Math.max(fz, z); hw = Math.max(hw, Math.abs(x)); }
    if (y > top * 0.92) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  }
  const s = { top, fz: Number.isFinite(fz) && fz > 0.4 ? fz : NaN, hw: hw || 2.5, flatW: maxX - minX, flatD: maxZ - minZ, flatX: (maxX + minX) / 2, flatZ: (maxZ + minZ) / 2 };
  statCache.set(key, s);
  return s;
}

export function placeDressing(plan, { claimedLots = new Set(), quality = 'medium', fillerGeometry } = {}) {
  const out = [];
  if (quality === 'low') return out;
  const dense = quality === 'high' ? 1 : 0.7;
  for (const lot of plan.lots) {
    if (claimedLots.has(lot.id) || SKIP.has(lot.kind) || lot.r > (plan.outerEdge || 700) + 120) continue;
    const geo = fillerGeometry(lot.style, lot.kind, lot.variant); if (!geo) continue;
    const st = geoStats(lot.style + ':' + lot.kind + ':' + lot.variant, geo);
    if (Number.isNaN(st.fz)) continue;
    const h = hash(lot.id + 'dr'), rnd = (k) => (hash(lot.id + k) % 1000) / 1000;
    if (rnd('keep') > dense) continue;
    const s = lot.size / 7, sy = s * (lot.scaleY || 1), sin = Math.sin(lot.rotY), cos = Math.cos(lot.rotY);
    const cx = lot.x - sin * lot.setback, cz = lot.z - cos * lot.setback, base = footprintHeight(cx, cz, lot.size, lot.rotY) - 0.05;
    // Local (x, z) in lot units -> world; ly is the height above the building's base (the result is absolute).
    const put = (kind, lx, ly, lz, rot, scale, variant, cls = 'dress') => {
      const wx = lx * s, wz = lz * s;
      out.push({ kind, x: cx + wx * cos + wz * sin, z: cz - wx * sin + wz * cos, y: base + ly, rotY: lot.rotY + rot, scale, variant, cls });
    };
    const k = Math.min(1, Math.max(0.42, s * 0.95)); // prop scale: smaller on small, dense-core lots
    const front = st.fz + 0.02 / s, home = HOMES.has(lot.kind), shop = SHOPS.has(lot.kind), tall = st.top * sy;
    const v = h % 4;
    // Street face: door (+ steps on a raised or grand front), shutters and flower boxes above, shop awning and sign.
    put('door', 0, 0, front, 0, k, v);
    if (lot.style === 'greek' || lot.style === 'roman' || h % 5 === 0) put('doorSteps', 0, 0, front + 0.18 / s, 0, k, v);
    if (home && tall > 3.2 * k) {
      const wy = Math.min(tall - 1.2 * k, 2.7 * k + (h % 3) * 0.2);
      for (const sx of [-1, 1]) {
        const lx = sx * Math.min(st.hw * 0.55, 1.9);
        if (Math.abs(lx) * s < 0.8 * k) continue;
        put('shutterWindow', lx, wy, front, 0, k, (v + (sx > 0 ? 1 : 0)) % 4);
        if ((h >>> (sx > 0 ? 3 : 5)) % 3 === 0) put('flowerBox', lx, wy - 0.1 * k, front + 0.05 / s, 0, k, v);
      }
      if ((lot.style === 'roman' || lot.style === 'modern' || lot.style === 'greek') && tall > 5 * k && h % 3 === 0) put('balcony', 0, Math.min(tall - 1.4 * k, 3.4 * k), front, 0, k, v);
    }
    if (shop || (lot.style === 'chinese' && lot.kind === 'house')) {
      put('awning', 0, Math.min(2.3 * k, tall * 0.6), front, 0, k, v);
      put('shopSign', Math.min(st.hw * 0.5, 1.4) * (h % 2 ? 1 : -1), Math.min(2.9 * k, tall * 0.75), front + 0.05 / s, 0, k, v);
    }
    if (lot.style === 'chinese' && h % 3 !== 2) put('lanternString', 0, Math.min(2.6 * k, tall * 0.7), front + 0.25 / s, 0, k, v);
    // Lane life: laundry across the side lane in the dense old quarters, bikes and crates by the door.
    if (home && (lot.style === 'roman' || lot.style === 'chinese' || lot.style === 'common' || lot.kind === 'insula') && h % 4 === 1 && tall > 3) {
      put('laundryLine', st.hw + 0.35 / s, Math.min(tall * 0.62, 3.6 * k), 0, Math.PI / 2, k, v);
    }
    if (h % 7 === 2) put(lot.style === 'modern' ? 'bicycle' : 'clutterCrates', Math.min(st.hw * 0.8, 2.6), 0, front + 0.6 / s, 0.2 * (h % 5), k, v);
    if (lot.style === 'modern' && h % 9 === 4) put('bicycle', -Math.min(st.hw * 0.7, 2.2), 0, front + 0.5 / s, Math.PI / 2, k, v);
    // Roofs: flat roofs collect tanks, AC units, gardens, panels and dishes; pitched roofs get chimney stacks.
    const flat = FLAT.has(lot.kind) && st.flatW > 1.6 && st.flatD > 1.6;
    if (flat) {
      const n = 1 + (h % 3) + (lot.style === 'modern' ? 1 : 0);
      const kinds = lot.style === 'modern' ? ['acUnit', 'waterTank', 'solarPanels', 'satelliteDish', 'roofGarden', 'acUnit', 'skylight']
        : ['waterTank', 'roofGarden', 'acUnit', 'satelliteDish', 'chimneyStack'];
      for (let i = 0; i < n; i++) {
        const kind = kinds[(h >>> (i * 3)) % kinds.length];
        const lx = st.flatX + (rnd('rx' + i) - 0.5) * st.flatW * 0.6, lz = st.flatZ + (rnd('rz' + i) - 0.5) * st.flatD * 0.6;
        put(kind, lx, tall, lz, ((h >>> i) % 4) * Math.PI / 2, k * (kind === 'roofGarden' || kind === 'solarPanels' ? 1.1 : 1), (v + i) % 4);
      }
    } else if (home && h % 3 === 0 && st.top > 1) {
      put('chimneyStack', (h % 2 ? 1 : -1) * st.hw * 0.45, tall * 0.82, -st.fz * 0.2, 0, k, v);
    }
  }
  return out;
}
