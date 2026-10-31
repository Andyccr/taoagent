import { createGeo } from './geo.js';

// Palette: travertine stone with deep shadow recesses.
const TRAV = 0xd8c9a8;
const TRAV_HI = 0xe9dcc0;
const TRAV_MID = 0xcbbb92;
const TRAV_BASE = 0xa89670;
const SHADOW = 0x5a4a3a;
const VOID = 0x3f352b;
const SAND = 0xd8c08a;
const DARK_STONE = 0x63584a;
const STATUE = 0xe6dcc0;
const WATER = 0x5f8fa8;
const RED = 0x9a3f32;
const LAMP_GLOW = 0xffe2a0;

// Tiny deterministic rng for ruin rubble.
let _seed = 1234567;
function rnd() { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }

export function buildColosseum() {
  const g = createGeo();
  const glass = createGeo();

  const TAU = Math.PI * 2;
  const A = 30;
  const B = 25;
  const N = 40;
  const dth = TAU / N;
  const SLAB_H = 0.2;
  const BASE_H = 2.0;
  const TIER_H = 7.2;
  const ATTIC_H = 6.2;
  const CORNICE = 0.45;
  const WALL_D = 2.4;
  const MAST_H = 10.0;
  const tiers = 3;

  const RUIN_CENTER = Math.PI * 1.25;
  const RUIN_HALF = 0.6;
  function ruinCut(th) {
    let d = th - RUIN_CENTER;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const ad = Math.abs(d);
    if (ad > RUIN_HALF) return 0;
    return Math.round((1 - ad / RUIN_HALF) * 3);
  }

  function column(g, x, y0, h, order) {
    const z = 0.14;
    const capW = [0.6, 0.64, 0.72][order];
    const capH = [0.24, 0.3, 0.38][order];
    g.box(0.52, 0.14, 0.48, x, y0 + 0.01, z, TRAV_HI);
    const shaftH = h - 0.55 - capH;
    g.cyl(0.18, 0.22, shaftH, x, y0 + 0.15, z, TRAV_HI, 6);
    const cy = y0 + 0.15 + shaftH;
    g.box(capW, capH, 0.52, x, cy + 0.04, z, TRAV_HI);
    if (order === 1) {
      g.box(0.16, 0.12, 0.22, x - capW * 0.4, cy + capH * 0.5, z, TRAV_MID);
      g.box(0.16, 0.12, 0.22, x + capW * 0.4, cy + capH * 0.5, z, TRAV_MID);
    } else if (order === 2) {
      g.box(capW * 0.96, 0.1, 0.56, x, cy + capH + 0.02, z, TRAV_HI);
      g.cone(0.1, capH * 0.6, x - 0.1, cy + capH, z, TRAV_MID, 4);
      g.cone(0.1, capH * 0.6, x + 0.1, cy + capH, z, TRAV_MID, 4);
    }
  }

  function archStatue(g, x, y, z, s) {
    g.box(0.34 * s, 0.1 * s, 0.3 * s, x, y, z, STATUE);
    g.cone(0.14 * s, 0.7 * s, x, y + 0.1 * s, z, STATUE, 5);
    g.sphere(0.1 * s, x, y + 0.95 * s, z, STATUE, 6);
  }

  function buildStorey(g, ds, t, front) {
    const y0 = SLAB_H + BASE_H + t * TIER_H;
    const col = t === 1 ? TRAV_MID : TRAV;
    const ow = front && t === 0 ? ds * 0.66 : ds * 0.5;
    const pierW = (ds - ow) / 2;
    const r = ow / 2;
    const spring = y0 + (front && t === 0 ? 3.6 : 3.0 + t * 0.1);
    const top = y0 + TIER_H - CORNICE;
    const wallZ = -WALL_D / 2;

    g.box(pierW, TIER_H - CORNICE, WALL_D, -ds / 2 + pierW / 2, y0, wallZ, col);
    g.box(pierW, TIER_H - CORNICE, WALL_D, ds / 2 - pierW / 2, y0, wallZ, col);

    const spH = top - (spring + r);
    if (spH > 0.05) g.box(ow, spH, WALL_D, 0, spring + r, wallZ, col);

    g.arch(r, 0.24, WALL_D + 0.3, 0, spring, wallZ + 0.15, TRAV_HI, 4);
    g.box(ow * 0.92, spring - y0 + r - 0.12, 0.9, 0, y0 + 0.06, -WALL_D + 0.1, VOID);

    const px = ds / 2 - pierW / 2;
    for (let s = -1; s <= 1; s += 2) column(g, s * px, y0, TIER_H - CORNICE, t);

    if (spH > 1.0) g.cyl(0.4, 0.4, 0.14, 0, spring + r + spH * 0.5, wallZ + 0.1, TRAV_HI, 8, { rx: Math.PI / 2 });

    g.box(ds * 1.06, CORNICE, WALL_D + 0.5, 0, top, wallZ + 0.2, TRAV_HI);

    if (t >= 1) archStatue(g, 0, y0 + 0.1, -WALL_D / 2, 1);
  }

  function buildAttic(g, ds, i, front) {
    const ay = SLAB_H + BASE_H + tiers * TIER_H;
    const ach = 0.42;
    const aw = ATTIC_H - ach;
    g.box(ds, aw, WALL_D, 0, ay, -WALL_D / 2, TRAV_MID);

    const apx = ds / 2 - 0.2;
    for (const s of [-1, 1]) g.box(0.32, aw - 0.2, 0.26, s * apx, ay, 0.06, TRAV);

    if (i % 2 === 0) {
      g.box(0.55, 0.55, 0.3, 0, ay + aw * 0.5, 0.02, VOID);
      glass.box(0.5, 0.5, 0.06, 0, ay + aw * 0.5, 0.2, LAMP_GLOW);
    }

    for (const c of [-1, 1]) g.box(0.26, 0.5, 0.44, c * ds * 0.3, ay + aw - 0.4, 0.18, TRAV_BASE);

    g.box(ds * 1.06, ach, WALL_D + 0.7, 0, ay + aw, -WALL_D / 2 + 0.25, TRAV_HI);

    for (let k = 0; k < 3; k++) {
      g.box(0.14, 0.14, 0.18, -ds * 0.33 + k * ds * 0.33, ay + aw - 0.12, 0.1, TRAV_HI);
    }

    if (i % 2 === 0) {
      const my = ay + aw + ach;
      g.cyl(0.05, 0.09, MAST_H, 0, my, -0.15, TRAV_BASE, 5);
      glass.sphere(0.14, 0, my + MAST_H, -0.15, LAMP_GLOW, 6);
      if (i % 8 === 0) g.box(0.5, 0.4, 0.03, 0.25, my + MAST_H - 1.2, -0.15, RED);
    }
  }

  function buildRuin(g, ds, builtTiers, cut) {
    const yTop = SLAB_H + BASE_H + builtTiers * TIER_H;
    for (let s = 0; s < 4; s++) {
      const xw = ds / 4;
      const hh = 0.8 + rnd() * 2.2;
      const xx = -ds / 2 + (s + 0.5) * xw;
      if (rnd() < 0.75) g.box(xw * 0.85, hh, WALL_D * 0.6, xx, yTop, -WALL_D / 2, TRAV_MID);
    }
    for (let s = 0; s < 7; s++) {
      const rxz = rnd();
      const xx = (rnd() - 0.5) * ds * 1.3;
      const zz = rxz < 0.55 ? 0.6 + rnd() * 2.2 : -WALL_D - 0.6 - rnd() * 1.8;
      const s1 = 0.4 + rnd() * 1.0;
      g.box(s1, s1 * 0.6, s1 * 0.8, xx, SLAB_H + 0.1 + s1 * 0.3, zz, TRAV_MID);
    }
  }

  for (let i = 0; i < N; i++) {
    const th = i * dth;
    const cx = A * Math.cos(th);
    const cz = B * Math.sin(th);
    const ry = Math.atan2(Math.cos(th) / A, Math.sin(th) / B);
    const ds = Math.hypot(A * Math.sin(th), B * Math.cos(th)) * dth;
    const cut = ruinCut(th);
    const builtTiers = 3 - cut;
    const front = i === 10;

    g.group({ x: cx, y: 0, z: cz, ry }, (g) => {
      g.box(ds * 1.14, 1.0, WALL_D + 0.9, 0, SLAB_H, -WALL_D / 2 + 0.3, TRAV_BASE);
      g.box(ds * 1.06, BASE_H - 0.9, WALL_D + 0.3, 0, SLAB_H + 1.0, -WALL_D / 2 + 0.1, TRAV_MID);
      g.box(ds * 1.02, 0.18, WALL_D + 0.1, 0, SLAB_H + BASE_H - 0.18, -WALL_D / 2, TRAV_HI);

      for (let t = 0; t < builtTiers; t++) buildStorey(g, ds, t, front);

      if (cut > 0) {
        buildRuin(g, ds, builtTiers, cut);
      } else {
        buildAttic(g, ds, i, front);
      }

      if (front) {
        for (let s = 0; s < 3; s++) {
          g.box(ds * 0.6, 0.3, 2.0 - s * 0.5, 0, SLAB_H + s * 0.3, 0.4 + s * 1.0, TRAV);
        }
        g.gable(ds * 0.7, 1.7, 1.4, 0, SLAB_H + BASE_H + TIER_H - 0.3, 0.6, TRAV_HI);
        for (const sx of [-1, 1]) column(g, sx * ds * 0.31, SLAB_H + BASE_H, TIER_H - CORNICE, 1);
      }
    });
  }

  // Cavea: stepped elliptical seating tiers.
  const rings = 8;
  const NS = 32;
  const arenaA = 12;
  const arenaB = 9;
  const caveaA = A - WALL_D - 0.6;
  const caveaB = B - WALL_D - 0.6;
  const yArena = 0.55;
  const yTopOuter = 26.0;
  const yTopInner = 3.2;
  for (let k = 0; k < rings; k++) {
    const t0 = k / rings;
    const t1 = (k + 1) / rings;
    const a0 = caveaA + (arenaA + 0.7 - caveaA) * t0;
    const b0 = caveaB + (arenaB + 0.7 - caveaB) * t0;
    const a1 = caveaA + (arenaA + 0.7 - caveaA) * t1;
    const b1 = caveaB + (arenaB + 0.7 - caveaB) * t1;
    const ySeat = yTopOuter + (yTopInner - yTopOuter) * t0;
    const stepCol = k % 2 === 0 ? TRAV_MID : TRAV;
    for (let i = 0; i < NS; i++) {
      if (i % 8 === 0) continue;
      const th2 = i * (TAU / NS);
      const am = (a0 + a1) / 2;
      const bm = (b0 + b1) / 2;
      const px = am * Math.cos(th2);
      const pz = bm * Math.sin(th2);
      const ry2 = Math.atan2(Math.cos(th2) / am, Math.sin(th2) / bm);
      const dsK = Math.hypot(am * Math.sin(th2), bm * Math.cos(th2)) * (TAU / NS);
      const ox = a0 * Math.cos(th2);
      const oz = b0 * Math.sin(th2);
      const ix = a1 * Math.cos(th2);
      const iz = b1 * Math.sin(th2);
      const depth = Math.max(0.55, Math.hypot(ox - ix, oz - iz));
      const h = ySeat - yArena;
      g.group({ x: px, y: 0, z: pz, ry: ry2 }, (g) => {
        g.box(dsK * 0.97, h, depth * 0.92, 0, yArena, 0, stepCol);
        g.box(dsK * 0.97, 0.16, 0.26, 0, ySeat - 0.16, -depth * 0.42, TRAV_HI);
      });
    }
  }

  // Podium wall around the arena.
  const na = 32;
  const pa = arenaA + 0.55;
  const pb = arenaB + 0.55;
  for (let i = 0; i < na; i++) {
    const th2 = (i + 0.5) * (TAU / na);
    const px = pa * Math.cos(th2);
    const pz = pb * Math.sin(th2);
    const ry2 = Math.atan2(Math.cos(th2) / pa, Math.sin(th2) / pb);
    const dsP = Math.hypot(pa * Math.sin(th2), pb * Math.cos(th2)) * (TAU / na);
    g.group({ x: px, y: 0, z: pz, ry: ry2 }, (g) => {
      g.box(dsP * 1.03, 1.9, 0.5, 0, yArena, -0.25, TRAV_MID);
      g.box(dsP * 1.06, 0.16, 0.62, 0, yArena + 1.9, -0.25, TRAV_HI);
    });
  }

  // Sand arena floor.
  const apts = [];
  for (let i = 0; i < 32; i++) { const th2 = i * TAU / 32; apts.push([arenaA * Math.cos(th2), arenaB * Math.sin(th2)]); }
  g.prism(apts, 0.5, yArena - 0.5, SAND);

  // Hypogeum: dark low walls in the +x half of the arena.
  for (let i = 0; i <= 4; i++) {
    const wx = i * 2.1;
    if (wx < arenaA * 0.85) g.box(0.16, 0.5, arenaB * 1.6, wx, yArena, arenaB * 0.1, SHADOW);
  }
  for (let j = -2; j <= 2; j++) {
    g.box(arenaA * 1.2, 0.5, 0.16, arenaA * 0.45, yArena, j * 1.5, SHADOW);
  }
  g.box(0.3, 0.55, arenaB * 1.8, 0, yArena, arenaB * 0.1, DARK_STONE);

  // Travertine plaza: base slab + elliptical ring band.
  g.box(72, SLAB_H, 60, 0, 0, 0, TRAV_BASE);
  const NR = 48;
  const prA = A + 2.2;
  const prB = B + 2.2;
  for (let i = 0; i < NR; i++) {
    const th2 = i * (TAU / NR);
    const px = prA * Math.cos(th2);
    const pz = prB * Math.sin(th2);
    const ry2 = Math.atan2(Math.cos(th2) / prA, Math.sin(th2) / prB);
    const dsR = Math.hypot(prA * Math.sin(th2), prB * Math.cos(th2)) * (TAU / NR);
    g.group({ x: px, y: 0, z: pz, ry: ry2 }, (g) => {
      g.box(dsR * 0.9, 0.12, 2.2, 0, SLAB_H, 0, TRAV);
    });
  }

  // Colossal statue on a plinth near the +z side.
  const cs = { x: 0, z: 27.7 };
  g.box(4.6, 1.5, 4.6, cs.x, SLAB_H, cs.z, TRAV_BASE);
  g.box(3.8, 0.3, 3.8, cs.x, SLAB_H + 1.5, cs.z, TRAV_HI);
  const sy = SLAB_H + 1.8;
  g.box(1.1, 2.1, 1.1, cs.x, sy, cs.z, STATUE);
  g.box(1.5, 1.4, 0.9, cs.x, sy + 2.1, cs.z, STATUE);
  g.sphere(0.5, cs.x, sy + 4.0, cs.z, STATUE, 8);
  g.box(0.4, 1.7, 0.4, cs.x - 0.85, sy + 2.1, cs.z, STATUE);
  g.box(0.4, 1.7, 0.4, cs.x + 0.85, sy + 2.1, cs.z + 0.55, STATUE);
  g.cyl(0.1, 0.14, 0.6, cs.x + 0.85, sy + 3.8, cs.z + 0.55, 0xd8a060, 6);

  // Meta Sudans cone fountain.
  const fx = -9;
  const fz = 27;
  g.cyl(2.2, 2.4, 0.6, fx, SLAB_H, fz, TRAV_MID, 10);
  g.cyl(1.5, 1.7, 0.5, fx, SLAB_H + 0.6, fz, TRAV, 10);
  g.cyl(1.35, 1.5, 0.3, fx, SLAB_H + 1.1, fz, WATER, 10);
  g.cone(1.1, 4.5, fx, SLAB_H + 1.1, fz, TRAV_HI, 10);
  g.cyl(0.5, 0.5, 0.15, fx, SLAB_H + 5.6, fz, WATER, 8);

  // Lamps flanking the ceremonial approach and around the plaza.
  function lamp(x, z) {
    g.box(0.3, 0.12, 0.3, x, SLAB_H, z, TRAV_BASE);
    g.cyl(0.06, 0.08, 1.8, x, SLAB_H + 0.12, z, TRAV_BASE, 5);
    g.box(0.4, 0.5, 0.4, x, SLAB_H + 1.9, z, TRAV);
    glass.box(0.3, 0.34, 0.3, x, SLAB_H + 1.9, z, LAMP_GLOW);
    g.cone(0.28, 0.3, x, SLAB_H + 2.35, z, TRAV, 4);
  }
  for (const sx of [-3.2, 3.2]) {
    for (const lz of [27.5, 28.7, 29.7]) lamp(sx, lz);
  }
  lamp(-18, 0);
  lamp(18, 0);
  lamp(0, -28);
  lamp(-12, -15);
  lamp(12, 15);

  const solid = g.build();
  solid.computeBoundingBox();
  return {
    solid,
    glass: glass.build(),
    name: '大斗兽场',
    radius: 36,
    height: solid.boundingBox.max.y,
  };
}
