import { createGeo } from './geo.js';

const VARIANTS = 3;
const GLASS = [0x6f8ea6, 0x8fb3c9, 0x5f9aa0];
const FRAME = [0xd4d8dc, 0xdce0e3, 0xc8ced3];
const DARK = [0x3c434a, 0x343b42, 0x444c54];
const CONCRETE = [0xcfcac2, 0xd8d3ca, 0xc5c0b8];
const WINDOW = [0x3c434a, 0x4a5563, 0x39434b];

function variantIndex(variant) {
  const n = Number.isFinite(variant) ? Math.floor(variant) : 0;
  return ((n % VARIANTS) + VARIANTS) % VARIANTS;
}

function towerTall(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const H = [32, 31, 33][v];
  const shaftW = [4.4, 4.6, 4.2][v];
  const podiumW = [5.8, 5.9, 5.7][v];
  const podiumH = [3.0, 3.2, 2.8][v];
  const glass = GLASS[v];
  const frame = FRAME[v];
  const dark = DARK[v];
  const crownH = 2.6;
  const antennaH = 2.8;
  const shaftTop = H - crownH - antennaH;

  geo.box(podiumW, podiumH, podiumW, 0, 0, 0, dark);
  geo.box(podiumW + 0.06, 0.85, podiumW + 0.06, 0, podiumH * 0.5, 0, glass);
  geo.box(1.7, 2.0, 0.08, 0, 0, podiumW / 2 - 0.01, frame);

  const shaftH = shaftTop - podiumH;
  geo.box(shaftW, shaftH, shaftW, 0, podiumH, 0, glass);

  for (let y = podiumH + 2.4; y < shaftTop - 0.5; y += 3) {
    geo.box(shaftW + 0.22, 0.16, shaftW + 0.22, 0, y, 0, frame);
  }

  const trim = 0.16;
  const corner = shaftW / 2 - trim / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      geo.box(trim, shaftH, trim, sx * corner, podiumH, sz * corner, frame);
    }
  }

  geo.box(shaftW * 0.82, 1.5, shaftW * 0.82, 0, shaftTop, 0, frame);
  geo.box(shaftW * 0.58, 1.1, shaftW * 0.58, 0, shaftTop + 1.5, 0, glass);
  geo.cyl(0.07, 0.13, antennaH, 0, shaftTop + crownH, 0, frame, 6);

  return geo.build();
}

function towerMid(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const H = [18, 17, 19][v];
  const towerW = [4.2, 4.4, 3.8][v];
  const towerD = [3.6, 3.4, 3.8][v];
  const baseH = [2.2, 2.0, 2.4][v];
  const roofH = 0.45;
  const shaftH = H - baseH - roofH;
  const baseW = towerW + 0.8;
  const baseD = towerD + 0.8;
  const glass = GLASS[v];
  const frame = FRAME[v];
  const dark = DARK[v];

  geo.box(baseW, baseH, baseD, 0, 0, 0, dark);
  geo.box(baseW + 0.05, 0.42, baseD + 0.05, 0, baseH * 0.35, 0, glass);
  geo.box(2.4, 1.7, 0.1, 0, 0, baseD / 2 - 0.01, frame);
  geo.box(2.8, 0.16, 0.7, 0, Math.max(0.1, baseH - 0.25), baseD / 2 + 0.3, frame);

  geo.box(towerW, shaftH, towerD, 0, baseH, 0, glass);

  for (let i = 0; i < 5; i++) {
    const x = -towerW / 2 + (towerW / 4) * i;
    geo.box(0.12, shaftH, 0.18, x, baseH, towerD / 2 + 0.06, frame);
    geo.box(0.12, shaftH, 0.18, x, baseH, -towerD / 2 - 0.06, frame);
  }

  geo.box(towerW + 0.5, roofH, towerD + 0.5, 0, H - roofH, 0, frame);
  geo.box(2.1, 1.15, 1.3, 0.7, H, -0.45, frame);
  geo.box(1.3, 0.55, 1.36, 0.7, H + 0.3, -0.45, dark);

  return geo.build();
}

