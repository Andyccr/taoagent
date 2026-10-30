import { createGeo } from './geo.js';

const TRAV = 0xd9cdb0;
const TRAV_MID = 0xcbbd9c;
const TRAV_BASE = 0xa89878;
const TRAV_HI = 0xe6dcc4;
const VOID = 0x5e5548;
const SAND = 0xd8c08a;
const HYPO = 0x8f8068;
const DARK_STONE = 0x6f6555;
const MAST = 0xb8a888;
const FLAG = 0x9a3f32;

export function buildColosseum() {
  const g = createGeo();
  const A = 27;
  const B = 22;
  const N = 48;
  const TAU = Math.PI * 2;
  const dth = TAU / N;
  const BASE_H = 1.2;
  const TIER_H = 6.2;
  const ATTIC_H = 5.2;
  const WALL_D = 2.4;
  const CH = 0.36;
  const tiers = 3;
  const tierCol = [TRAV_MID, TRAV, TRAV];
  const archCol = [TRAV_HI, TRAV_HI, TRAV_HI];

  for (let i = 0; i < N; i++) {
    const th = i * dth;
    const cx = A * Math.cos(th);
    const cz = B * Math.sin(th);
    const ry = Math.atan2(Math.cos(th) / A, Math.sin(th) / B);
    const ds = Math.sqrt(A * A * Math.sin(th) * Math.sin(th) + B * B * Math.cos(th) * Math.cos(th)) * dth;
    const gate = i % 12 === 0;

    g.group({ x: cx, y: 0, z: cz, ry }, (g) => {
      g.box(ds * 1.05, BASE_H, WALL_D + 0.9, 0, 0, -WALL_D / 2 + 0.3, TRAV_BASE);
      g.box(ds * 1.02, 0.18, WALL_D + 0.5, 0, BASE_H - 0.18, -WALL_D / 2 + 0.2, TRAV_HI);

      for (let t = 0; t < tiers; t++) {
        const y0 = BASE_H + t * TIER_H;
        const col = tierCol[t];
        const ow = gate ? ds * 0.66 : ds * 0.5;
        const r = ow / 2;
        const spring = y0 + (gate ? (t === 0 ? 4.2 : 3.6) : 3.1 + t * 0.12);
        const pierW = (ds - ow) / 2;
        const top = y0 + TIER_H - CH;

        g.box(pierW, TIER_H - CH, WALL_D, -ds / 2 + pierW / 2, y0, -WALL_D / 2, col);
        g.box(pierW, TIER_H - CH, WALL_D, ds / 2 - pierW / 2, y0, -WALL_D / 2, col);

        const spH = top - (spring + r);
        if (spH > 0.05) g.box(ow, spH, WALL_D, 0, spring + r, -WALL_D / 2, col);

        g.arch(r, 0.2, WALL_D + 0.25, 0, spring, -WALL_D / 2 + 0.12, archCol[t], 3);

        const px = ds / 2 - pierW / 2;
        g.box(0.26, TIER_H - CH - 0.3, 0.22, -px, y0 + 0.15, 0.05, TRAV_HI);
        g.box(0.26, TIER_H - CH - 0.3, 0.22, px, y0 + 0.15, 0.05, TRAV_HI);

        g.box(ds * 1.06, CH, WALL_D + 0.6, 0, top, -WALL_D / 2 + 0.2, TRAV_HI);

        if (gate && t === 0) {
          g.box(ow * 1.04, spring * 0.9, 7.5, 0, 0.02, -WALL_D - 3.75, VOID);
          g.box(ow * 0.42, 0.5, 0.55, 0, spring * 0.9, -WALL_D - 0.1, TRAV_HI);
        }
      }

      const ay = BASE_H + tiers * TIER_H;
      const ach = 0.38;
      const aw = ATTIC_H - ach;
      const apx = ds / 2 - 0.22;

      g.box(ds, aw, WALL_D, 0, ay, -WALL_D / 2, TRAV_MID);
      g.box(0.3, aw, 0.22, -apx, ay, 0.05, TRAV);
      g.box(0.3, aw, 0.22, apx, ay, 0.05, TRAV);
      g.box(ds * 0.22, 1.35, 0.16, 0, ay + aw * 0.45, 0.04, VOID);
      g.box(ds * 1.06, ach, WALL_D + 0.7, 0, ay + aw, -WALL_D / 2 + 0.22, TRAV_HI);

      for (let c = -1; c <= 1; c += 2) {
        g.box(0.24, 0.55, 0.55, c * ds * 0.26, ay + aw - 0.55, 0.1, TRAV_BASE);
      }

      if (i % 3 === 0) {
        const my = ay + aw + ach;
        g.cyl(0.05, 0.075, 3.9, 0, my, -0.2, MAST, 5);
        g.cone(0.13, 1, 0, my + 3.9, -0.2, TRAV_HI, 5);
        g.box(0.34, 0.42, 0.035, 0.17, my + 3.1, -0.2, FLAG);
      }

      if (!gate) {
        g.box(ds * 0.96, BASE_H + tiers * TIER_H, 0.4, 0, 0, -WALL_D - 0.8, VOID);
      }
    });
  }

  const rings = 6;
  const NS = 24;
  const arenaA = 12;
  const arenaB = 8;
  const caveaA = 23.2;
  const caveaB = 18.2;
  const yBase = 0.8;
  const yTopOuter = 12.8;
  const yTopInner = 2.2;
  const dthS = TAU / NS;

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
      if (i % 6 === 0) continue;
      const th = i * dthS;
      const am = (a0 + a1) / 2;
      const bm = (b0 + b1) / 2;
      const px = am * Math.cos(th);
      const pz = bm * Math.sin(th);
      const ry = Math.atan2(Math.cos(th) / am, Math.sin(th) / bm);
      const dsK = Math.sqrt(am * am * Math.sin(th) * Math.sin(th) + bm * bm * Math.cos(th) * Math.cos(th)) * dthS;
      const ox = a0 * Math.cos(th);
      const oz = b0 * Math.sin(th);
      const ix = a1 * Math.cos(th);
      const iz = b1 * Math.sin(th);
      const depth = Math.max(0.55, Math.hypot(ox - ix, oz - iz));
      const h = ySeat - yBase;

      g.group({ x: px, y: 0, z: pz, ry }, (g) => {
        g.box(dsK * 0.96, h, depth * 0.92, 0, yBase, 0, stepCol);
        g.box(dsK * 0.96, 0.15, 0.22, 0, ySeat - 0.15, -depth * 0.45, TRAV_HI);
      });
    }
  }

  const na = 32;
  const pa = arenaA + 0.55;
  const pb = arenaB + 0.55;
  const dthP = TAU / na;

  for (let i = 0; i < na; i++) {
    const th = (i + 0.5) * dthP;
    const px = pa * Math.cos(th);
    const pz = pb * Math.sin(th);
    const ry = Math.atan2(Math.cos(th) / pa, Math.sin(th) / pb);
    const dsP = Math.sqrt(pa * pa * Math.sin(th) * Math.sin(th) + pb * pb * Math.cos(th) * Math.cos(th)) * dthP;

    g.group({ x: px, y: 0, z: pz, ry }, (g) => {
      g.box(dsP * 1.02, 1.6, 0.55, 0, 0, -0.28, TRAV_BASE);
      g.box(dsP * 1.04, 0.18, 0.68, 0, 1.6, -0.28, TRAV_HI);
    });
  }

  const apts = [];
  for (let i = 0; i < 28; i++) {
    const th = (i / 28) * TAU;
    apts.push([arenaA * Math.cos(th), arenaB * Math.sin(th)]);
  }
  g.prism(apts, 0.45, 0, SAND);

  for (let i = -2; i <= 2; i++) {
    g.box(0.16, 0.5, arenaB * 1.55, i * 2, 0.45, 0, HYPO);
    g.box(arenaA * 1.55, 0.5, 0.16, 0, 0.45, i * 1.4, HYPO);
  }
  g.box(0.28, 0.6, arenaB * 1.75, 0, 0.45, 0, DARK_STONE);

  for (let p = 0; p < 4; p++) {
    const th = p * Math.PI / 2;
    const px = (arenaA + 0.9) * Math.cos(th);
    const pz = (arenaB + 0.9) * Math.sin(th);
    const ry = Math.atan2(Math.cos(th) / (arenaA + 0.9), Math.sin(th) / (arenaB + 0.9));

    g.group({ x: px, y: 0, z: pz, ry }, (g) => {
      g.box(2.4, 1.2, 0.5, 0, 0.45, -0.25, VOID);
    });
  }

  const solid = g.build();
  solid.computeBoundingBox();
  return { solid, glass: null, name: '大斗兽场', radius: 28.5, height: solid.boundingBox.max.y };
}
