import { createGeo } from './geo.js';

const C = {
  steel: 0xc8ccd2,
  steelDark: 0x9aa4ad,
  steelBright: 0xe8ecef,
  fin: 0xd7dce0,
  finDark: 0x9aa4ad,
  glassMain: 0x5a8fb0,
  glassDark: 0x4a7c9c,
  glassLit: 0xa8d8e8,
  crown: 0xbcc3ca,
  crownDark: 0x8b9299,
  light: 0xffefbf,
  gold: 0xe3b34a,
  plinth: 0x4c443b,
  podium: 0x6e6358,
  podiumLight: 0x827568,
  podiumDark: 0x5c5348,
  stone: 0xa8a49a,
  stoneLight: 0xc9c5b9,
  stoneDark: 0x6d6a62,
  plaza: 0xcfc6b4,
  pavers: 0xc4b9a4,
  water: 0x3f7f9e,
  poolRim: 0x8a8578,
  trunk: 0x6b4f32,
  leaf: 0x4f7d3c,
  leaf2: 0x3e6230,
  red: 0xb83b32,
  bridge: 0x9aa4ad,
  frame: 0x6f6a60,
};

const STAR_INNER = 0.7071;
const star = (r, inner = STAR_INNER) => {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const rad = i % 2 === 0 ? r : r * inner;
    pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }
  return pts;
};

const TIERS = [
  { y0: 16, y1: 45, r: 9.5 },
  { y0: 45, y1: 72, r: 8.6 },
  { y0: 72, y1: 97, r: 7.7 },
  { y0: 97, y1: 119, r: 6.8 },
  { y0: 119, y1: 139, r: 5.9 },
  { y0: 139, y1: 157, r: 5.0 },
  { y0: 157, y1: 176, r: 4.2 },
];

