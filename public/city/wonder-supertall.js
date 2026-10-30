import { createGeo } from './geo.js';

const TIERS = [
  { y0: 18, y1: 56, r: 16 },
  { y0: 56, y1: 88, r: 14 },
  { y0: 88, y1: 116, r: 12 },
  { y0: 116, y1: 140, r: 10 },
  { y0: 140, y1: 152, r: 7.5 },
];

export function buildSupertall() {
  const solid = createGeo();
  const glass = createGeo();

  const C = {
    plinth: 0x4c443b,
    step: 0x63584d,
    stepLight: 0x73675b,
    podium: 0x6e6358,
    podiumLight: 0x827568,
    core: 0x46505a,
    band: 0xe2e6e8,
    fin: 0xb8c0c7,
    crown: 0x8b9299,
    crownDark: 0x747b82,
    light: 0xffefbf,
    spire: 0xcbd2d8,
    spireBright: 0xe8edf1,
    canopy: 0x9aa1a7,
    glassMain: 0x7aa6c7,
    glassDark: 0x5883a8,
    flag: 0xb83b32,
    gold: 0xe3b34a,
  };

  const apothem = (r) => r * Math.cos(Math.PI / 8);
  const faceWidth = (r) => 2 * r * Math.sin(Math.PI / 8);

  const ring = (g, r, y, h, w, d, hex, out = 0) => {
    const ap = apothem(r) + out;
    for (let f = 0; f < 8; f++) {
      const a = Math.PI / 8 + (f * Math.PI) / 4;
      g.box(w, h, d, Math.sin(a) * ap, y, Math.cos(a) * ap, hex, { ry: a });
    }
  };

  const bands = (g, r, y, h, hex, d = 0.55, out = 0) => {
    ring(g, r, y, h, faceWidth(r), d, hex, out);
  };

  const mullions = (g, r, y, h, hex) => {
    const ap = apothem(r) + 0.02;
    const fw = faceWidth(r);
    for (let f = 0; f < 8; f++) {
      const a = Math.PI / 8 + (f * Math.PI) / 4;
      for (let k = -1; k <= 1; k++) {
        const t = k * fw * 0.27;
        g.box(
          0.38,
          h,
          0.5,
          Math.sin(a) * ap + Math.cos(a) * t,
          y,
          Math.cos(a) * ap - Math.sin(a) * t,
          hex,
          { ry: a },
        );
      }
    }
  };

  const corners = (g, r, y, h, hex) => {
    for (let f = 0; f < 8; f++) {
      const a = (f * Math.PI) / 4;
      g.box(0.9, h, 0.9, Math.sin(a) * r, y, Math.cos(a) * r, hex, { ry: a });
    }
  };

  solid.box(44, 1.2, 44, 0, 0, 0, C.plinth);
  for (let i = 0; i < 6; i++) {
    const s = 43 - i;
    solid.box(s, 0.65, s, 0, 1.2 + i * 0.65, 0, i % 2 ? C.step : C.stepLight);
  }

  solid.box(38, 10, 38, 0, 5.1, 0, C.podium);
  solid.box(38.8, 1, 38.8, 0, 15.1, 0, C.podiumLight);
  solid.box(36, 1.5, 36, 0, 16.1, 0, C.podiumLight);
  solid.box(26, 0.4, 26, 0, 17.6, 0, C.crownDark);

  for (const x of [-17, 17]) {
    for (const z of [-17, 17]) {
      solid.box(2.4, 10, 2.4, x, 5.1, z, C.podiumLight);
    }
  }

  for (let i = -4; i <= 4; i++) {
    const off = i * 4.1;
    solid.box(0.55, 10, 0.65, off, 5.1, 19.1, C.fin);
    solid.box(0.55, 10, 0.65, off, 5.1, -19.1, C.fin);
    solid.box(0.65, 10, 0.55, 19.1, 5.1, off, C.fin);
    solid.box(0.65, 10, 0.55, -19.1, 5.1, off, C.fin);
  }

  for (let y = 7.5; y < 15; y += 2.4) {
    solid.box(39, 0.45, 0.65, 0, y, 19.05, C.band);
    solid.box(39, 0.45, 0.65, 0, y, -19.05, C.band);
    solid.box(0.65, 0.45, 39, 19.05, y, 0, C.band);
    solid.box(0.65, 0.45, 39, -19.05, y, 0, C.band);
  }

  solid.box(39, 1.2, 0.7, 0, 16.1, 19.1, C.podiumLight);
  solid.box(39, 1.2, 0.7, 0, 16.1, -19.1, C.podiumLight);
  solid.box(0.7, 1.2, 39, 19.1, 16.1, 0, C.podiumLight);
  solid.box(0.7, 1.2, 39, -19.1, 16.1, 0, C.podiumLight);

  glass.box(22, 9, 0.8, 0, 5.1, 19.35, C.glassMain);
  glass.box(16, 5, 4, 0, 5.1, 21.5, C.glassDark);
  solid.box(24, 0.8, 8, 0, 14.1, 20.5, C.canopy);
  solid.box(0.8, 9, 0.8, -10.5, 5.1, 22.8, C.podiumLight);
  solid.box(0.8, 9, 0.8, 10.5, 5.1, 22.8, C.podiumLight);

  for (let ti = 0; ti < TIERS.length; ti++) {
    const { y0, y1, r } = TIERS[ti];
    const h = y1 - y0;

    solid.cyl(r - 1.1, r - 1.1, h, 0, y0, 0, C.core, 8);
    glass.cyl(r, r, h - 0.2, 0, y0 + 0.1, 0, ti % 2 ? C.glassDark : C.glassMain, 8, {
      ry: Math.PI / 8,
    });

    corners(solid, r + 0.04, y0, h, C.fin);
    mullions(solid, r, y0, h, C.fin);

    const levels = Math.floor(h / 4) + 1;
    for (let li = 0; li < levels; li++) {
      const y = y0 + li * 4;
      if (y > y1 - 1.2) continue;

      bands(solid, r, y, 0.45, C.band, 0.55, 0.03);
      if (li % 2 === 1) {
        bands(solid, r, y + 0.55, 0.28, C.crownDark, 1.15, 0.18);
      }
    }

    bands(solid, r, y1 - 0.5, 0.5, C.crownDark, 0.9, 0.1);
  }

  for (let i = 1; i < TIERS.length; i++) {
    const prev = TIERS[i - 1];
    const next = TIERS[i];

    solid.cyl(next.r + 0.9, prev.r + 0.9, 0.9, 0, next.y0 - 0.45, 0, C.band, 8);
    solid.cyl(next.r + 0.4, next.r + 0.4, 0.4, 0, next.y0 + 0.45, 0, C.crownDark, 8);
    ring(solid, prev.r + 0.7, next.y0 - 0.45, 0.45, faceWidth(prev.r + 0.7), 0.8, C.crownDark, 0.1);
  }

  solid.cyl(8.2, 8.2, 0.6, 0, 151.4, 0, C.crownDark, 8);
  for (let f = 0; f < 8; f++) {
    const a = (f * Math.PI) / 4;
    solid.box(1.3, 2.4, 1.3, Math.sin(a) * 7.2, 149.8, Math.cos(a) * 7.2, C.crown, { ry: a });
  }

  solid.cyl(1.5, 1.9, 5, 0, 152, 0, C.spire, 8);
  solid.cyl(0.9, 1.5, 5, 0, 157, 0, C.spire, 8);
  solid.cyl(0.55, 0.9, 5, 0, 162, 0, C.spireBright, 8);
  solid.cyl(0.22, 0.55, 5, 0, 167, 0, C.spireBright, 8);
  solid.sphere(0.3, 0, 171.7, 0, C.light, 8);

  for (let i = 0; i < 4; i++) {
    solid.group({ y: 152, ry: (i * Math.PI) / 2 }, (g) => {
      g.cyl(0.12, 0.18, 12, 0, 0, 5.4, C.spireBright, 6);
      g.box(3.2, 1, 0.08, 1.7, 9.6, 5.4, i % 2 ? C.flag : C.gold);
      g.sphere(0.22, 0, 12, 5.4, C.light, 6);
    });
  }

  return {
    solid: solid.build(),
    glass: glass.build(),
    name: '天穹塔',
    radius: 26,
    height: 172,
  };
}
