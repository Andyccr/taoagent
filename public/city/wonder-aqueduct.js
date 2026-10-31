import { createGeo } from './geo.js';

const A = 0xd2c29c;
const B = 0xc8b68e;
const C = 0xbfae86;
const HI = 0xdfd2ae;
const DK = 0x9a8a6c;
const WATER = 0x6f9bb3;
const ROCK = 0x8f8a7c;
const ROCK_DK = 0x7a7568;
const SOIL = 0x8a7a5e;
const CYPRESS = 0x2f4a33;
const CYPRESS_DK = 0x253c29;
const TRUNK = 0x5a4632;
const IRON = 0x47423c;
const TUNIC = 0x8a4a3a;
const SKIN = 0xd9b48c;

export function buildGreatAqueduct() {
  const g = createGeo();
  const L = 150;
  const Z0 = -L / 2;
  const WALL = 6;
  const HX = WALL / 2;

  const tiers = [
    { n: 6, pier: 5, t: 1.1, base: 0, top: 16, spring: 5, seg: 12 },
    { n: 10, pier: 3, t: 0.9, base: 16, top: 28, spring: 18, seg: 9 },
    { n: 20, pier: 1.5, t: 0.6, base: 28, top: 34, spring: 29, seg: 6 },
  ];

  g.box(9, 0.7, L + 2, 0, 0, 0, DK);

  tiers.forEach((T, ti) => {
    const bay = L / T.n;
    const span = bay - T.pier;
    const r = span / 2;
    const archCol = ti === 1 ? B : HI;
    for (let i = 0; i <= T.n; i++) {
      const zc = Z0 + i * bay;
      g.box(WALL, T.top - T.base, T.pier, 0, T.base, zc, [A, B, C][i % 3]);
      if (ti < 2) g.box(WALL + 0.4, 0.5, T.pier + 0.5, 0, T.spring, zc, HI);
    }
    for (let i = 0; i < T.n; i++) {
      const zc = Z0 + (i + 0.5) * bay;
      g.arch(r, T.t, WALL, 0, T.spring, zc, archCol, T.seg, { ry: Math.PI / 2 });
      if (ti < 2) g.arch(r + 0.12, 0.14, WALL + 0.15, 0, T.spring, zc, HI, T.seg, { ry: Math.PI / 2 });
      if (ti < 2) g.box(WALL + 0.2, 1.0, T.t + 0.4, 0, T.spring + r - 0.4, zc, DK);
    }
    g.box(WALL, T.top - (T.spring + r), L, 0, T.spring + r, 0, ti === 0 ? B : ti === 1 ? C : B);
    g.box(WALL + 0.7, 0.5, L + 1.6, 0, T.top - 0.5, 0, HI);
  });

  // cutwater buttresses at the base of bottom piers
  for (let i = 0; i <= 6; i++) {
    const zc = Z0 + i * 25;
    g.prism([[HX, zc - 2.4], [8.4, zc], [HX, zc + 2.4]], 4.6, 0, C);
    g.prism([[-HX, zc - 2.4], [-8.4, zc], [-HX, zc + 2.4]], 4.6, 0, C);
  }

  // stone river / valley bed under the middle
  g.box(18, 0.4, 16, 0, -0.4, 0, ROCK_DK);
  g.box(14, 0.2, 12, 0, -0.1, 0, WATER);
  g.box(18, 0.9, 1.4, 0, -0.2, -7.2, ROCK);
  g.box(18, 0.9, 1.4, 0, -0.2, 7.2, ROCK);

  const rocks = [
    [-7.5, -6, 0.7], [-8, -2, 0.9], [-7, 4, 0.6], [-8.2, 1, 0.5], [-7.5, -8, 0.7],
    [7.5, -6, 0.7], [8, -2, 0.9], [7, 4, 0.6], [8.2, 1, 0.5], [7.5, -8, 0.7],
    [-6.5, 7, 0.5], [6.5, 7, 0.5], [-6.5, -7, 0.5], [6.5, -7, 0.5], [-8, 6, 0.4], [8, 6, 0.4],
  ];
  for (const [rx, rz, s] of rocks) g.sphere(s, rx, -0.1, rz, ROCK, 7);

  // covered water channel (specus) on top
  const SY = 34;
  g.box(WALL + 0.4, 0.6, L, 0, SY, 0, A);
  g.box(0.5, 1.8, L, -1.6, SY + 0.6, 0, B);
  g.box(0.5, 1.8, L, 1.6, SY + 0.6, 0, B);
  g.box(2.4, 0.3, L, 0, SY + 1.1, 0, WATER);
  g.box(WALL + 0.9, 0.5, L + 1, 0, SY + 1.9, 0, A);
  g.box(0.8, 0.5, L + 1, 0, SY + 2.4, 0, HI);

  // +z castellum aquae (distribution house)
  const CB = 75;
  g.box(12, 14, 12, 0, 0, CB + 6, A);
  g.box(13, 0.7, 13, 0, 14, CB + 6, HI);
  g.box(8, 1.2, 8, 0, 14.7, CB + 6, C);
  g.box(6.4, 0.6, 6.4, 0, 15.3, CB + 6, WATER);
  g.gable(13, 2.2, 1.6, 0, 14.7, CB + 11.4, B);
  g.box(2.4, 3.2, 0.6, 0, 0, CB + 11.7, DK);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) g.box(0.6, 14, 0.7, x, 0, CB + 11.6, HI);

  // -z hillside ramp-down and inspection tower
  for (let k = 0; k < 7; k++) {
    g.box(18, 5 * (k + 1), 4, 0, 0, Z0 - 2 - k * 4, SOIL);
  }
  g.box(4, 10, 4, 6.5, 0, -80, A);
  g.box(4.6, 0.5, 4.6, 6.5, 10, -80, HI);
  g.gable(4.6, 2, 4.6, 6.5, 10.5, -80, B);
  g.box(0.8, 1.4, 0.3, 6.5, 4.5, -77.7, DK);
  g.box(0.8, 1, 0.3, 6.5, 8, -77.7, DK);

  // stair access up the +x face
  for (let k = 0; k < 12; k++) {
    g.box(1.4, 0.4, 1.3, 3.4, k * 1.3, -44 + k * 0.65, C);
  }

  // iron clamp hints on piers
  for (const zc of [-25, 0, 25, 50]) {
    for (const yc of [3, 7, 11, 15]) {
      g.box(0.1, 0.14, 0.5, HX + 0.02, yc, zc, IRON);
      g.box(0.1, 0.14, 0.5, -HX - 0.02, yc, zc, IRON);
    }
  }

  // stone course bands on bottom piers
  for (let i = 0; i <= 6; i++) {
    const zc = Z0 + i * 25;
    for (let yc = 2; yc <= 15; yc += 2.2) {
      g.box(WALL + 0.1, 0.16, 5.15, 0, yc, zc, i % 2 ? DK : C);
    }
  }

  // cypress trees along both sides
  for (let k = -5; k <= 5; k++) {
    const zc = k * 12;
    const s = 0.8 + ((k + 5) % 3) * 0.15;
    for (const sx of [-1, 1]) {
      const x = 7.5 * sx;
      g.cyl(0.16 * s, 0.2 * s, 1.6 * s, x, 0, zc, TRUNK, 6);
      g.cone(1.0 * s, 4.2 * s, x, 1.4 * s, zc, CYPRESS_DK, 8);
      g.cone(0.78 * s, 3.4 * s, x, 4.4 * s, zc, CYPRESS, 8);
      g.cone(0.5 * s, 2.4 * s, x, 7.0 * s, zc, CYPRESS, 8);
    }
  }

  // worker figures and a cart by the river
  g.box(1.6, 0.5, 2.2, 5, 0.9, 3, TRUNK);
  g.box(0.2, 1.0, 0.2, 5, 0.8, 4.1, TRUNK);
  g.cyl(0.45, 0.45, 0.3, 4.2, 0.45, 2.6, IRON, 8, { rz: Math.PI / 2 });
  g.cyl(0.45, 0.45, 0.3, 5.8, 0.45, 2.6, IRON, 8, { rz: Math.PI / 2 });
  for (const wx of [-5, -6.2]) {
    g.box(0.5, 1.2, 0.4, wx, 0.6, 4, TUNIC);
    g.sphere(0.24, wx, 1.45, 4, SKIN, 6);
  }

  const solid = g.build();
  solid.computeBoundingBox();
  return { solid, glass: null, name: '大渡槽', height: 38, radius: 80 };
}
