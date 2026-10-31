import { createGeo } from './geo.js';

const VARIANTS = 3;
const GLASS = [0x7aa6c7, 0x5883a8, 0x8fb8d4];
const GLASS2 = [0x6f9bbd, 0x5f8db0, 0x9ac0d8];
const FRAME = [0xc9d0d6, 0xd6dbdf, 0xbac3ca];
const CONCRETE = [0xcfcac2, 0xd8d3ca, 0xc5c0b8];
const DARK = [0x3c434a, 0x343b42, 0x444c54];
const WALL = [0xd9d2c7, 0xcfc7bb, 0xe0d9cf];
const BRICK = [0x9c6b52, 0xa8795f, 0x8f6046];
const SIGN = [0xd05a4a, 0x3f8fb0, 0xd9a441];
const METAL = 0x3a4046;
const GREEN = 0x5f8a4d;

function variantIndex(variant) {
  const n = Number.isFinite(variant) ? Math.floor(variant) : 0;
  return ((n % VARIANTS) + VARIANTS) % VARIANTS;
}

function apartmentBlock(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const H = [22.5, 19.0, 25.5][v];
  const W = [5.4, 5.2, 5.6][v];
  const D = [4.0, 3.8, 4.2][v];
  const groundH = 3.2;
  const roofH = [1.5, 1.2, 1.8][v];
  const bodyH = H - roofH;
  const floors = [7, 6, 8][v];
  const storey = (bodyH - groundH) / floors;
  const glass = GLASS[v];
  const glass2 = GLASS2[v];
  const frame = FRAME[v];
  const wall = WALL[v];
  const dark = DARK[v];
  const sign = SIGN[v];
  const front = D / 2;

  geo.box(6.5, 0.2, 6.5, 0, 0, 0, 0x9a9a94);
  geo.box(W, bodyH, D, 0, 0.2, 0, wall);
  geo.box(W + 0.08, 0.24, D + 0.08, 0, 0.2, 0, frame);

  geo.box(W * 0.9, 2.0, 0.1, 0, 0.55, front + 0.03, glass);
  geo.box(0.5, 2.1, 0.12, W * 0.18, 0.4, front + 0.05, dark);
  geo.box(1.16, 0.24, 0.12, W * 0.18, 2.5, front + 0.05, frame);
  geo.box(W * 0.7, 0.5, 0.16, 0, 2.7, front + 0.1, sign);
  geo.box(W * 0.64, 0.1, 0.62, 0, 2.35, front + 0.36, sign);
  geo.box(2.4, 0.18, 0.8, W * 0.18, 0.2, front + 0.42, frame);

  for (let i = 0; i < floors; i++) {
    const by = 0.2 + groundH + i * storey;
    geo.box(W * 0.94, 0.14, 0.75, 0, by, front + 0.375, frame);
    geo.box(W * 0.9, 0.8, 0.05, 0, by + 0.14, front + 0.72, glass2);
    geo.box(W * 0.94, 0.07, 0.09, 0, by + 0.94, front + 0.72, frame);
    geo.box(W * 0.86, storey * 0.48, 0.08, 0, by + 0.5, front + 0.02, glass);
    geo.box(0.08, storey * 0.44, D * 0.62, W / 2 + 0.02, by + 0.48, 0, glass2);
    geo.box(0.08, storey * 0.44, D * 0.62, -W / 2 - 0.02, by + 0.48, 0, glass2);
  }

  geo.box(W + 0.12, 0.55, 0.14, 0, bodyH, front, frame);
  geo.box(W + 0.12, 0.55, 0.14, 0, bodyH, -front, frame);
  geo.box(0.14, 0.55, D + 0.12, W / 2, bodyH, 0, frame);
  geo.box(0.14, 0.55, D + 0.12, -W / 2, bodyH, 0, frame);
  geo.box(W * 0.44, roofH * 0.56, D * 0.4, -W * 0.16, bodyH, -D * 0.12, frame);
  geo.cyl(0.55, 0.55, 1.0, W * 0.24, bodyH + 0.05, D * 0.1, 0x9fb0b8, 8);
  geo.cyl(0.58, 0.58, 0.1, W * 0.24, bodyH + 1.05, D * 0.1, frame, 8);
  geo.cyl(0.05, 0.09, 0.9, -W * 0.2, bodyH + 0.6, -D * 0.15, frame, 6);

  return geo.build();
}

