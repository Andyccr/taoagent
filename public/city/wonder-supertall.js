import { createGeo } from './geo.js';

const C = {
  pave: 0x8d8a80,
  pave2: 0xa29e93,
  plinth: 0x555d65,
  plinthLight: 0x6b747c,
  stone: 0xa8a49a,
  stoneLight: 0xc9c5b9,
  stoneDark: 0x6d6a62,
  metal: 0xb9c1c8,
  metalDark: 0x7b848c,
  fin: 0xd8dee3,
  core: 0x3d4750,
  band: 0xcdd4da,
  glassMain: 0x6fb4c9,
  glassDark: 0x3f7f9d,
  glassLit: 0xa9e6dc,
  glassWarm: 0xffd889,
  garden: 0x4d7a46,
  gardenDark: 0x355c34,
  tree: 0x437f3f,
  tree2: 0x569a4c,
  trunk: 0x5d4731,
  water: 0x74c2d6,
  bronze: 0x9a7b4f,
  bronzeDark: 0x6c5330,
  gold: 0xe8bd58,
  light: 0xffe7a6,
  red: 0xb23b32,
  spire: 0xc7d0d6,
  spireBright: 0xeff3f6,
};

const TY0 = [16, 33, 49, 64, 79, 93, 107, 120, 133, 145, 157, 168];
const TY1 = [33, 49, 64, 79, 93, 107, 120, 133, 145, 157, 168, 188];
const SC = [1, 0.93, 0.86, 0.79, 0.72, 0.65, 0.58, 0.51, 0.44, 0.37, 0.3, 0.23];

const roundSquare = (half, pow = 0.22, n = 32) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    pts.push([
      Math.sign(ca) * Math.pow(Math.abs(ca), pow) * half,
      Math.sign(sa) * Math.pow(Math.abs(sa), pow) * half,
    ]);
  }
  return pts;
};