export function buildSkylineTowers() {
  const solid = createGeo();
  const glass = createGeo();

  const strut = (g, x1, y1, x2, y2, w, d, hex) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const rz = Math.atan2(dx, dy);
    g.box(w, len, d, (x1 + x2) / 2, (y1 + y2) / 2, 0, hex, { rz });
  };

  // 8-point star tier: glass curtain skin, tip fins, circular notch lobes, stainless bands.
  const tier = (g, gg, y0, y1, r, bandEvery) => {
    const h = y1 - y0;
    gg.prism(star(r), h, y0, C.glassMain);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      g.box(0.5, h, 0.95, Math.sin(a) * (r - 0.05), y0, Math.cos(a) * (r - 0.05), C.fin, { ry: a });
      const na = a + Math.PI / 8;
      const lr = r * STAR_INNER + r * 0.1;
      g.cyl(r * 0.14 + 0.3, r * 0.14 + 0.3, h, Math.sin(na) * lr, y0, Math.cos(na) * lr, C.steelDark, 8);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + Math.PI / 16;
      g.box(0.24, h, 0.24, Math.sin(a) * r * 0.86, y0, Math.cos(a) * r * 0.86, C.fin, { ry: a });
    }
    for (let y = y0 + bandEvery; y < y1 - 0.8; y += bandEvery) {
      g.prism(star(r + 0.16), 0.5, y, C.steel);
      g.prism(star(r + 0.09), 0.26, y + 0.55, C.steelDark);
    }
    g.prism(star(r + 0.34), 0.6, y1 - 0.3, C.steelDark);
  };

  const crown = (g, gg, y0, r) => {
    g.prism(star(r + 0.6, 0.8), 1.2, y0, C.steelDark);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      g.sphere(0.28, Math.sin(a) * (r + 0.6), y0 + 0.6, Math.cos(a) * (r + 0.6), C.light, 6);
    }
    g.prism(star(r + 0.2, 0.78), 0.5, y0 + 1.2, C.steel);
    g.ring(r * 0.85, 0.24, 0, y0 + 1.9, 0, C.light, 12);
    gg.cyl(r * 0.5, r * 0.56, 4, 0, y0 + 2.1, 0, C.glassLit, 8);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      g.box(0.28, 4.6, 0.28, Math.sin(a) * r * 0.64, y0 + 2.1, Math.cos(a) * r * 0.64, C.fin, { ry: a });
    }
    g.ring(r * 0.64, 0.18, 0, y0 + 6.9, 0, C.light, 12);
    g.cyl(r * 0.5, r * 0.56, 2.2, 0, y0 + 7.2, 0, C.steel, 8);
    g.cyl(0.9, r * 0.5, 4, 0, y0 + 9.4, 0, C.steel, 8);
    for (let i = 0; i < 3; i++) g.ring(0.9 - i * 0.24, 0.14, 0, y0 + 9.9 + i * 1.3, 0, C.steelBright, 8);
    g.cyl(0.5, 0.9, 5, 0, y0 + 13.4, 0, C.steel, 8);
    g.cyl(0.26, 0.5, 5, 0, y0 + 18.4, 0, C.steelBright, 8);
    g.cyl(0.08, 0.26, 5, 0, y0 + 23.4, 0, C.steelBright, 8);
    g.sphere(0.4, 0, y0 + 28.6, 0, C.light, 8);
    g.cone(0.5, 1.4, 0, y0 + 28.8, 0, C.light, 8);
  };

  const tower = (tx) => {
    for (const t of TIERS) {
      solid.group({ x: tx }, (g) => glass.group({ x: tx }, (gg) => tier(g, gg, t.y0, t.y1, t.r, 3.6)));
    }
    solid.group({ x: tx }, (g) => glass.group({ x: tx }, (gg) => crown(g, gg, 176, TIERS[TIERS.length - 1].r)));
  };

  const annex = (x, z) => {
    const h = 54, r = 4.4, y0 = 16;
    solid.group({ x, z }, (g) => {
      glass.group({ x, z }, (gg) => gg.cyl(r, r, h, 0, y0, 0, C.glassDark, 8));
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        g.box(0.34, h, 0.6, Math.sin(a) * r, y0, Math.cos(a) * r, C.fin, { ry: a });
      }
      for (let y = y0 + 4; y < y0 + h - 2; y += 4) g.cyl(r + 0.15, r + 0.15, 0.45, 0, y, 0, C.steel, 8);
      g.cyl(r + 0.3, r + 0.3, 0.6, 0, y0 + h - 2, 0, C.steelDark, 8);
      g.cyl(r * 0.5, r, 2, 0, y0 + h, 0, C.crownDark, 8);
      g.cyl(0.5, r * 0.5, 4, 0, y0 + h + 2, 0, C.steel, 8);
      g.cone(0.6, 3, 0, y0 + h + 6, 0, C.steelBright, 8);
      g.sphere(0.3, 0, y0 + h + 9.2, 0, C.light, 6);
    });
  };

  const tree = (x, z, s = 1) => {
    const ty = 1.1 * s;
    solid.cyl(0.16 * s, 0.28 * s, ty, x, 0, z, C.trunk, 6);
    solid.cone(1.3 * s, 2.1 * s, x, ty + 0.9 * s, z, C.leaf, 7);
    solid.cone(0.95 * s, 1.8 * s, x, ty + 1.9 * s, z, C.leaf2, 7);
    solid.sphere(0.75 * s, x, ty + 2.5 * s, z, C.leaf, 8);
  };

  const lamp = (x, z, y = 0) => {
    solid.cyl(0.1, 0.16, 4.2, x, y, z, C.steelDark, 6);
    solid.box(0.16, 0.5, 0.16, x, y + 4.2, z, C.steelDark);
    glass.box(0.42, 0.7, 0.42, x, y + 4.7, z, C.glassLit);
    solid.cone(0.4, 0.5, x, y + 5.4, z, C.steelDark, 6);
  };

  const planter = (x, z) => {
    solid.cyl(0.85, 0.95, 0.55, x, 0, z, C.podiumDark, 8);
    solid.cyl(0.7, 0.7, 0.3, x, 0.55, z, C.leaf2, 8);
    solid.sphere(0.62, x, 1.05, z, C.leaf, 8);
  };

  const fountain = (x, z) => {
    solid.cyl(2.4, 2.8, 0.7, x, 0, z, C.poolRim, 10);
    solid.cyl(2.0, 2.0, 0.35, x, 0.7, z, C.water, 10);
    solid.cyl(0.4, 0.6, 1.2, x, 0.9, z, C.stoneLight, 8);
    solid.cone(0.9, 2.4, x, 2.1, z, C.stoneLight, 8);
    solid.sphere(0.34, x, 4.6, z, C.glassLit, 8);
  };

  const statue = (x, z, ry) => {
    solid.group({ x, z, ry }, (g) => {
      g.box(1.6, 1.1, 1.6, 0, 0, 0, C.stoneDark);
      g.box(1.3, 0.3, 1.3, 0, 1.1, 0, C.stoneLight);
      g.box(0.55, 3.2, 0.55, 0, 1.4, 0, C.stone);
      g.box(0.5, 1.4, 0.5, 0, 4.6, 0, C.stoneLight);
      g.cone(0.5, 1.1, 0, 6.0, 0, C.stoneLight, 4);
    });
  };

  const flag = (x, z, y = 0) => {
    solid.cyl(0.09, 0.12, 8, x, y, z, C.steelDark, 6);
    solid.box(2.2, 1.3, 0.06, x + 1.1, y + 6.4, z, C.red);
    solid.sphere(0.2, x, y + 8.1, z, C.gold, 6);
  };

  const balustrade = (g, x0, x1, z, y, step) => {
    for (let x = x0; x <= x1; x += step) g.box(0.26, 1.0, 0.26, x, y, z, C.stoneLight);
    g.box(x1 - x0 + 0.4, 0.16, 0.16, (x0 + x1) / 2, y + 0.82, z, C.stone);
    g.box(x1 - x0 + 0.4, 0.14, 0.14, (x0 + x1) / 2, y + 0.42, z, C.stone);
  };

  // --- Podium mall ---
  solid.box(48, 1, 30, 0, 0, -3, C.plinth);
  solid.box(42, 15, 26, 0, 1, -3, C.podium);
  for (let s = 1; s <= 4; s++) solid.box(42.4, 0.5, 26.4, 0, 1 + s * 3.6 - 0.3, -3, s % 2 ? C.podiumLight : C.podiumDark);
  solid.box(43, 0.8, 27, 0, 15.8, -3, C.podiumDark);
  for (const [px, pz] of [[-20, -15], [20, -15], [-20, 9], [20, 9]]) {
    solid.box(1.1, 15, 1.1, px, 1, pz, C.podiumLight);
  }
  for (let i = -8; i <= 8; i += 2) solid.box(0.6, 10, 0.6, i, 1, 10.1, C.podiumLight);

  // Curved glass front (bow toward +z) and curved canopy.
  {
    const cx = 0, cz = -6, r = 18, a0 = -0.55, a1 = 0.55, seg = 12;
    const da = (a1 - a0) / seg;
    for (let i = 0; i < seg; i++) {
      const a = a0 + da * (i + 0.5);
      const w = 2 * r * Math.sin(da / 2);
      glass.box(w, 12, 0.4, cx + Math.sin(a) * r, 2, cz + Math.cos(a) * r, i % 2 ? C.glassMain : C.glassDark, { ry: a });
      solid.box(w, 0.7, 1.2, cx + Math.sin(a) * r, 14.4, cz + Math.cos(a) * r, C.podiumDark, { ry: a });
    }
  }
  glass.box(8, 7, 0.5, 0, 2, 11.6, C.glassMain);

  // --- Ceremonial stair ---
  for (let i = 0; i < 8; i++) {
    const z = 22 - i * 1.1;
    solid.box(18 - i * 0.4, 0.24 + i * 0.2, 1.1, 0, i * 0.2, z, i % 2 ? C.stone : C.stoneLight);
  }
  solid.box(16, 0.4, 2.5, 0, 1.7, 12.6, C.stoneLight);
  balustrade(solid, -9, 9, 21.6, 0, 1.4);
  balustrade(solid, -9, 9, 21.6, 0, 1.4);

  // Entrance colonnade flanking the stair.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      solid.cyl(0.3, 0.34, 9, sx * 8.5, 0, 13 + i * 1.6, C.stoneLight, 8);
      solid.box(0.6, 0.4, 0.6, sx * 8.5, 9, 13 + i * 1.6, C.stone);
    }
  }

  // --- Grand plaza, reflecting pool, fountains ---
  solid.box(60, 0.4, 21, 0, 0, 22.5, C.plaza);
  for (let i = -28; i <= 28; i += 4) solid.box(0.35, 0.44, 21, i, 0, 22.5, C.pavers);
  for (let i = 14; i <= 32; i += 4) solid.box(60, 0.5, 0.35, 0, 0, i, C.pavers);

  // Reflecting pool on the axis.
  solid.box(15, 0.5, 9, 0, 0, 26, C.poolRim);
  solid.box(14, 0.42, 8, 0, 0.5, 26, C.water);
  solid.box(14.6, 0.18, 8.6, 0, 0.5, 26, C.poolRim);

  fountain(-14, 25);
  fountain(14, 25);

  // Flanking colonnades.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const z = 23 + i * 1.15;
      solid.cyl(0.28, 0.32, 8.5, sx * 11, 0, z, C.stoneLight, 8);
      solid.box(0.7, 0.42, 0.7, sx * 11, 8.5, z, C.stone);
      solid.box(0.24, 8.9, 0.24, sx * 11, 4.2, z, C.stoneDark);
    }
    solid.box(0.8, 0.5, 8.4, sx * 11, 9.0, 26.6, C.stone);
  }

  // Tree allees flanking the axis.
  for (const x of [-18, -26, 18, 26]) {
    for (let i = 0; i < 8; i++) tree(x, 16 + i * 2, x % 9 === 0 ? 1.1 : 0.95);
  }
  for (const x of [-22, 22]) {
    for (let i = 0; i < 6; i++) tree(x, 17 + i * 2.4, 0.85);
  }

  // Planters, lamps, statues, flags.
  for (const x of [-24, -20, -12, 12, 20, 24]) planter(x, 19.5);
  for (const x of [-24, -20, 20, 24]) lamp(x, 16.5, 0.4);
  for (const x of [-11, 11]) { lamp(x, 21, 0.4); lamp(x, 30.5, 0.4); }
  statue(-4.5, 31.5, Math.PI * 0.12);
  statue(4.5, 31.5, -Math.PI * 0.12);
  flag(-29, 27, 0.4);
  flag(29, 27, 0.4);

  // Plaza edge balustrade and edge lamps.
  balustrade(solid, -29, 29, 32.4, 0, 1.2);
  balustrade(solid, -29, 29, 32.4, 0, 1.2);
  for (const x of [-29, 29]) {
    for (let i = 0; i < 5; i++) lamp(x, 16 + i * 3.6, 0.4);
  }

  // Back garden beds.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 26;
      const z = sz * 24 - 5;
      solid.box(4.2, 0.5, 4.2, x, 0, z, C.stoneDark);
      solid.box(3.6, 0.22, 3.6, x, 0.5, z, C.leaf2);
      tree(x - 0.9, z - 0.9, 0.85);
      tree(x + 0.9, z + 0.7, 0.75);
    }
  }

  // --- Towers ---
  tower(-14);
  tower(14);

  // --- Skybridge at ~80 ---
  {
    const y = 80;
    solid.box(15, 0.6, 5.5, 0, y, 0, C.bridge);
    solid.box(15, 0.6, 5.5, 0, y + 4.2, 0, C.bridge);
    solid.box(15.4, 0.5, 5.9, 0, y + 4.4, 0, C.bridge);
    glass.box(15, 4.2, 0.35, 0, y + 0.3, 2.6, C.glassDark);
    glass.box(15, 4.2, 0.35, 0, y + 0.3, -2.6, C.glassDark);
    for (let i = -7; i <= 7; i += 2) {
      solid.box(0.22, 4.2, 0.5, i, y + 0.3, 2.6, C.fin);
      solid.box(0.22, 4.2, 0.5, i, y + 0.3, -2.6, C.fin);
    }
    strut(solid, 0, y, -6, 60, 0.6, 0.6, C.frame);
    strut(solid, 0, y, 6, 60, 0.6, 0.6, C.frame);
    solid.box(12, 0.5, 0.5, 0, 59.5, 0, C.frame);
  }

  // --- Annex towers ---
  annex(-23, -3);
  annex(23, -3);

  // Podium roof balustrade + garden.
  balustrade(solid, -21, 21, 13.2, 16, 1.2);
  balustrade(solid, -21, 21, 13.2, 16, 1.2);
  for (const x of [-18, -12, 12, 18]) {
    solid.box(2.2, 0.4, 2.2, x, 16, 9.5, C.stoneDark);
    tree(x, 9.5, 0.7);
  }

  return {
    solid: solid.build(),
    glass: glass.build(),
    name: '双子星塔',
    height: 205,
    radius: 34,
  };
}