function mall(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const H = [8.3, 7.4, 8.8][v];
  const W = [6.2, 5.8, 6.4][v];
  const D = [4.4, 4.2, 4.6][v];
  const wallH = H - [1.9, 1.6, 2.1][v];
  const glass = GLASS[v];
  const glass2 = GLASS2[v];
  const frame = FRAME[v];
  const wall = WALL[v];
  const dark = DARK[v];
  const sign = SIGN[(v + 1) % 3];
  const front = D / 2;

  geo.box(6.7, 0.2, 6.7, 0, 0, 0, 0x8f8f8a);
  geo.box(W, wallH, D, 0, 0.2, 0, wall);
  geo.box(W + 0.1, 0.5, 0.14, 0, wallH, front, frame);
  geo.box(W + 0.1, 0.5, 0.14, 0, wallH, -front, frame);
  geo.box(0.14, 0.5, D + 0.1, W / 2, wallH, 0, frame);
  geo.box(0.14, 0.5, D + 0.1, -W / 2, wallH, 0, frame);

  geo.box(W * 0.94, 2.4, 0.1, 0, 0.6, front + 0.03, glass);
  for (let i = 0; i < 4; i++) {
    const x = -W * 0.42 + (W * 0.84 / 3) * i;
    geo.box(0.09, 2.4, 0.12, x, 0.6, front + 0.05, frame);
  }
  geo.box(1.4, 2.2, 0.12, 0, 0.35, front + 0.06, glass2);
  geo.box(1.6, 0.1, 0.5, 0, 2.55, front + 0.28, frame);

  const atZ = front - 0.8;
  geo.box(2.5, H - 0.4, 1.7, 0, 0.4, atZ, glass);
  geo.box(2.6, 0.14, 1.8, 0, H - 0.06, atZ, frame);
  for (let i = 0; i < 3; i++) {
    geo.box(0.09, H - 0.6, 0.1, -0.9 + i * 0.9, 0.5, atZ + 0.87, frame);
  }
  for (let i = 0; i < 3; i++) {
    geo.box(2.56, 0.1, 1.76, 0, 2.1 + i * 1.7, atZ, frame);
  }

  geo.box(W * 0.72, H - wallH - 0.1, 0.12, 0, wallH, front + 0.09, sign);
  geo.box(W * 0.6, 0.16, 0.16, 0, H - 0.3, front + 0.1, 0xf0e6d2);
  geo.box(3.6, 0.18, 0.85, 0, 3.25, front + 0.5, frame);
  geo.box(0.12, 3.2, 0.12, -1.55, 0.2, front + 0.82, dark);
  geo.box(0.12, 3.2, 0.12, 1.55, 0.2, front + 0.82, dark);
  geo.box(2.6, 0.16, 0.55, 0, 0.2, front + 0.36, frame);

  geo.box(1.5, 0.9, 1.2, -1.6, wallH, -0.6, frame);
  geo.box(1.2, 0.7, 1.0, 1.3, wallH, -0.8, frame);
  geo.box(0.9, 0.6, 0.9, 1.1, wallH, 0.9, frame);
  geo.cyl(0.5, 0.5, 0.6, -1.7, wallH, 0.7, 0x9fb0b8, 8);
  geo.box(3.0, 0.16, 0.14, 0, wallH + 0.55, -D * 0.32, frame);

  return geo.build();
}

