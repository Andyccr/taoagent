import { createGeo } from './geo.js';

const TRAV = 0xd9cdb0;
const TRAV_MID = 0xcbbd9c;
const TRAV_BASE = 0xa89878;
const TRAV_HI = 0xe6dcc4;
const VOID = 0x6d6252;
const SAND = 0xd8c08a;
const HYPO = 0x9a8a70;
const DARK_STONE = 0x7a6f5c;
const MAST = 0xb8a888;

export function buildColosseum() {
  const g = createGeo();
  const A = 18;
  const B = 15;
  const N = 40;
  const TAU = Math.PI * 2;
  const dth = TAU / N;
  const TIER_H = 4.6;
  const ATTIC_H = 3.2;
  const WALL_D = 2.0;
  const tiers = 3;
  const CH = 0.3;
  const tierCol = [TRAV_MID, TRAV, TRAV];
  const archCol = [TRAV, TRAV_HI, TRAV_HI];

  for (let i = 0; i < N; i++) {
    const th = i * dth;
    const cx = A * Math.cos(th);
    const cz = B * Math.sin(th);
    const ry = Math.atan2(Math.cos(th) / A, Math.sin(th) / B);
    const ds = Math.sqrt(A * A * Math.sin(th) * Math.sin(th) + B * B * Math.cos(th) * Math.cos(th)) * dth;
    const gate = i % 10 === 0;

    g.group({ x: cx, y: 0, z: cz, ry }, (g) => {
      g.box(ds * 1.04, 0.5, WALL_D + 0.45, 0, 0, -WALL_D / 2 + 0.1, TRAV_BASE);

      for (let t = 0; t < tiers; t++) {
        const y0 = t * TIER_H;
        const col = tierCol[t];
        const ow = gate ? ds * 0.58 : ds * 0.44;
        const r = ow / 2;
        const spring = y0 + (gate ? (t === 0 ? 3.1 : 2.7) : 2.45);
        const pierW = (ds - ow) / 2;
        const top = y0 + TIER_H - CH;

        g.box(pierW, TIER_H - CH, WALL_D, -ds / 2 + pierW / 2, y0, -WALL_D / 2, col);
        g.box(pierW, TIER_H - CH, WALL_D, ds / 2 - pierW / 2, y0, -WALL_D / 2, col);

        const spH = top - (spring + r);
        if (spH > 0.05) g.box(ow, spH, WALL_D, 0, spring + r, -WALL_D / 2, col);

        const voidH = spring + r * 0.8 - y0;
        g.box(ow * 0.96, voidH, WALL_D * 0.5, 0, y0 + 0.02, -WALL_D * 0.85, VOID);

        g.arch(r, 0.2, WALL_D + 0.2, 0, spring, -WALL_D / 2 + 0.08, archCol[t], 6);

        const cr = gate ? 0.24 : 0.2;
        g.cyl(cr, cr * 1.05, TIER_H - CH - 0.55, ds / 2, y0 + 0.28, -cr * 0.25, TRAV_HI, 6);
        g.box(cr * 2.6, 0.16, cr * 2.2, ds / 2, y0 + 0.1, -cr * 0.15, TRAV_BASE);
        g.box(cr * 2.8, 0.18, cr * 2.4, ds / 2, y0 + TIER_H - CH - 0.3, -cr * 0.15, TRAV_HI);

        g.box(ds * 1.05, CH, WALL_D + 0.55, 0, y0 + TIER_H - CH, -WALL_D / 2 + 0.15, TRAV_HI);

        if (gate && t === 0) {
          g.box(ow * 1.05, spring * 0.9, 7, 0, 0.02, -WALL_D - 3.2, VOID);
          g.box(ow * 1.05, 0.12, 7, 0, 0.02, -WALL_D - 3.2, DARK_STONE);
        }
      }

      const ay = tiers * TIER_H;
      const ach = 0.32;
      const aw = ATTIC_H - ach;
      g.box(ds, aw, WALL_D, 0, ay, -WALL_D / 2, TRAV_MID);
      g.box(0.32, aw, 0.18, -ds / 2 + 0.22, ay, 0.04, TRAV);
      g.box(0.32, aw, 0.18, ds / 2 - 0.22, ay, 0.04, TRAV);

      g.box(0.55, 0.65, 0.42, 0, ay + 1.55, -0.16, VOID);
      g.box(0.78, 0.12, 0.38, 0, ay + 1.43, 0.04, TRAV_HI);

      for (let c = -1; c <= 1; c++) {
        g.box(0.2, 0.38, 0.52, c * ds * 0.22, ay + aw - 0.75, 0.08, TRAV_BASE);
      }

      g.box(ds * 1.06, ach, WALL_D + 0.65, 0, ay + aw, -WALL_D / 2 + 0.18, TRAV_HI);
      g.box(ds, 0.32, 0.28, 0, ay + ATTIC_H, -0.16, TRAV_MID);

      if (i % 2 === 0) {
        g.cyl(0.05, 0.07, 2.5, 0, ay + ATTIC_H + 0.32, -0.16, MAST, 5);
        g.sphere(0.09, 0, ay + ATTIC_H + 2.85, -0.16, TRAV_HI, 6);
      }
    });
  }

  const rings = 6;
  const arenaA = 8;
  const arenaB = 5.5;
  const outerA = 15.3;
  const outerB = 12.3;
  const yBase = 0.65;

  for (let k = 0; k < rings; k++) {
    const t0 = k / rings;
    const t1 = (k + 1) / rings;
    const a0 = outerA + (arenaA + 0.5 - outerA) * t0;
    const b0 = outerB + (arenaB + 0.5 - outerB) * t0;
    const a1 = outerA + (arenaA + 0.5 - outerA) * t1;
    const b1 = outerB + (arenaB + 0.5 - outerB) * t1;
    const ySeat = 9.2 + (1.45 - 9.2) * t0;
    const stepCol = k % 2 === 0 ? TRAV_MID : TRAV;

    for (let i = 0; i < N; i++) {
      if (i % 10 === 0) continue;
      const th = i * dth;
      const am = (a0 + a1) / 2;
      const bm = (b0 + b1) / 2;
      const px = am * Math.cos(th);
      const pz = bm * Math.sin(th);
      const ry = Math.atan2(Math.cos(th) / am, Math.sin(th) / bm);
      const dsK = Math.sqrt(am * am * Math.sin(th) * Math.sin(th) + bm * bm * Math.cos(th) * Math.cos(th)) * dth;
      const ox = a0 * Math.cos(th);
      const oz = b0 * Math.sin(th);
      const ix = a1 * Math.cos(th);
      const iz = b1 * Math.sin(th);
      const depth = Math.max(0.55, Math.hypot(ox - ix, oz - iz));
      const h = ySeat - yBase;

      g.group({ x: px, y: 0, z: pz, ry }, (g) => {
        g.box(dsK * 0.96, h, depth * 0.9, 0, yBase, 0, stepCol);
        g.box(dsK * 0.96, 0.14, 0.22, 0, ySeat - 0.14, -depth * 0.45, TRAV_HI);
      });
    }
  }

  for (let p = 0; p < 4; p++) {
    const th = p * Math.PI / 2;
    const am = 15.0;
    const bm = 12.4;
    g.group({ x: am * Math.cos(th), y: 0, z: bm * Math.sin(th), ry: Math.atan2(Math.cos(th) / am, Math.sin(th) / bm) }, (g) => {
      g.box(2.4, 3.3, 5.2, 0, 0, 0, VOID);
      g.box(2.4, 0.12, 5.2, 0, 0, 0, DARK_STONE);
    });
  }

  const apts = [];
  for (let i = 0; i < 22; i++) {
    const th = (i / 22) * TAU;
    apts.push([arenaA * Math.cos(th), arenaB * Math.sin(th)]);
  }
  g.prism(apts, 0.4, 0, SAND);

  const na = 28;
  const ea = arenaA + 0.45;
  const eb = arenaB + 0.45;
  for (let i = 0; i < na; i++) {
    const th = (i + 0.5) / na * TAU;
    const px = ea * Math.cos(th);
    const pz = eb * Math.sin(th);
    const ry = Math.atan2(Math.cos(th) / ea, Math.sin(th) / eb);
    const dsA = Math.sqrt(ea * ea * Math.sin(th) * Math.sin(th) + eb * eb * Math.cos(th) * Math.cos(th)) * (TAU / na);
    g.group({ x: px, y: 0, z: pz, ry }, (g) => {
      g.box(dsA, 1.15, 0.45, 0, 0, -0.22, TRAV_BASE);
    });
  }

  for (let i = -2; i <= 2; i++) {
    g.box(0.14, 0.1, arenaB * 1.7, i * 2.35, 0.4, 0, HYPO);
    g.box(arenaA * 1.7, 0.1, 0.14, 0, 0.4, i * 1.5, HYPO);
  }
  g.box(0.22, 0.13, arenaB * 1.85, 0, 0.4, 0, DARK_STONE);

  const solid = g.build();
  solid.computeBoundingBox();
  return { solid, glass: null, name: '大斗兽场', radius: 18.7, height: solid.boundingBox.max.y };
}
