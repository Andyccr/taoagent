// Data-driven city layout. Pure function of the roster (src/roster.js); no per-bot code anywhere.
// Angles are degrees clockwise seen from above, 0 = back of the city (-z), 90 = right (+x), 180 = front (+z, camera side).
export const PLAZA_R = 9;              // central plaza radius
export const ROAD_W = 2.4;             // ring road around the plaza
export const ROAD_MID = PLAZA_R + ROAD_W / 2; // messengers walk along this circle
export const PLOT = 8;                 // plot size (8 x 8)
export const PER_RING = 6;
const RING1_R = 16.5, RING_STEP = 10.5;
// Preferred quarter per style (used when a bot has no pinned slot).
export const STYLE_ANGLE = { roman: 90, greek: 270, modern: 330, chinese: 180 };

export const ringRadius = (k) => RING1_R + RING_STEP * (k - 1);
export const ringOffset = (k) => (k % 2 ? 30 : 0);
const rad = (d) => (d * Math.PI) / 180;
export const polar = (r, deg) => ({ x: r * Math.sin(rad(deg)), z: -r * Math.cos(rad(deg)) });
const angDist = (a, b) => { const d = Math.abs((((a - b) % 360) + 360) % 360); return Math.min(d, 360 - d); };

function makeRing(k) {
  const out = [];
  for (let i = 0; i < PER_RING; i++) {
    const angle = (ringOffset(k) + (360 / PER_RING) * i) % 360;
    const r = ringRadius(k);
    const p = polar(r, angle);
    // Building front (+z local) faces the plaza center; plots in the front half (camera side) face +z
    // (south, like an imperial city) so their doors and figures stay visible to the camera.
    const faceSouth = Math.cos(rad(angle)) < -0.2;
    out.push({ ring: k, index: i, angle, r, x: p.x, z: p.z, faceSouth, rotY: faceSouth ? 0 : Math.atan2(-p.x, -p.z), bot: null });
  }
  return out;
}

// Walking route (world x,z points) from the plaza ring road out to the spot in front of a plot's door.
export function approachRoute(p) {
  const pts = [polar(ROAD_MID, p.angle)];
  if (p.lot) { pts.push(polar(p.r - p.size / 2 - 0.8, p.angle)); return pts; }
  const h = PLOT / 2 + 0.6;
  if (p.faceSouth) {
    const sx = p.x < -0.01 ? 1 : -1; // walk around the side nearer the central axis
    pts.push({ x: p.x + sx * h, z: p.z - h }, { x: p.x + sx * h, z: p.z + h }, { x: p.x, z: p.z + h - 0.2 });
  } else {
    const q = polar(p.r - h + 0.2, p.angle);
    pts.push(q);
  }
  return pts;
}

export const CORE_RINGS = 3;     // the agent core always has 3 rings (18 plots); later agents claim city lots

// claim(bots) -> Map(botId -> lot) is injected by the metropolis plan (kept out of this file so the core layout stays tiny).
export function computeCity(roster, opts = {}) {
  const lead = roster.find((b) => b.lead) || null;
  const others = roster.filter((b) => b !== lead);
  const rings = Array.from({ length: CORE_RINGS }, (_, i) => makeRing(i + 1));
  const plotAt = (ring, index) => (ring <= CORE_RINGS ? rings[ring - 1][index] : null);
  const pending = [];
  // 1) pinned slots first
  for (const b of others) {
    const s = b.slot;
    const p = s && Number.isInteger(s.ring) && s.ring >= 1 && Number.isInteger(s.index) && s.index >= 0 && s.index < PER_RING ? plotAt(s.ring, s.index) : null;
    if (p && !p.bot) p.bot = b;
    else pending.push(b);
  }
  // 2) auto: lowest core ring with a free plot, nearest the style's quarter; the rest overflow into the city
  const overflow = [];
  for (const b of pending) {
    const want = STYLE_ANGLE[b.style] ?? 0;
    let placed = false;
    for (const ring of rings) {
      const free = ring.filter((p) => !p.bot).sort((p, q) => angDist(p.angle, want) - angDist(q.angle, want) || p.index - q.index);
      if (free.length) { free[0].bot = b; placed = true; break; }
    }
    if (!placed) overflow.push(b);
  }
  // 3) overflow agents claim free filler lots of the surrounding city (deterministic, see metropolis-plan.js)
  const claims = overflow.length && typeof opts.claim === 'function' ? opts.claim(overflow) : new Map();
  const claimed = [];
  for (const b of overflow) {
    const lot = claims.get(b.id);
    if (lot) claimed.push({ ...lot, ring: 0, index: -1, faceSouth: false, bot: b, lot: true });
  }
  // Style variants: n-th bot of a style (in roster order) gets variant n.
  const count = {};
  const plots = rings.flat();
  const byBot = new Map();
  for (const b of others) {
    const p = plots.find((q) => q.bot === b) || claimed.find((q) => q.bot === b);
    if (!p) continue;
    p.variant = (count[b.style] = (count[b.style] ?? -1) + 1);
    byBot.set(b.id, p);
  }
  const outerR = ringRadius(CORE_RINGS) + PLOT / 2 + 1;
  return { lead, plots, claimed, unplaced: overflow.filter((b) => !claims.get(b.id)), rings: rings.length, outerR, byBot };
}