function hotel(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const H = [38.0, 35.0, 43.0][v];
  const W = [3.4, 3.2, 3.8][v];
  const D = [3.2, 3.0, 3.4][v];
  const podiumW = [5.6, 5.2, 5.8][v];
  const podiumD = [4.4, 4.2, 4.6][v];
  const podiumH = [4.0, 3.6, 4.4][v];
  const crownH = [3.6, 3.2, 4.0][v];
  const floors = [13, 12, 15][v];
  const towerH = H - podiumH - crownH;
  const storey = towerH / floors;
  const glass = GLASS[v];
  const glass2 = GLASS2[v];
  const frame = FRAME[v];
  const wall = WALL[v];
  const dark = DARK[v];
  const sign = SIGN[(v + 2) % 3];
  const front = podiumD / 2;

  geo.box(6.5, 0.2, 6.5, 0, 0, 0, 0x9a9a94);
  geo.box(podiumW, podiumH, podiumD, 0, 0.2, 0, wall);
  geo.box(podiumW + 0.06, 0.2, podiumD + 0.06, 0, 0.2, 0, frame);
  geo.box(podiumW * 0.95, 0.9, 0.08, 0, 0.55, front + 0.02, glass);
  geo.box(2.0, 2.6, 0.12, 0, 0.4, front + 0.04, glass2);
  geo.box(2.3, 0.1, 0.16, 0, 3.0, front + 0.08, frame);
  geo.box(0.12, 2.6, 0.16, -1.05, 0.4, front + 0.08, dark);
  geo.box(0.12, 2.6, 0.16, 1.05, 0.4, front + 0.08, dark);

  geo.box(3.4, 0.18, 1.1, 0, 3.35, front + 0.5, frame);
  geo.cyl(0.09, 0.09, 3.35, -1.4, 0.2, front + 0.95, frame, 6);
  geo.cyl(0.09, 0.09, 3.35, 1.4, 0.2, front + 0.95, frame, 6);
  geo.box(2.2, 0.16, 0.5, 0, 0.2, front + 0.35, frame);

  geo.box(W, towerH, D, 0, podiumH, 0, glass);
  for (let i = 0; i < floors; i++) {
    const by = podiumH + i * storey;
    geo.box(W + 0.16, 0.12, D + 0.16, 0, by, 0, frame);
    geo.box(W * 0.82, storey * 0.42, 0.07, 0, by + 0.4, D / 2 + 0.03, glass2);
    geo.box(0.07, storey * 0.42, D * 0.72, W / 2 + 0.03, by + 0.4, 0, glass2);
    geo.box(0.07, storey * 0.42, D * 0.72, -W / 2 - 0.03, by + 0.4, 0, glass2);
  }
  const corner = W / 2 - 0.06;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      geo.box(0.12, towerH, 0.12, sx * corner, podiumH, sz * (D / 2 - 0.06), frame);
    }
  }
  geo.box(W + 0.3, 0.35, D + 0.3, 0, H - crownH, 0, frame);

  geo.box(W * 0.86, crownH * 0.62, D * 0.86, 0, H - crownH, 0, wall);
  geo.box(W * 0.9, 0.3, D * 0.9, 0, H - crownH + 0.62, 0, 0xf2d9a0);
  geo.box(W * 0.68, crownH * 0.28, 0.1, 0, H - crownH + 0.95, D * 0.43 + 0.06, sign);
  geo.cyl(0.06, 0.1, 1.4, 0, H - crownH + 1.4, 0, frame, 6);
  geo.box(1.0, 0.5, 0.8, -0.7, H - crownH + 0.62, -0.6, frame);

  return geo.build();
}

function loftRow(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const heights = [
    [12.0, 14.2, 10.8],
    [13.2, 11.0, 14.5],
    [10.6, 13.8, 12.4],
  ][v];
  const depths = [3.8, 3.6, 4.0];
  const centers = [-2.2, 0, 2.2];
  const bw = 2.08;
  const glass = GLASS2[v];
  const frame = FRAME[v];
  const dark = DARK[v];

  geo.box(6.8, 0.2, 6.8, 0, 0, 0, 0x8f8b85);

  for (let b = 0; b < 3; b++) {
    const H = heights[b];
    const D = depths[(b + v) % 3];
    const cx = centers[b];
    const front = D / 2;
    const bodyH = H - 0.4;
    const floors = Math.max(3, Math.min(5, Math.round(H / 3.0)));
    const storey = (bodyH - 0.5) / floors;
    const brick = BRICK[(b + v) % 3];
    const fw = 0.78;
    const fh = Math.min(1.45, storey * 0.62);

    geo.box(bw, bodyH, D, cx, 0.2, 0, brick);
    geo.box(bw + 0.08, 0.3, D + 0.08, cx, bodyH, 0, frame);
    geo.box(bw, 0.06, 0.1, cx, bodyH - 0.45, front + 0.02, frame);

    for (let f = 0; f < floors; f++) {
      const wy = 0.7 + f * storey;
      for (const ox of [-0.46, 0.46]) {
        geo.box(fw, fh, 0.08, cx + ox, wy, front + 0.03, dark);
        geo.box(fw * 0.82, fh * 0.84, 0.1, cx + ox, wy + fh * 0.08, front + 0.05, glass);
      }
      geo.box(bw * 0.94, 0.06, 0.08, cx, wy - 0.08, front + 0.03, frame);
    }

    geo.box(0.8, 2.0, 0.12, cx + bw * 0.24, 0.2, front + 0.04, dark);
    geo.box(1.0, 0.2, 0.4, cx + bw * 0.24, 2.2, front + 0.2, frame);
    geo.box(bw * 0.7, 0.36, 0.12, cx - bw * 0.1, 2.75, front + 0.05, SIGN[(b + v) % 3]);

    geo.box(bw - 0.34, 0.2, D - 0.5, cx, bodyH - 0.12, -0.1, GREEN);
    for (let s = 0; s < 3; s++) {
      const sx = cx - 0.6 + s * 0.6;
      const sz = -0.1 + (s % 2 === 0 ? 0.5 : -0.5);
      geo.cone(0.22, 0.62, sx, bodyH + 0.08, sz, 0x4f7a45, 5);
    }

    if (H < 14) {
      const tankX = cx + bw * 0.22;
      geo.cyl(0.34, 0.34, 0.7, tankX, H - 0.18, -0.6, 0x9fb0b8, 7);
    }
  }

  const mx = centers[1];
  const mD = depths[(1 + v) % 3];
  const mH = heights[1];
  const mStorey = (mH - 0.9) / Math.max(3, Math.round(mH / 3.0));
  for (let f = 1; f < 4; f++) {
    const py = 0.9 + f * mStorey;
    geo.box(1.3, 0.1, 0.6, mx, py, mD / 2 + 0.32, METAL);
    geo.box(1.3, 0.55, 0.05, mx, py + 0.1, mD / 2 + 0.6, frame);
    geo.box(0.5, 0.1, 1.5, mx, py + mStorey * 0.5, mD / 2 + 0.32, METAL, { rx: 0.95 });
  }

  return geo.build();
}

