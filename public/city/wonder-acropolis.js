import { createGeo } from './geo.js';

export function buildAcropolis() {
  const api = createGeo();

  const MARBLE = 0xeee9dd;
  const MARBLE2 = 0xe2dbcc;
  const MARBLE3 = 0xcfc4b0;
  const ROCK = 0x9a8f7c;
  const ROCK2 = 0x877b68;
  const TERRA = 0xb5562f;
  const GOLD = 0xd4af37;
  const BRONZE = 0x8a6a3a;
  const BRONZE2 = 0x6b4d27;
  const GREEN = 0x5c7a3f;
  const DARK = 0x3f5a2e;
  const OLIVE = 0x7d8d56;
  const TRUNK = 0x6b4f32;
  const PLATEAU = 16;

  function doric(x, y, z, h = 9.6, seg = 14) {
    api.cyl(0.58, 0.66, 0.32, x, y, z, MARBLE3, 10);
    api.cyl(0.34, 0.47, h - 0.62, x, y + 0.32, z, MARBLE, seg);
    api.box(1.05, 0.3, 1.05, x, y + h - 0.3, z, MARBLE2);
  }

  function ionic(x, y, z, h = 4.8, seg = 10) {
    api.cyl(0.62, 0.72, 0.28, x, y, z, MARBLE3, 10);
    api.cyl(0.3, 0.36, h - 0.62, x, y + 0.28, z, MARBLE, seg);
    api.box(0.95, 0.24, 0.95, x, y + h - 0.34, z, MARBLE2);
    api.sphere(0.23, x - 0.35, y + h - 0.1, z, MARBLE2, 6);
    api.sphere(0.23, x + 0.35, y + h - 0.1, z, MARBLE2, 6);
  }

  function olive(x, z, s) {
    const y = PLATEAU;
    api.cyl(0.22 * s, 0.4 * s, 3.4 * s, x, y, z, TRUNK, 6);
    const cy = y + 3.4 * s + 1.4 * s;
    api.sphere(1.9 * s, x, cy, z, GREEN, 8);
    api.sphere(1.4 * s, x - 1.2 * s, cy - 0.1 * s, z + 0.6 * s, DARK, 7);
    api.sphere(1.4 * s, x + 1.1 * s, cy + 0.2 * s, z - 0.5 * s, OLIVE, 7);
    api.sphere(1.25 * s, x + 0.2 * s, cy + 1.05 * s, z + 0.3 * s, GREEN, 7);
    api.sphere(1.15 * s, x - 0.3 * s, cy - 0.9 * s, z - 0.7 * s, DARK, 7);
  }

  api.prism([
    [36, 0], [33, 12], [27, 20], [17, 26], [4, 28], [-9, 27],
    [-21, 23], [-30, 16], [-35, 6], [-33, -7], [-28, -17], [-18, -24],
    [-5, -28], [9, -28], [21, -24], [30, -17], [35, -7]
  ], 8, 0, ROCK);

  api.prism([
    [31, 0], [28, 10], [22, 17], [12, 21], [0, 22], [-12, 21],
    [-22, 17], [-28, 10], [-31, 0], [-29, -10], [-23, -18], [-13, -22],
    [-1, -23], [11, -22], [21, -18], [28, -11]
  ], 8, 8, ROCK2);

  api.box(56, 0.35, 42, 0, 15.65, -1, ROCK);

  for (let i = 0; i < 16; i++) {
    api.box(13, 1, 0.55, 0, i, 27 - i * 0.55, i % 2 ? MARBLE2 : MARBLE);
  }
  api.box(0.9, 16, 8.8, -6.9, 0, 22.9, MARBLE2);
  api.box(0.9, 16, 8.8, 6.9, 0, 22.9, MARBLE2);
  api.box(14, 0.35, 1.0, 0, 15.65, 18.5, MARBLE);

  api.box(14.5, 0.45, 10.0, 0, 16, 15.5, MARBLE2);
  api.box(13.9, 0.45, 9.4, 0, 16.45, 15.5, MARBLE);
  api.box(13.3, 0.45, 8.8, 0, 16.9, 15.5, MARBLE);

  for (let i = 0; i < 6; i++) {
    const x = -4.5 + i * 1.8;
    doric(x, 17.35, 18.5, 5.4, 12);
    doric(x, 17.35, 12.5, 5.4, 12);
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      doric(sx * 8.2, 17.35, 13.5 + i * 3, 4.4, 10);
    }
  }

  api.box(0.9, 4.4, 6.6, -5.9, 17.35, 15.5, MARBLE);
  api.box(0.9, 4.4, 6.6, 5.9, 17.35, 15.5, MARBLE);
  api.box(3.6, 4.4, 6.6, -7.3, 17.35, 15.5, MARBLE2);
  api.box(3.6, 4.4, 6.6, 7.3, 17.35, 15.5, MARBLE2);

  api.box(13.0, 1.1, 8.8, 0, 22.75, 15.5, MARBLE);
  api.box(12.2, 1.0, 8.2, 0, 23.85, 15.5, MARBLE2);
  api.gable(8.6, 2.4, 12.8, 0, 24.85, 15.5, MARBLE2, { ry: Math.PI / 2 });
  api.box(6.9, 0.14, 8.9, 3.2, 26.05, 15.5, TERRA, { rz: -0.359 });
  api.box(6.9, 0.14, 8.9, -3.2, 26.05, 15.5, TERRA, { rz: 0.359 });

  const px = [];
  for (let i = 0; i < 8; i++) px.push(-5.95 + i * 1.7);
  const pz = [];
  for (let j = 0; j < 17; j++) pz.push(-20.6 + j * 1.7);

  api.box(15.4, 0.6, 30.4, 0, 16, -7, MARBLE2);
  api.box(14.8, 0.6, 29.8, 0, 16.6, -7, MARBLE);
  api.box(14.2, 0.6, 29.2, 0, 17.2, -7, MARBLE);

  for (let i = 0; i < 8; i++) {
    doric(px[i], 17.8, pz[0], 9.6, 14);
    doric(px[i], 17.8, pz[16], 9.6, 14);
  }
  for (let j = 1; j < 16; j++) {
    doric(px[0], 17.8, pz[j], 9.6, 14);
    doric(px[7], 17.8, pz[j], 9.6, 14);
  }

  api.box(13.8, 1.0, 28.8, 0, 27.4, -7, MARBLE);
  api.box(13.2, 1.2, 28.2, 0, 28.4, -7, MARBLE2);

  for (let i = 0; i < 8; i++) {
    api.box(0.52, 1.15, 0.18, px[i], 28.4, 7.15, MARBLE3);
    api.box(0.52, 1.15, 0.18, px[i], 28.4, -21.15, MARBLE3);
  }
  for (let j = 1; j < 16; j++) {
    api.box(0.18, 1.15, 0.52, 6.55, 28.4, pz[j], MARBLE3);
    api.box(0.18, 1.15, 0.52, -6.55, 28.4, pz[j], MARBLE3);
  }

  api.gable(29.0, 4.2, 14.0, 0, 29.6, -7, MARBLE2, { ry: Math.PI / 2 });
  api.box(8.2, 0.15, 29.2, 3.5, 31.7, -7, TERRA, { rz: -0.54 });
  api.box(8.2, 0.15, 29.2, -3.5, 31.7, -7, TERRA, { rz: 0.54 });
  api.box(0.35, 0.22, 29.2, 0, 33.85, -7, TERRA);
  api.cone(0.55, 1.25, 0, 33.8, 7.4, TERRA, 8);
  api.cone(0.55, 1.25, 0, 33.8, -21.4, TERRA, 8);

  api.box(8.6, 6.4, 0.6, 0, 17.8, -18.0, MARBLE2);
  api.box(0.6, 6.4, 21.0, -4.3, 17.8, -7.5, MARBLE2);
  api.box(0.6, 6.4, 21.0, 4.3, 17.8, -7.5, MARBLE2);
  api.box(2.7, 6.4, 0.6, -2.95, 17.8, 3.0, MARBLE2);
  api.box(2.7, 6.4, 0.6, 2.95, 17.8, 3.0, MARBLE2);
  api.box(3.2, 1.3, 0.6, 0, 22.9, 3.0, MARBLE2);

  for (let k = 0; k < 4; k++) {
    const z = -14 + k * 4;
    doric(-3.3, 17.8, z, 7.0, 10);
    doric(3.3, 17.8, z, 7.0, 10);
  }

  api.box(3.2, 0.8, 3.2, 0, 17.8, -9.5, GOLD);
  api.box(2.4, 0.8, 2.4, 0, 18.6, -9.5, GOLD);
  api.cyl(1.0, 1.35, 4.2, 0, 19.4, -9.5, GOLD, 10);
  api.sphere(0.6, 0, 24.1, -9.5, GOLD, 8);
  api.cone(0.8, 1.0, 0, 24.6, -9.5, GOLD, 8);
  api.cyl(0.08, 0.08, 5.6, -1.5, 19.8, -9.5, BRONZE2, 6);
  api.ring(1.15, 0.14, 0.9, 21.8, -8.3, GOLD, 10);

  api.box(8.6, 0.45, 14.2, 21.5, 16, -9, MARBLE2);
  api.box(8.0, 0.45, 13.6, 21.5, 16.45, -9, MARBLE);
  api.box(7.4, 0.45, 13.0, 21.5, 16.9, -9, MARBLE);

  const ix = [];
  for (let i = 0; i < 6; i++) ix.push(18.875 + i * 1.05);
  const iz = [];
  for (let j = 0; j < 11; j++) iz.push(-14.75 + j * 1.15);

  for (let i = 0; i < 6; i++) {
    ionic(ix[i], 17.35, iz[0], 4.8, 10);
    ionic(ix[i], 17.35, iz[10], 4.8, 10);
  }
  for (let j = 1; j < 10; j++) {
    ionic(ix[0], 17.35, iz[j], 4.8, 10);
    ionic(ix[5], 17.35, iz[j], 4.8, 10);
  }

  api.box(6.8, 0.9, 12.4, 21.5, 22.15, -9, MARBLE);
  api.box(6.2, 0.9, 11.8, 21.5, 23.05, -9, MARBLE2);
  api.gable(12.0, 2.2, 7.0, 21.5, 23.95, -9, MARBLE2, { ry: Math.PI / 2 });
  api.box(4.15, 0.13, 12.1, 23.25, 25.05, -9, TERRA, { rz: -0.561 });
  api.box(4.15, 0.13, 12.1, 19.75, 25.05, -9, TERRA, { rz: 0.561 });
  api.box(0.3, 0.18, 12.1, 21.5, 26.2, -9, TERRA);

  api.box(4.2, 4.0, 0.5, 21.5, 17.35, -13.9, MARBLE);
  api.box(0.5, 4.0, 9.8, 19.5, 17.35, -9, MARBLE);
  api.box(0.5, 4.0, 9.8, 23.5, 17.35, -9, MARBLE);

  api.box(4.0, 2.4, 4.0, -19, 16, 6, MARBLE2);
  api.box(3.4, 0.5, 3.4, -19, 18.4, 6, MARBLE);
  api.cyl(0.85, 1.2, 5.2, -19, 18.9, 6, BRONZE, 10);
  api.sphere(0.72, -19, 24.7, 6, BRONZE, 8);
  api.cone(0.95, 1.3, -19, 25.1, 6, BRONZE2, 8);
  api.cyl(0.08, 0.08, 8.0, -20.1, 20.0, 6.0, BRONZE2, 6);
  api.cone(0.18, 0.9, -20.1, 28.0, 6.0, GOLD, 6);
  api.ring(0.9, 0.12, -18.1, 21.7, 6.0, BRONZE2, 8);

  const trees = [
    [-26, 13, 1.05], [-27, -5, 0.9], [-22, -17, 1.1], [-13, 18, 0.8],
    [12, 17.5, 0.9], [24, 12, 1.0], [27.5, 1, 0.85], [16, -20, 0.95],
    [-14, -20, 1.05], [-9.5, 13, 0.7], [9.5, 13.5, 0.75]
  ];
  for (const [x, z, s] of trees) olive(x, z, s);

  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const rr = 29 + (i % 4) * 1.7;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr * 0.79;
    if (z > 15 && Math.abs(x) < 10) continue;
    const y = 1 + (i % 5) * 1.4;
    api.sphere(1.5 + (i % 4) * 0.25, x, y, z, ROCK, 6);
  }

  return { solid: api.build(), glass: null, name: '雅典卫城', radius: 38, height: 36 };
}
