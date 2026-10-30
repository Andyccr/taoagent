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

export function computeCity(roster) {
  const lead = roster.find((b) => b.lead) || null;
  const others = roster.filter((b) => b !== lead);
  const rings = [makeRing(1), makeRing(2)];
  const plotAt = (ring, index) => {
    while (rings.length < ring) rings.push(makeRing(rings.length + 1));
    return rings[ring - 1][index];
  };
  const pending = [];
  // 1) pinned slots first
  for (const b of others) {
    const s = b.slot;
    if (s && Number.isInteger(s.ring) && s.ring >= 1 && Number.isInteger(s.index) && s.index >= 0 && s.index < PER_RING && !plotAt(s.ring, s.index).bot) plotAt(s.ring, s.index).bot = b;
    else pending.push(b);
  }
  // 2) auto: lowest ring with a free plot, nearest the style's quarter
  for (const b of pending) {
    const want = STYLE_ANGLE[b.style] ?? 0;
    let placed = false;
    for (let k = 1; !placed; k++) {
      const ring = k <= rings.length ? rings[k - 1] : (rings.push(makeRing(k)), rings[k - 1]);
      const free = ring.filter((p) => !p.bot).sort((p, q) => angDist(p.angle, want) - angDist(q.angle, want) || p.index - q.index);
      if (free.length) { free[0].bot = b; placed = true; }
    }
  }
  // 3) always keep an outer ring with free (reserved) plots: when the outermost ring is full, extend.
  while (rings[rings.length - 1].every((p) => p.bot)) rings.push(makeRing(rings.length + 1));
  // Style variants: n-th bot of a style (in roster order) gets variant n.
  const count = {};
  const plots = rings.flat();
  const byBot = new Map();
  for (const b of others) {
    const p = plots.find((q) => q.bot === b);
    p.variant = (count[b.style] = (count[b.style] ?? -1) + 1);
    byBot.set(b.id, p);
  }
  const outerR = ringRadius(rings.length) + PLOT / 2 + 1;
  return { lead, plots, rings: rings.length, outerR, byBot };
}