function stationHall(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const H = [10.5, 9.2, 11.8][v];
  const W = [6.2, 5.8, 6.4][v];
  const D = [4.6, 4.4, 4.8][v];
  const wallH = [4.4, 4.0, 4.8][v];
  const rise = [1.9, 1.7, 2.1][v];
  const glass = GLASS[v];
  const glass2 = GLASS2[v];
  const frame = FRAME[v];
  const wall = WALL[v];
  const dark = DARK[v];
  const front = D / 2;
  const ridgeY = wallH + rise;
  const ang = Math.atan2(rise, W / 2);
  const panelLen = Math.hypot(W / 2, rise) + 0.12;

  geo.box(6.7, 0.2, 6.7, 0, 0, 0, 0x9a9a94);
  geo.box(W, wallH, D, 0, 0.2, 0, wall);
  geo.box(W + 0.1, 0.4, 0.14, 0, wallH - 0.4, front, frame);
  geo.box(W + 0.1, 0.4, 0.14, 0, wallH - 0.4, -front, frame);
  geo.box(0.14, 0.4, D + 0.1, W / 2, wallH - 0.4, 0, frame);
  geo.box(0.14, 0.4, D + 0.1, -W / 2, wallH - 0.4, 0, frame);

  geo.box(panelLen, 0.14, D + 0.2, -W / 4, wallH + rise / 2 - 0.07, 0, glass, { rz: ang });
  geo.box(panelLen, 0.14, D + 0.2, W / 4, wallH + rise / 2 - 0.07, 0, glass, { rz: -ang });
  geo.box(0.16, 0.16, D + 0.3, 0, ridgeY, 0, frame);
  for (let i = 0; i < 5; i++) {
    const rz = -D / 2 + (D / 4) * i;
    geo.box(panelLen, 0.08, 0.1, -W / 4, wallH + rise / 2, rz, frame, { rz: ang });
    geo.box(panelLen, 0.08, 0.1, W / 4, wallH + rise / 2, rz, frame, { rz: -ang });
  }
  geo.box(0.16, rise, 0.16, -W / 2, wallH, 0, frame);
  geo.box(0.16, rise, 0.16, W / 2, wallH, 0, frame);

  geo.box(W * 0.9, 2.4, 0.1, 0, 0.55, front + 0.03, glass);
  geo.box(1.5, 2.6, 0.12, 0, 0.4, front + 0.05, glass2);
  geo.box(1.7, 0.12, 0.2, 0, 3.0, front + 0.08, frame);
  geo.box(3.2, 0.18, 0.9, 0, 3.3, front + 0.5, frame);
  geo.cyl(0.08, 0.08, 3.3, -1.4, 0.2, front + 0.9, frame, 6);
  geo.cyl(0.08, 0.08, 3.3, 1.4, 0.2, front + 0.9, frame, 6);
  geo.box(2.6, 0.14, 0.5, 0, 0.2, front + 0.35, frame);
  geo.box(W * 0.62, 0.5, 0.14, 0, wallH - 0.95, front + 0.08, SIGN[(v + 2) % 3]);

  const tw = 1.35;
  const tx = -W / 2 + 0.85;
  const tz = front - 0.78;
  const towerTop = H - 2.2;
  geo.box(tw, towerTop, tw, tx, 0.2, tz, wall);
  geo.box(tw + 0.1, 0.3, tw + 0.1, tx, towerTop - 0.3, tz, frame);
  geo.box(tw + 0.3, 1.0, tw + 0.3, tx, towerTop, tz, frame);
  geo.hip(tw + 0.4, tw + 0.4, 1.1, tx, towerTop + 1.0, tz, 0x7f8f96, 0);
  const faceZ = tz + tw / 2 + 0.16;
  const cy = towerTop - 0.55;
  geo.cyl(0.4, 0.4, 0.1, tx, cy - 0.05, faceZ, 0xf1ede2, 10, { rx: Math.PI / 2 });
  geo.cyl(0.35, 0.35, 0.12, tx, cy - 0.06, faceZ + 0.01, 0xf7f4ea, 10, { rx: Math.PI / 2 });
  geo.box(0.05, 0.26, 0.05, tx, cy + 0.02, faceZ + 0.08, dark);
  geo.box(0.18, 0.05, 0.05, tx + 0.08, cy - 0.04, faceZ + 0.08, dark);

  for (let i = 0; i < 3; i++) {
    geo.box(1.8, 0.16, 0.4, W * 0.18, 0.2, -front + 0.45 + i * 0.55, frame);
  }
  geo.box(2.8, 0.16, 0.24, W * 0.16, 2.4, -front + 0.12, frame);

  return geo.build();
}