export function buildSupertall() {
  const solid = createGeo();
  const glass = createGeo();

  const tree = (x, z, y, s = 1) => {
    solid.cyl(0.18 * s, 0.3 * s, 1.1 * s, x, y, z, C.trunk, 6);
    solid.cone(1.35 * s, 2.3 * s, x, y + 1.0 * s, z, C.tree, 6);
    solid.cone(0.95 * s, 1.9 * s, x, y + 2.1 * s, z, C.tree2, 6);
  };

  const lamp = (x, z, y) => {
    solid.cyl(0.11, 0.19, 4.1, x, y, z, C.metalDark, 6);
    solid.box(0.68, 0.16, 0.68, x, y + 4.1, z, C.metal, 4);
    glass.box(0.5, 0.72, 0.5, x, y + 4.26, z, C.glassLit);
    solid.sphere(0.24, x, y + 4.62, z, C.light, 6);
    solid.cone(0.46, 0.5, x, y + 4.82, z, C.metal, 4);
  };

  const statue = (x, z, y, ry) => {
    solid.group({ x, y, z, ry }, (g) => {
      g.box(1.7, 1.3, 1.7, 0, 0, 0, C.stoneDark);
      g.box(1.35, 0.35, 1.35, 0, 1.3, 0, C.stoneLight);
      g.box(0.45, 1.5, 0.38, -0.35, 1.65, 0, C.bronze);
      g.box(0.45, 1.5, 0.38, 0.35, 1.65, 0, C.bronze);
      g.box(1.0, 1.9, 0.55, 0, 3.15, 0, C.bronze);
      g.box(0.28, 1.7, 0.28, -0.72, 3.3, 0, C.bronze);
      g.box(0.28, 1.5, 0.28, 0.72, 3.4, 0, C.bronze);
      g.sphere(0.42, 0, 5.35, 0, C.bronze, 8);
      g.cyl(0.07, 0.1, 2.2, 0.76, 4.1, 0, C.bronzeDark, 6);
      g.sphere(0.3, 0.76, 6.35, 0, C.gold, 6);
      g.box(1.2, 0.16, 1.1, 0, 5.8, 0, C.gold);
    });
  };

  const flag = (x, z, y, ry) => {
    solid.group({ x, y, z, ry }, (g) => {
      g.cyl(0.1, 0.13, 9, 0, 0, 0, C.metalDark, 6);
      g.box(2.4, 3.2, 0.06, 1.2, 5.1, 0, C.red);
      g.box(2.4, 0.35, 0.08, 1.2, 8.0, 0, C.gold);
      g.sphere(0.22, 0, 9.05, 0, C.light, 6);
    });
  };

  const fountain = (x, z) => {
    const y = 1.6;
    solid.box(5.0, 0.55, 2.0, x, y, z, C.stone);
    solid.box(4.5, 0.22, 1.5, x, y + 0.55, z, C.stoneDark);
    glass.box(4.4, 0.18, 1.4, x, y + 0.72, z, C.water);
    for (const sx of [-1, 1]) {
      solid.box(0.22, 0.75, 2.0, x + sx * 2.4, y, z, C.stoneLight);
      solid.box(5.0, 0.75, 0.22, x, y, z + sx * 0.9, C.stoneLight);
    }
    solid.cyl(0.7, 0.95, 0.5, x, y + 0.6, z, C.stoneLight, 8);
    solid.cyl(0.12, 0.28, 1.9, x, y + 1.1, z, C.stoneLight, 6);
    solid.sphere(0.45, x, y + 3.15, z, C.water, 8);
    glass.cyl(0.1, 0.16, 2.0, x, y + 1.4, z, C.water, 6);
  };

  // --- Plaza paving and three stepped forecourt terraces ---
  solid.box(47, 0.4, 47, 0, 0, 0, C.pave);
  solid.box(46.2, 0.08, 46.2, 0, 0.4, 0, C.pave2);
  for (let i = -4; i <= 4; i++) {
    solid.box(0.35, 0.1, 25, i * 5.2, 0.44, 9.5, C.pave);
    solid.box(25, 0.1, 0.35, 9.5, 0.44, i * 5.2, C.pave);
  }

  solid.prism(roundSquare(22.0), 0.4, 0.4, C.plinth);
  solid.prism(roundSquare(21.2), 0.4, 0.8, C.plinthLight);
  solid.prism(roundSquare(20.4), 0.4, 1.2, C.stone);

  // Grand axial stair from the +z edge.
  for (let i = 0; i < 8; i++) {
    const z = 23.0 - i * 0.44;
    solid.box(9.6, 0.18 + i * 0.16, 0.46, 0, 0.4, z, i % 2 ? C.stone : C.stoneLight);
  }
  solid.box(10.6, 0.35, 0.55, 0, 0.4, 23.35, C.stoneLight);

  fountain(-9, 19.0);
  fountain(9, 19.0);

  // --- Plaza garden beds, trees, lamps, statues and banners ---
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 21.2;
      const z = sz * 21.2;
      solid.box(3.8, 0.5, 3.8, x, 0.4, z, C.stoneDark);
      solid.box(3.3, 0.22, 3.3, x, 0.9, z, C.gardenDark);
      tree(x - 0.85, z - 0.85, 1.05, 0.95);
      tree(x + 0.9, z + 0.7, 1.05, 0.8);
      if (sx * sz > 0) tree(x, z - 0.2, 1.05, 0.65);
    }
  }

  for (const [x, z] of [[-22, 0], [22, 0], [0, -22], [-22, -22], [22, -22]]) lamp(x, z, 0.4);
  for (const x of [-5.9, 5.9]) {
    lamp(x, 22.6, 0.4);
    lamp(x, 20.6, 1.6);
  }

  statue(-7.8, 22.0, 0.4, Math.PI * 0.08);
  statue(7.8, 22.0, 0.4, -Math.PI * 0.08);
  flag(-15.8, 22.6, 0.4, 0.12);
  flag(15.8, 22.6, 0.4, -0.12);

  for (const [x, z] of [[-18.5, 2.0], [-18.3, -4.0], [18.5, 2.0], [18.3, -4.0]]) {
    solid.box(1.6, 0.32, 1.6, x, 1.6, z, C.stoneDark);
    tree(x, z, 1.9, 0.55);
  }

  // --- Three-storey glass podium with silver colonnade ---
  solid.prism(roundSquare(17.8), 0.9, 1.6, C.metal);
  glass.prism(roundSquare(17.2), 3.4, 2.5, C.glassMain);
  solid.prism(roundSquare(17.8), 0.9, 5.9, C.metal);
  glass.prism(roundSquare(17.2), 3.4, 6.8, C.glassDark);
  solid.prism(roundSquare(17.8), 0.9, 10.2, C.metal);
  glass.prism(roundSquare(17.2), 3.4, 11.1, C.glassMain);
  solid.prism(roundSquare(17.9), 1.5, 14.5, C.stoneLight);

  const podiumPts = roundSquare(17.8, 0.22, 24);
  for (const [px, pz] of podiumPts) {
    solid.box(0.72, 14.4, 0.9, px, 1.6, pz, C.fin, { ry: Math.atan2(px, pz) });
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const px = Math.sin(a) * 18.0;
    const pz = Math.cos(a) * 18.0;
    solid.box(0.32, 0.4, 0.32, px, 14.8, pz, C.metalDark, { ry: a });
  }

  // Glass atrium and ceremonial portal on the +z face.
  glass.box(8.4, 7.6, 0.7, 0, 2.5, 17.95, C.glassLit);
  solid.box(0.7, 8.2, 0.9, -4.5, 1.6, 17.95, C.stoneLight);
  solid.box(0.7, 8.2, 0.9, 4.5, 1.6, 17.95, C.stoneLight);
  solid.box(9.7, 0.8, 0.95, 0, 9.8, 17.95, C.stoneLight);
  solid.arch(3.5, 0.75, 1.1, 0, 5.5, 18.02, C.stoneLight, 10);
  solid.box(13.5, 0.7, 4.0, 0, 11.0, 19.6, C.metal);
  solid.box(13.9, 0.35, 4.3, 0, 11.7, 19.6, C.fin);
  for (const sx of [-1, 1]) {
    for (const z of [18.2, 20.9]) {
      solid.cyl(0.34, 0.45, 9.4, sx * 5.9, 1.6, z, C.fin, 8);
    }
  }

  // Podium roof balustrade.
  const railPts = roundSquare(18.1, 0.22, 28);
  for (let i = 0; i < railPts.length; i++) {
    const [px, pz] = railPts[i];
    solid.box(0.3, 1.05, 0.3, px, 16.0, pz, C.stoneLight);
    const n = railPts[(i + 1) % railPts.length];
    const mx = (px + n[0]) / 2;
    const mz = (pz + n[1]) / 2;
    const len = Math.hypot(n[0] - px, n[1] - pz);
    solid.box(0.28, 0.16, len + 0.1, mx, 17.0, mz, C.metal, { ry: Math.atan2(n[0] - px, n[1] - pz) });
  }

  // --- Trefoil twisting tower: 12 stepped sections and 11 sky-garden terraces ---
  for (let ti = 0; ti < TY0.length; ti++) {
    const y0 = TY0[ti];
    const y1 = TY1[ti];
    const h = y1 - y0;
    const s = SC[ti];
    const r = 8.0 * s;
    const d = 7.0 * s;
    const rot = (ti * 8 * Math.PI) / 180;
    const glassHex = ti % 2 ? C.glassDark : C.glassMain;

    solid.cyl(4.6 * s, 5.0 * s, h, 0, y0, 0, C.core, 8);

    for (let k = 0; k < 3; k++) {
      const a = rot + (k * Math.PI * 2) / 3;
      const cx = Math.sin(a) * d;
      const cz = Math.cos(a) * d;

      glass.cyl(r, r, h - 1.0, cx, y0 + 0.5, cz, glassHex, 12);

      const floors = Math.max(3, Math.floor((h - 1.4) / 4.2) + 1);
      for (let f = 0; f < floors; f++) {
        const yf = y0 + 0.6 + f * 4.2;
        if (yf > y1 - 1.2) break;
        solid.cyl(r + 0.36, r + 0.36, 0.46, cx, yf, cz, C.band, 12);
      }

      for (let m = 0; m < 8; m++) {
        const ma = a + (m * Math.PI) / 4;
        solid.box(0.22, h - 1.0, 0.36, cx + Math.sin(ma) * (r + 0.08), y0 + 0.5, cz + Math.cos(ma) * (r + 0.08), C.fin, { ry: ma });
      }
      for (const off of [0, Math.PI * 0.62]) {
        const fa = a + off;
        solid.box(0.55, h, 1.35, cx + Math.sin(fa) * (r + 0.45), y0, cz + Math.cos(fa) * (r + 0.45), C.fin, { ry: fa });
      }
      solid.cyl(r + 0.72, r + 0.72, 0.6, cx, y1 - 0.6, cz, C.metal, 12);
    }

    if (ti < TY0.length - 1) {
      const nr = r;
      for (let k = 0; k < 3; k++) {
        const a = rot + (k * Math.PI * 2) / 3;
        const cx = Math.sin(a) * d;
        const cz = Math.cos(a) * d;
        solid.cyl(nr + 0.8, nr + 0.8, 0.5, cx, y1, cz, C.band, 12);
        solid.cyl(nr * 0.8, nr * 0.8, 0.42, cx, y1 + 0.5, cz, ti % 3 === 2 ? C.gardenDark : C.garden, 10);
        glass.cyl(nr + 0.62, nr + 0.62, 1.0, cx, y1 + 0.5, cz, C.glassLit, 12);
        for (let t = 0; t < 2; t++) {
          const ta = a + Math.PI * 0.4 + t * Math.PI * 0.7;
          tree(cx + Math.sin(ta) * nr * 0.56, cz + Math.cos(ta) * nr * 0.56, y1 + 0.9, 0.42 + ti * 0.008);
        }
      }
      solid.cyl(5.2 * s, 5.8 * s, 1.0, 0, y1 - 0.4, 0, ti === 8 ? C.gold : C.metal, 10);
    }
  }

  // --- Crown: lit lattice drum, upper lantern and stepped spire ---
  solid.cyl(6.2, 6.8, 1.4, 0, 187.6, 0, C.metal, 12);
  solid.cyl(6.4, 6.4, 0.8, 0, 189.0, 0, C.stoneLight, 12);
  glass.cyl(4.8, 5.35, 19.0, 0, 189.8, 0, C.glassLit, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    solid.box(0.34, 19.0, 0.55, Math.sin(a) * 5.05, 189.8, Math.cos(a) * 5.05, C.fin, { ry: a });
    if (i % 2 === 0) solid.sphere(0.27, Math.sin(a) * 5.3, 208.4, Math.cos(a) * 5.3, C.light, 6);
  }
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    solid.box(0.55, 20.0, 1.35, Math.sin(a) * 5.6, 189.6, Math.cos(a) * 5.6, C.fin, { ry: a });
  }
  for (const y of [193, 196.6, 200.2, 203.8, 207.4]) {
    solid.cyl(5.45, 5.45, 0.34, 0, y, 0, C.metal, 12);
  }
  solid.cyl(5.8, 5.8, 0.9, 0, 208.8, 0, C.metal, 12);
  glass.cyl(2.9, 3.5, 7.0, 0, 209.7, 0, C.glassWarm, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    solid.box(0.26, 7.0, 0.44, Math.sin(a) * 3.25, 209.7, Math.cos(a) * 3.25, C.fin, { ry: a });
  }
  solid.cyl(3.6, 3.6, 0.7, 0, 216.7, 0, C.metal, 12);
  solid.cyl(1.3, 2.2, 4.0, 0, 217.4, 0, C.spire, 8);
  solid.cyl(0.95, 1.3, 4.0, 0, 221.4, 0, C.spire, 8);
  solid.cyl(0.6, 0.95, 4.0, 0, 225.4, 0, C.spireBright, 8);
  solid.cyl(0.3, 0.6, 3.4, 0, 229.4, 0, C.spireBright, 8);
  solid.cone(0.32, 2.2, 0, 232.8, 0, C.spireBright, 8);
  solid.sphere(0.34, 0, 234.2, 0, C.light, 8);
  for (const [y, rr] of [[218.5, 1.55], [222.5, 1.2], [226.5, 0.9]]) {
    glass.cyl(rr, rr, 0.6, 0, y, 0, C.glassWarm, 8);
  }

  return {
    solid: solid.build(),
    glass: glass.build(),
    name: '天穹塔',
    height: 235,
    radius: 23.5,
  };
}
