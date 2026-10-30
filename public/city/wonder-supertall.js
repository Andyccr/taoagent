import { createGeo } from './geo.js';

const WING_LEVELS = 6;
const LEVEL_H = 13;
const TOWER_BASE = 10;
const WING_ANGLES = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
const wingLen = (i) => 13 - i;

export function buildSupertall() {
  const solid = createGeo();
  const glass = createGeo();

  const C = {
    plinth: 0x574c42,
    podium: 0x6e6358,
    podiumLight: 0x7c7165,
    core: 0x4a5259,
    band: 0xdfe3e6,
    fin: 0xb9c0c6,
    green: 0x5c8a44,
    greenDark: 0x4d7c3a,
    crown: 0x8f959c,
    crownDark: 0x7a8087,
    light: 0xfff1c2,
    spire: 0xcfd4d9,
    spireBright: 0xe2e6ea,
    canopy: 0x9aa0a6,
    trunk: 0x7a5c3a,
    glassMain: 0x7fa6c4,
    glassDark: 0x5f86a6,
  };

  // ---- Podium ----
  solid.box(31, 1.5, 31, 0, 0, 0, C.plinth);
  solid.box(30, 10, 30, 0, 0, 0, C.podium);
  solid.box(30.8, 1.2, 30.8, 0, 10, 0, C.podiumLight);
  solid.box(1.2, 10, 1.2, 14, 0, 14, C.podiumLight);
  solid.box(1.2, 10, 1.2, -14, 0, 14, C.podiumLight);
  solid.box(1.2, 10, 1.2, 14, 0, -14, C.podiumLight);
  solid.box(1.2, 10, 1.2, -14, 0, -14, C.podiumLight);

  // ---- Entrance (+z): glass atrium + canopy ----
  glass.box(20, 10, 1.2, 0, 0, 15.2, C.glassDark);
  glass.box(16, 10, 6, 0, 10, 14, C.glassMain);
  solid.box(0.7, 10, 0.7, -6.5, 10, 18, C.podiumLight);
  solid.box(0.7, 10, 0.7, 6.5, 10, 18, C.podiumLight);
  solid.box(18, 0.8, 8, 0, 20, 15, C.canopy);

  // ---- Central hexagonal core ----
  solid.cyl(3.4, 4.2, 78, 0, TOWER_BASE, 0, C.core, 6);

  // ---- Y-shaped wings ----
  for (const ry of WING_ANGLES) {
    solid.group({ ry }, (g) => {
      for (let i = 0; i < WING_LEVELS; i++) {
        const base = TOWER_BASE + i * LEVEL_H;
        const L = wingLen(i);
        g.box(7.2, LEVEL_H, 0.5, 0, base, L - 0.25, C.fin);
        g.box(0.5, LEVEL_H, L, -3.5, base, L / 2, C.fin);
        g.box(0.5, LEVEL_H, L, 3.5, base, L / 2, C.fin);
        for (let fy = base; fy < base + LEVEL_H; fy += 4) {
          g.box(7.1, 0.6, L + 0.3, 0, fy, L / 2, C.band);
        }
        if (i === 1 || i === 3) {
          const top = base + LEVEL_H;
          g.box(7.6, 0.6, L + 1.4, 0, top, L / 2, C.crownDark);
          g.box(6.8, 1.0, L + 0.8, 0, top + 0.6, L / 2, C.green);
          g.cyl(0.25, 0.3, 1.6, -2.2, top + 1.6, L / 2, C.trunk, 6);
          g.cone(1.1, 2.6, -2.2, top + 1.6, L / 2, C.green, 6);
          g.cyl(0.25, 0.3, 1.6, 2.2, top + 1.6, L / 2, C.trunk, 6);
          g.cone(1.1, 2.6, 2.2, top + 1.6, L / 2, C.green, 6);
        }
      }
    });

    glass.group({ ry }, (g) => {
      for (let i = 0; i < WING_LEVELS; i++) {
        const base = TOWER_BASE + i * LEVEL_H;
        const L = wingLen(i);
        g.box(6.6, LEVEL_H - 0.3, L - 0.1, 0, base + 0.15, L / 2, i === 0 ? C.glassDark : C.glassMain);
      }
    });
  }

  // ---- Crown ----
  solid.box(10, 1, 10, 0, 88, 0, C.crownDark);
  solid.cyl(4.8, 5.4, 7, 0, 89, 0, C.crown, 8);
  solid.box(6, 0.6, 6, 0, 95.4, 0, C.crownDark);
  for (let i = 0; i < 12; i++) {
    solid.group({ y: 95.2, z: 5.4, ry: (i * Math.PI) / 6 }, (g) => {
      g.box(0.7, 0.5, 0.7, 0, 0, 0, C.light);
    });
  }

  // ---- Spire ----
  solid.cyl(0.9, 1.0, 7, 0, 96, 0, C.spire, 8);
  solid.cyl(0.6, 0.9, 7, 0, 103, 0, C.spire, 8);
  solid.cyl(0.3, 0.6, 7, 0, 110, 0, C.spireBright, 8);
  solid.cyl(0.15, 0.3, 3, 0, 117, 0, C.spireBright, 8);
  solid.sphere(0.35, 0, 120, 0, C.spireBright);

  return {
    solid: solid.build(),
    glass: glass.build(),
    name: '天穹塔',
    radius: 22,
    height: 120,
  };
}