function glassTower(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const H = [50, 44, 58][v];
  const tiers = [10, 8, 11][v];
  const baseW = [4.2, 4.0, 4.4][v];
  const baseD = [4.0, 3.8, 4.2][v];
  const podiumH = [3.4, 3.0, 3.8][v];
  const crownH = [3.4, 3.0, 3.8][v];
  const towerH = H - podiumH - crownH;
  const tierH = towerH / tiers;
  const glass = GLASS[v];
  const glass2 = GLASS2[v];
  const frame = FRAME[v];
  const wall = WALL[v];
  const dark = DARK[v];
  const sign = SIGN[v];
  const twist = [1, 1, -1][v] * [0.55, 0.42, 0.68][v];

  geo.box(6.4, 0.2, 6.4, 0, 0, 0, 0x9a9a94);
  geo.box(5.4, podiumH, 5.2, 0, 0.2, 0, wall);
  geo.box(5.46, 0.22, 5.26, 0, 0.2, 0, frame);
  geo.box(4.4, 2.4, 0.1, 0, 0.5, 2.63, glass);
  geo.box(1.8, 2.5, 0.13, 0, 0.4, 2.66, glass2);
  geo.box(3.8, 0.18, 1.0, 0, 3.15, 3.0, frame);
  geo.cyl(0.09, 0.09, 3.0, -1.5, 0.2, 3.25, frame, 6);
  geo.cyl(0.09, 0.09, 3.0, 1.5, 0.2, 3.25, frame, 6);
  geo.box(2.4, 0.4, 0.14, 0, 2.95, 2.7, sign);

  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const w = baseW * (1 - 0.3 * t);
    const d = baseD * (1 - 0.26 * t);
    const ry = twist * t;
    const y = podiumH + i * tierH;
    geo.group({ x: 0, y, ry }, (g) => {
      g.box(w, tierH - 0.1, d, 0, 0, 0, glass);
      g.box(w + 0.18, 0.18, d + 0.18, 0, 0, 0, frame);
      g.box(w * 0.68, tierH * 0.52, 0.06, 0, tierH * 0.24, d / 2 + 0.03, glass2);
      g.box(0.1, tierH * 0.9, 0.12, -w / 2 + 0.05, 0.04, d / 2 + 0.05, frame);
      g.box(0.1, tierH * 0.9, 0.12, w / 2 - 0.05, 0.04, d / 2 + 0.05, frame);
    });
  }

  const topY = podiumH + tiers * tierH;
  const topW = baseW * 0.7;
  const topD = baseD * 0.74;
  geo.box(topW + 0.3, 0.4, topD + 0.3, 0, topY, 0, frame);
  geo.box(topW, crownH * 0.62, topD, 0, topY + 0.4, 0, 0xf3d7a0);
  geo.box(topW * 0.82, crownH * 0.34, topD * 0.82, 0, topY + 0.4 + crownH * 0.62, 0, glass2);
  geo.box(0.18, 0.9, 0.18, 0, topY + crownH * 0.96, 0, frame);
  geo.cyl(0.05, 0.08, 1.2, 0, topY + crownH * 0.96 + 0.9, 0, frame, 6);
  geo.box(0.7, 0.5, 0.7, -1.4, topY + 0.4, -0.8, frame);
  geo.box(2.0, 0.16, 0.14, 0, topY + 0.4, topD / 2 + 0.06, sign);

  return geo.build();
}

export const MODERN_EXTRA = {
  apartmentBlock,
  mall,
  hotel,
  loftRow,
  stationHall,
  glassTower,
};