function office(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const lowerW = [5.8, 5.6, 5.9][v];
  const lowerD = [4.6, 4.4, 4.5][v];
  const lowerH = [4.2, 4.0, 4.4][v];
  const upperW = [5.2, 5.0, 5.1][v];
  const upperD = [4.2, 4.0, 4.1][v];
  const upperH = [3.4, 3.5, 3.3][v];
  const offsetX = [0.38, 0.28, 0.34][v];
  const offsetZ = [0.1, 0.0, 0.05][v];
  const glass = GLASS[(v + 1) % 3];
  const frame = FRAME[v];
  const dark = DARK[v];
  const wall = [0xd6d2c9, 0xcfcbc2, 0xd9d5cc][v];
  const roofY = lowerH + upperH;

  geo.box(lowerW, lowerH, lowerD, 0, 0, 0, wall);
  geo.box(lowerW + 0.08, 0.18, lowerD + 0.08, 0, lowerH - 0.18, 0, frame);
  geo.box(upperW, upperH, upperD, offsetX, lowerH, offsetZ, wall);

  for (let i = 0; i < 2; i++) {
    const wy = 0.95 + i * 1.55;
    geo.box(lowerW * 0.86, 0.55, 0.06, 0, wy, lowerD / 2 + 0.01, glass);
    geo.box(0.06, 0.55, lowerD * 0.72, lowerW / 2 + 0.01, wy, 0, glass);
    geo.box(0.06, 0.55, lowerD * 0.72, -lowerW / 2 - 0.01, wy, 0, glass);
  }

  for (let i = 0; i < 2; i++) {
    const wy = lowerH + 0.7 + i * 1.35;
    geo.box(upperW * 0.82, 0.5, 0.06, offsetX, wy, offsetZ + upperD / 2 + 0.01, glass);
  }

  geo.box(1.6, 2.1, 0.08, -0.9, 0, lowerD / 2 + 0.005, dark);
  geo.box(2.8, 0.18, 0.7, -0.9, 2.25, lowerD / 2 + 0.3, frame);

  geo.box(3.4, 0.22, 2.0, offsetX, roofY, offsetZ, 0x6f8f57);
  const greenTop = roofY + 0.22;
  for (let i = 0; i < 4; i++) {
    const sx = offsetX - 1.2 + i * 0.8;
    const sz = offsetZ + (i % 2 === 0 ? 0.45 : -0.45);
    geo.cone(0.24, 0.65, sx, greenTop, sz, 0x4f7a45, 5);
  }

  return geo.build();
}

function residential(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const H = [14.4, 13.6, 15.0][v];
  const W = [5.4, 5.6, 5.2][v];
  const D = [4.0, 3.8, 4.2][v];
  const bodyH = H - 0.22;
  const front = D / 2;
  const concrete = CONCRETE[v];
  const glass = WINDOW[v];
  const frame = FRAME[v];

  geo.box(W, bodyH, D, 0, 0, 0, concrete);
  geo.box(W + 0.1, 0.22, D + 0.1, 0, bodyH, 0, frame);

  geo.box(W + 0.08, 0.4, 0.1, 0, H - 0.4, D / 2 + 0.01, concrete);
  geo.box(W + 0.08, 0.4, 0.1, 0, H - 0.4, -D / 2 - 0.01, concrete);
  geo.box(0.1, 0.4, D + 0.08, W / 2 + 0.01, H - 0.4, 0, concrete);
  geo.box(0.1, 0.4, D + 0.08, -W / 2 - 0.01, H - 0.4, 0, concrete);

  for (let i = 0; i < 5; i++) {
    const wy = 0.8 + i * 2.8;
    geo.box(3.4, 0.95, 0.06, 0, wy, front + 0.01, glass);
    geo.box(0.06, 0.85, 2.2, W / 2 + 0.01, wy + 0.05, 0, glass);
    geo.box(0.06, 0.85, 2.2, -W / 2 - 0.01, wy + 0.05, 0, glass);
  }

  geo.box(1.35, 2.1, 0.08, 0, 0, front + 0.02, frame);
  geo.box(2.3, 0.16, 0.6, 0, 2.25, front + 0.3, frame);

  for (let i = 0; i < 4; i++) {
    const y = 2.8 * (i + 1);
    geo.box(3.2, 0.16, 0.85, 0, y, front + 0.425, concrete);
    geo.box(3.0, 0.6, 0.06, 0, y + 0.16, front + 0.82, frame);
  }

  return geo.build();
}

function glassSlab(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const W = [5.6, 5.4, 5.8][v];
  const D = [2.6, 2.4, 2.6][v];
  const H = [24, 22.5, 25][v];
  const capH = [2.8, 2.6, 3.0][v];
  const bodyH = H - capH;
  const glass = GLASS[v];
  const frame = FRAME[v];

  geo.box(W, bodyH, D, 0, 0, 0, glass);
  geo.box(W + 0.06, 0.35, D + 0.06, 0, 0, 0, frame);

  for (let i = 0; i < 3; i++) {
    const x = -W / 3 + (W / 3) * i;
    geo.box(0.09, bodyH, 0.09, x, 0, D / 2 + 0.045, frame);
    geo.box(0.09, bodyH, 0.09, x, 0, -D / 2 - 0.045, frame);
  }

  for (let y = 4.5; y < bodyH - 1; y += 5.5) {
    geo.box(W + 0.1, 0.12, D + 0.1, 0, y, 0, frame);
  }

  geo.box(W + 0.12, 0.16, D + 0.12, 0, bodyH - 0.08, 0, frame);
  geo.gable(W, capH, D, 0, bodyH, 0, glass);
  geo.box(W, 0.08, 0.08, 0, H - 0.08, 0, frame);

  return geo.build();
}

export const MODERN_FILLERS = {
  towerTall,
  towerMid,
  office,
  residential,
  glassSlab,
};
