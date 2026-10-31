import { createGeo } from './geo.js';

export function buildAcropolis() {
  const api = createGeo();

  const MARBLE = 0xeee7d8;
  const MARBLE2 = 0xe2dbca;
  const MARBLE3 = 0xcfc4ae;
  const BLUE = 0x2f5f9a;
  const RED = 0xa3402f;
  const GOLD = 0xd4af37;
  const BRONZE = 0x9c7a3f;
  const BRONZE_D = 0x6b4d27;
  const BRONZE_L = 0xc39a56;
  const ROCK1 = 0xb9ae98;
  const ROCK2 = 0xafa48e;
  const ROCK3 = 0xa39880;
  const ROCK4 = 0x9c907a;
  const ROCK5 = 0xc2b7a2;
  const GREEN1 = 0x5f7a42;
  const GREEN2 = 0x4c6634;
  const GREEN3 = 0x74894f;
  const TRUNK = 0x6b4f32;
  const DARK = 0x2e3428;

  const TOP = 14;
  const PC = -6.5;

  let seed = 0x9e3779b9;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const jit = (a) => (rnd() - 0.5) * 2 * a;

  function blob(n, r, h, y, hex, rot) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (1 + jit(0.055));
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    api.group({ y, ry: rot }, (g) => g.prism(pts, h, 0, hex));
  }

  // irregular limestone mesa: four stepped cliff tiers with ledges
  blob(20, 36.5, 4.2, 0, ROCK1, 0.0);
  blob(20, 34.5, 3.6, 4.2, ROCK2, 0.17);
  blob(18, 32.5, 3.4, 7.8, ROCK3, -0.11);
  blob(18, 31.0, 2.8, 11.2, ROCK4, 0.08);

  function doric(x, y, z, h, seg = 10) {
    api.cyl(0.60, 0.68, 0.30, x, y, z, MARBLE3, seg);
    api.cyl(0.32, 0.47, h - 0.76, x, y + 0.30, z, MARBLE, seg);
    api.box(1.00, 0.30, 1.00, x, y + h - 0.46, z, MARBLE2);
    api.box(1.18, 0.16, 1.18, x, y + h - 0.16, z, MARBLE3);
  }

  function ionic(x, y, z, h, seg = 9) {
    api.cyl(0.60, 0.70, 0.28, x, y, z, MARBLE3, seg);
    api.cyl(0.30, 0.37, h - 0.62, x, y + 0.28, z, MARBLE, seg);
    api.box(0.95, 0.20, 0.95, x, y + h - 0.34, z, MARBLE2);
    api.sphere(0.21, x - 0.34, y + h - 0.24, z, MARBLE2, 6);
    api.sphere(0.21, x + 0.34, y + h - 0.24, z, MARBLE2, 6);
    api.box(1.10, 0.14, 1.10, x, y + h - 0.14, z, MARBLE3);
  }

  function caryatid(x, y, z, ry = 0) {
    api.group({ x, y, z, ry }, (g) => {
      g.box(0.64, 0.18, 0.64, 0, 0, 0, MARBLE3);
      g.cyl(0.24, 0.35, 2.35, 0, 0.18, 0, MARBLE, 7);
      g.box(0.64, 0.12, 0.52, 0, 1.95, 0, MARBLE2);
      g.cyl(0.18, 0.25, 0.82, 0, 2.57, 0, MARBLE, 7);
      g.sphere(0.18, 0, 3.52, 0, 0xd9cdb6, 7);
      g.cone(0.24, 0.42, 0, 3.66, 0, 0x8a7a5c, 7);
      g.box(0.50, 0.30, 0.50, 0, 3.98, 0, MARBLE2);
      g.cyl(0.06, 0.08, 0.88, -0.25, 2.60, 0.07, MARBLE, 6);
      g.cyl(0.06, 0.08, 0.88, 0.25, 2.60, 0.07, MARBLE, 6);
    });
  }

  function figure(x, y, z, s, hex, ry = 0) {
    api.group({ x, y, z, ry, s }, (g) => {
      g.cyl(0.12, 0.18, 0.55, 0, 0, 0, hex, 6);
      g.cyl(0.22, 0.34, 0.90, 0, 0.55, 0, hex, 7);
      g.sphere(0.17, 0, 1.60, 0, hex, 6);
      g.box(0.50, 0.08, 0.20, 0, 1.25, 0, hex);
    });
  }

  function olive(x, y, z, s) {
    api.cyl(0.18 * s, 0.34 * s, 2.6 * s, x, y, z, TRUNK, 6);
    const cy = y + 2.6 * s + 1.1 * s;
    api.sphere(1.75 * s, x, cy, z, GREEN1, 7);
    api.sphere(1.30 * s, x - 1.15 * s, cy - 0.1 * s, z + 0.55 * s, GREEN2, 7);
    api.sphere(1.30 * s, x + 1.10 * s, cy + 0.2 * s, z - 0.45 * s, GREEN3, 7);
    api.sphere(1.15 * s, x + 0.15 * s, cy + 1.0 * s, z + 0.30 * s, GREEN1, 6);
    api.sphere(1.05 * s, x - 0.35 * s, cy - 0.85 * s, z - 0.65 * s, GREEN2, 6);
  }

  function cypress(x, y, z, s) {
    api.cyl(0.12 * s, 0.22 * s, 1.2 * s, x, y, z, TRUNK, 6);
    api.cone(0.95 * s, 6.5 * s, x, y + 1.0 * s, z, GREEN2, 7);
    api.cone(0.72 * s, 3.8 * s, x, y + 4.1 * s, z, GREEN1, 7);
  }

  function bush(x, y, z, s) {
    api.sphere(0.85 * s, x, y + 0.62 * s, z, GREEN2, 6);
    api.sphere(0.58 * s, x + 0.55 * s, y + 0.48 * s, z + 0.32 * s, GREEN3, 6);
    api.sphere(0.50 * s, x - 0.45 * s, y + 0.44 * s, z - 0.30 * s, GREEN1, 6);
  }

  function lamp(x, y, z, s = 1) {
    api.cyl(0.16 * s, 0.26 * s, 0.35 * s, x, y, z, BRONZE_D, 6);
    api.cyl(0.07 * s, 0.09 * s, 3.1 * s, x, y + 0.35 * s, z, BRONZE_D, 6);
    api.cyl(0.34 * s, 0.18 * s, 0.22 * s, x, y + 3.45 * s, z, BRONZE, 7);
    api.cone(0.26 * s, 0.75 * s, x, y + 3.67 * s, z, GOLD, 6);
  }

  function balustradeX(x0, x1, z, y) {
    const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 1.4));
    api.box(Math.abs(x1 - x0), 0.18, 0.42, (x0 + x1) / 2, y + 0.92, z, MARBLE2);
    api.box(Math.abs(x1 - x0), 0.14, 0.30, (x0 + x1) / 2, y + 0.12, z, MARBLE3);
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      api.box(0.22, 0.86, 0.26, x, y + 0.18, z, MARBLE);
    }
  }

  function balustradeZ(z0, z1, x, y) {
    const n = Math.max(2, Math.round(Math.abs(z1 - z0) / 1.4));
    api.box(0.42, 0.18, Math.abs(z1 - z0), x, y + 0.92, (z0 + z1) / 2, MARBLE2);
    api.box(0.30, 0.14, Math.abs(z1 - z0), x, y + 0.12, (z0 + z1) / 2, MARBLE3);
    for (let i = 0; i <= n; i++) {
      const z = z0 + ((z1 - z0) * i) / n;
      api.box(0.26, 0.86, 0.22, x, y + 0.18, z, MARBLE);
    }
  }

  function rampZ(x, z0, z1, y0, y1, w, hex) {
    const dz = z1 - z0;
    const dy = y1 - y0;
    const len = Math.hypot(dz, dy);
    const th = -Math.atan2(dy, dz);
    api.box(w, 0.8, len, x, (y0 + y1) / 2, z0 + dz / 2, hex, { rx: th });
  }

  function rampX(x0, x1, z, y0, y1, w, hex) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const th = Math.atan2(dy, dx);
    api.box(len, 0.8, w, x0 + dx / 2, (y0 + y1) / 2, z, hex, { rz: th });
  }

  function banner(x, y, z, hex, s = 1) {
    api.cyl(0.06 * s, 0.08 * s, 5.4 * s, x, y, z, BRONZE_D, 6);
    api.box(1.6 * s, 0.08, 0.08, x + 0.8 * s, y + 5.1 * s, z, BRONZE_D);
    api.box(1.45 * s, 1.55 * s, 0.08, x + 0.82 * s, y + 3.5 * s, z, hex);
    api.box(0.10, 0.35 * s, 0.10, x, y + 5.5 * s, z, GOLD);
  }

  // ---------- rock ledges, scrub and trees ----------
  const ledgeTrees = [
    [30.7, 16.8, 4.2, 0.95], [-7.9, 34.1, 4.2, 0.85], [-32.9, 11.7, 4.2, 0.9],
    [-22.9, -26.5, 4.2, 0.8], [16.3, -31.0, 4.2, 0.9],
    [20.7, 26.1, 7.8, 0.95], [-19.6, 26.9, 7.8, 0.85], [-32.1, -8.5, 7.8, 0.9],
    [-3.7, -33.1, 7.8, 0.8], [31.7, -10.0, 7.8, 0.9],
    [31.1, 6.3, 11.2, 0.9], [-26.4, 17.6, 11.2, 0.85], [-31.4, 4.5, 11.2, 0.9],
    [-10.0, -30.1, 11.2, 0.8], [22.5, -22.3, 11.2, 0.9],
    [27, 10, TOP, 1.05], [29, -2, TOP, 0.9], [-28, 9, TOP, 1.0],
    [-24, -18, TOP, 0.95], [22, -20, TOP, 0.9], [0, -28, TOP, 0.95],
    [10, -27, TOP, 0.85], [-28, -8, TOP, 0.85]
  ];
  for (const [x, z, y, s] of ledgeTrees) olive(x, y, z, s);

  const ledgeBushes = [
    [34.9, 7.2, 4.2, 1.0], [-33.8, -6.0, 4.2, 0.9], [-18.0, 30.0, 4.2, 1.1],
    [6.0, -35.0, 4.2, 0.95], [31.6, 11.1, 7.8, 0.9], [-29.0, 16.0, 7.8, 1.0],
    [-31.0, -15.0, 7.8, 0.95], [21.0, -27.0, 7.8, 0.9], [30.0, 9.0, 11.2, 0.9],
    [-25.0, 19.0, 11.2, 1.0], [-30.6, -8.3, 11.2, 0.85], [5.2, -31.2, 11.2, 0.9],
    [25.0, 14.0, TOP, 0.85], [-25.0, 15.0, TOP, 0.9], [-24.0, -16.0, TOP, 0.85],
    [16.0, -24.0, TOP, 0.9], [26.0, -13.0, TOP, 0.8], [-15.0, -25.0, TOP, 0.85]
  ];
  for (const [x, z, y, s] of ledgeBushes) bush(x, y, z, s);

  // rough outcrops and boulders on the cliffs
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + jit(0.08);
    const tier = i % 4;
    const r = [37.0, 35.0, 33.0, 31.5][tier];
    const y = [0.6, 4.2, 7.8, 11.2][tier] + rnd() * 1.1;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (z > 26 && x > 6 && x < 20) continue;
    api.box(1.4 + rnd() * 2.4, 1.0 + rnd() * 2.2, 1.4 + rnd() * 2.4, x, y, z, i % 2 ? ROCK4 : ROCK5, { ry: rnd() * Math.PI, rz: jit(0.22) });
  }

  // rocky knolls break up the plateau edge
  const knolls = [
    [18, -22, 1.8], [-24, 15, 1.6], [-27, -10, 1.4], [28, -2, 1.5],
    [14, -27, 1.2], [-16, 26, 1.1], [14, 26, 1.3]
  ];
  for (const [x, z, s] of knolls) {
    api.sphere(1.6 * s, x, TOP + 0.4, z, ROCK4, 6);
    api.box(2.2 * s, 1.4 * s, 1.8 * s, x + 1.1 * s, TOP, z - 0.4, ROCK3, { ry: 0.5 });
  }

  // ---------- Parthenon ----------
  api.box(18.2, 0.45, 32.6, 0, TOP, PC, MARBLE3);
  api.box(17.6, 0.45, 32.0, 0, TOP + 0.45, PC, MARBLE2);
  api.box(17.0, 0.50, 31.4, 0, TOP + 0.90, PC, MARBLE);
  const PCOL = TOP + 1.40;
  const PH = 9.4;

  const colX = [];
  const colZ = [];
  for (let i = 0; i < 8; i++) colX.push(-6.3 + i * 1.8);
  for (let j = 0; j < 17; j++) colZ.push(-21.0 + j * 1.8);

  for (let i = 0; i < 8; i++) {
    doric(colX[i], PCOL, colZ[0], PH, 11);
    doric(colX[i], PCOL, colZ[16], PH, 11);
  }
  for (let j = 1; j < 16; j++) {
    doric(colX[0], PCOL, colZ[j], PH, 11);
    doric(colX[7], PCOL, colZ[j], PH, 11);
  }

  const PTOP = PCOL + PH;
  api.box(16.8, 0.90, 31.2, 0, PTOP, PC, MARBLE);
  api.box(16.4, 1.20, 30.8, 0, PTOP + 0.90, PC, MARBLE2);
  api.box(17.2, 0.45, 31.6, 0, PTOP + 2.10, PC, MARBLE3);

  // painted frieze and triglyphs on all four faces
  for (let i = 0; i < 8; i++) {
    api.box(0.34, 1.10, 0.16, colX[i], PTOP + 0.95, PC + 15.45, MARBLE3);
    api.box(0.34, 1.10, 0.16, colX[i], PTOP + 0.95, PC - 15.45, MARBLE3);
    if (i < 7) {
      const mx = (colX[i] + colX[i + 1]) / 2;
      api.box(0.92, 0.86, 0.10, mx, PTOP + 1.07, PC + 15.45, i % 2 ? BLUE : RED);
      api.box(0.92, 0.86, 0.10, mx, PTOP + 1.07, PC - 15.45, i % 2 ? RED : BLUE);
    }
  }
  for (let j = 0; j < 17; j++) {
    api.box(0.16, 1.10, 0.34, 8.25, PTOP + 0.95, colZ[j], MARBLE3);
    api.box(0.16, 1.10, 0.34, -8.25, PTOP + 0.95, colZ[j], MARBLE3);
    if (j < 16) {
      const mz = (colZ[j] + colZ[j + 1]) / 2;
      api.box(0.10, 0.86, 0.92, 8.25, PTOP + 1.07, mz, j % 2 ? BLUE : RED);
      api.box(0.10, 0.86, 0.92, -8.25, PTOP + 1.07, mz, j % 2 ? RED : BLUE);
    }
  }

  // cella block, door and relief bands
  api.box(9.0, 7.4, 24.0, 0, PCOL, PC, MARBLE2);
  api.box(9.4, 0.55, 24.4, 0, PCOL + 6.7, PC, MARBLE3);
  api.box(9.45, 0.30, 24.45, 0, PCOL + 6.45, PC, BLUE);
  api.box(2.4, 4.7, 0.28, 0, PCOL, PC + 12.05, DARK);
  api.box(3.0, 0.35, 0.34, 0, PCOL + 4.7, PC + 12.05, MARBLE3);
  for (let i = 0; i < 4; i++) {
    doric(-2.7 + i * 1.8, PCOL, PC + 12.6, 7.8, 9);
  }
  api.box(7.8, 0.55, 1.2, 0, PCOL + 7.8, PC + 12.6, MARBLE2);

  // marble roof, ridge and tile ribs
  api.gable(31.6, 4.0, 16.2, 0, PTOP + 2.55, PC, MARBLE);
  api.box(0.24, 0.28, 31.6, 0, PTOP + 6.30, PC, MARBLE3);
  for (const sx of [-6.0, -4.0, -2.0, 2.0, 4.0, 6.0]) {
    const ry = PTOP + 2.55 + 4.0 * (1 - Math.abs(sx) / 8.1);
    const rz = sx > 0 ? 0.459 : -0.459;
    api.box(0.14, 0.16, 31.4, sx, ry, PC, MARBLE2, { rz });
  }

  // pediment sculpture groups, front and back
  for (const side of [1, -1]) {
    const zf = PC + side * 15.95;
    const ry = side > 0 ? 0 : Math.PI;
    api.box(15.2, 0.28, 0.55, 0, PTOP + 2.55, zf, MARBLE3);
    for (let i = 0; i < 11; i++) {
      const x = -6.0 + i * 1.2;
      const s = 0.42 + 0.38 * (1 - Math.abs(x) / 7.2);
      figure(x, PTOP + 2.68, zf + side * 0.22, s, MARBLE2, ry);
    }
    api.box(15.0, 0.18, 0.22, 0, PTOP + 2.73, zf + side * 0.12, side > 0 ? BLUE : RED);
  }

  // acroteria and antefixes
  for (const side of [1, -1]) {
    const zf = PC + side * 15.85;
    api.box(0.7, 0.35, 0.7, 0, PTOP + 6.30, zf, MARBLE3);
    api.cone(0.48, 1.55, 0, PTOP + 6.65, zf, GOLD, 7);
    api.sphere(0.18, 0, PTOP + 8.2, zf, GOLD, 6);
  }
  for (const side of [1, -1]) {
    for (let j = 0; j < 16; j++) {
      const z = colZ[j] + 0.9;
      api.cone(0.16, 0.55, side * 8.15, PTOP + 2.35, z, MARBLE2, 5);
    }
  }

  // ---------- Propylaea gateway ----------
  api.box(20.0, 0.35, 11.4, 0, TOP, 23.0, MARBLE3);
  api.box(19.4, 0.35, 10.8, 0, TOP + 0.35, 23.0, MARBLE2);
  api.box(18.8, 0.35, 10.2, 0, TOP + 0.70, 23.0, MARBLE);
  const GY = TOP + 1.05;

  api.box(4.1, 6.4, 8.2, -4.05, GY, 23.0, MARBLE2);
  api.box(4.1, 6.4, 8.2, 4.05, GY, 23.0, MARBLE2);
  api.box(3.9, 0.55, 8.0, 0, GY + 5.85, 23.0, MARBLE);
  api.box(3.8, 0.30, 0.3, 0, GY, 18.95, DARK);
  api.box(4.0, 0.24, 8.0, 0, GY, 23.0, MARBLE3);

  const gateX = [-6.3, -4.2, -2.1, 2.1, 4.2, 6.3];
  for (const x of gateX) doric(x, GY, 27.55, 6.3, 10);
  for (const x of [-6.3, -4.2, 2.1, 4.2, 6.3]) doric(x, GY, 18.6, 6.3, 10);

  api.box(13.4, 0.85, 9.0, 0, GY + 6.3, 23.0, MARBLE);
  api.box(13.0, 1.05, 8.6, 0, GY + 7.15, 23.0, MARBLE2);
  api.box(13.5, 0.42, 9.2, 0, GY + 8.20, 23.0, MARBLE3);
  for (let i = 0; i < 6; i++) {
    api.box(0.30, 0.90, 0.16, gateX[i], GY + 7.25, 27.0, MARBLE3);
    if (i < 5) api.box(0.72, 0.72, 0.10, (gateX[i] + gateX[i + 1]) / 2, GY + 7.35, 27.0, i % 2 ? BLUE : RED);
  }
  api.gable(9.2, 2.8, 13.4, 0, GY + 8.62, 23.0, MARBLE);
  api.cone(0.5, 1.5, 0, GY + 11.42, 27.6, GOLD, 7);
  api.cone(0.5, 1.5, 0, GY + 11.42, 18.4, GOLD, 7);
  api.box(12.0, 0.24, 0.5, 0, GY + 8.62, 27.55, MARBLE3);
  for (let i = 0; i < 7; i++) {
    const x = -4.5 + i * 1.5;
    const s = 0.34 + 0.22 * (1 - Math.abs(x) / 6.7);
    figure(x, GY + 8.72, 27.72, s, MARBLE2, 0);
  }
  for (const sx of [-1, 1]) {
    for (let j = 0; j < 7; j++) {
      api.cone(0.14, 0.45, sx * 6.72, GY + 8.55, 19.4 + j * 1.2, MARBLE2, 5);
    }
    for (let j = 0; j < 4; j++) {
      api.box(0.10, 0.72, 0.82, sx * 6.78, GY + 7.30, 20.2 + j * 1.7, j % 2 ? BLUE : RED);
    }
  }

  // lower side wings
  for (const sx of [-1, 1]) {
    api.box(4.6, 4.4, 8.0, sx * 9.0, GY, 23.0, MARBLE2);
    api.box(4.2, 0.55, 8.4, sx * 9.0, GY + 4.4, 23.0, MARBLE);
    api.box(4.8, 0.30, 8.8, sx * 9.0, GY + 4.95, 23.0, MARBLE3);
    doric(sx * 7.4, GY, 27.3, 4.4, 9);
    doric(sx * 10.6, GY, 27.3, 4.4, 9);
    api.box(4.8, 0.35, 0.22, sx * 9.0, GY + 4.35, 27.0, sx > 0 ? BLUE : RED);
  }

  // ceremonial steps up from the ramp to the gate floor
  for (let i = 0; i < 4; i++) {
    api.box(13.0, 0.36, 0.32, 0, 13.6 + i * 0.36, 28.55 - i * 0.30, i % 2 ? MARBLE2 : MARBLE);
  }
  api.box(1.0, 1.6, 1.2, -6.7, 13.6, 28.2, MARBLE3);
  api.box(1.0, 1.6, 1.2, 6.7, 13.6, 28.2, MARBLE3);

  // ---------- Erechtheion and Caryatid porch ----------
  const EX = -19.5;
  const EZ = -7.0;
  api.box(12.0, 0.40, 18.0, EX, TOP, EZ, MARBLE3);
  api.box(11.4, 0.40, 17.4, EX, TOP + 0.40, EZ, MARBLE2);
  api.box(10.8, 0.40, 16.8, EX, TOP + 0.80, EZ, MARBLE);
  const EY = TOP + 1.20;

  api.box(7.6, 6.0, 11.5, EX, EY, EZ - 2.0, MARBLE2);
  api.box(8.0, 0.65, 11.9, EX, EY + 5.95, EZ - 2.0, MARBLE);
  api.box(7.8, 0.95, 11.7, EX, EY + 6.60, EZ - 2.0, MARBLE2);
  api.box(8.1, 0.25, 12.0, EX, EY + 6.95, EZ - 2.0, BLUE);
  api.box(8.4, 0.40, 12.3, EX, EY + 7.20, EZ - 2.0, MARBLE3);
  api.gable(12.3, 2.5, 8.4, EX, EY + 7.60, EZ - 2.0, MARBLE);
  api.box(0.18, 0.20, 12.3, EX, EY + 9.9, EZ - 2.0, MARBLE3);

  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      ionic(EX + sx * 4.35, EY, EZ - 6.4 + i * 3.1, 5.3, 8);
    }
    api.box(1.0, 0.55, 11.0, EX + sx * 4.35, EY + 5.3, EZ - 2.0, MARBLE2);
    api.box(1.02, 0.22, 11.0, EX + sx * 4.35, EY + 5.85, EZ - 2.0, sx > 0 ? BLUE : RED);
  }
  api.box(2.0, 4.2, 0.25, EX, EY, EZ + 3.78, DARK);
  for (let i = 0; i < 5; i++) {
    api.box(1.4, 0.28, 0.18, EX - 2.6 + i * 1.3, EY + 5.2, EZ + 3.82, i % 2 ? BLUE : RED);
  }

  // six caryatids on the south porch
  for (let i = 0; i < 6; i++) {
    caryatid(EX - 3.85 + i * 1.54, EY, EZ + 6.35);
  }
  api.box(9.0, 0.55, 4.6, EX, EY + 4.28, EZ + 6.35, MARBLE);
  api.box(8.6, 0.90, 4.4, EX, EY + 4.83, EZ + 6.35, MARBLE2);
  api.box(8.9, 0.24, 4.7, EX, EY + 5.55, EZ + 6.35, RED);
  api.box(9.2, 0.35, 4.9, EX, EY + 5.79, EZ + 6.35, MARBLE3);
  api.gable(9.2, 1.8, 4.9, EX, EY + 6.14, EZ + 6.35, MARBLE, { ry: Math.PI / 2 });
  api.cone(0.32, 1.0, EX, EY + 7.9, EZ + 6.35, GOLD, 6);

  // ---------- Athena Promachos ----------
  const AX = 10.5;
  const AZ = 12.0;
  api.box(5.2, 0.45, 5.2, AX, TOP, AZ, MARBLE3);
  api.box(4.6, 0.45, 4.6, AX, TOP + 0.45, AZ, MARBLE2);
  api.box(4.0, 0.55, 4.0, AX, TOP + 0.90, AZ, MARBLE);
  api.box(3.2, 2.0, 3.2, AX, TOP + 1.45, AZ, BRONZE_D);
  api.box(2.8, 0.35, 2.8, AX, TOP + 3.45, AZ, BRONZE);
  const AY = TOP + 3.8;

  api.cyl(0.85, 1.45, 8.0, AX, AY, AZ, BRONZE, 10);
  api.cyl(0.62, 0.90, 3.6, AX, AY + 8.0, AZ, BRONZE_L, 9);
  api.sphere(0.55, AX, AY + 11.9, AZ, BRONZE_L, 8);
  api.sphere(0.34, AX, AY + 12.55, AZ, BRONZE_L, 7);
  api.cyl(0.45, 0.55, 1.2, AX, AY + 12.8, AZ, BRONZE, 8);
  api.cone(0.52, 2.1, AX, AY + 14.0, AZ, BRONZE_L, 8);
  api.cone(0.20, 0.9, AX, AY + 16.0, AZ, GOLD, 6);
  // raised right arm and spear
  api.cyl(0.20, 0.28, 3.0, AX + 0.95, AY + 9.4, AZ, BRONZE, 7, { rz: -0.18 });
  api.cyl(0.09, 0.11, 17.0, AX + 1.55, AY + 8.0, AZ + 0.2, BRONZE_D, 6);
  api.cone(0.24, 1.4, AX + 1.55, AY + 25.0, AZ + 0.2, GOLD, 6);
  // left arm and round shield
  api.cyl(0.20, 0.26, 2.4, AX - 0.95, AY + 9.0, AZ, BRONZE, 7, { rz: 0.30 });
  api.cyl(1.45, 1.45, 0.28, AX - 1.55, AY + 8.6, AZ + 0.55, GOLD, 12, { rx: Math.PI / 2 });
  api.cyl(0.55, 0.55, 0.10, AX - 1.55, AY + 8.6, AZ + 0.75, BLUE, 8, { rx: Math.PI / 2 });
  api.box(0.18, 1.5, 0.55, AX, AY + 15.2, AZ, RED);
  // owl on the pedestal
  api.sphere(0.34, AX + 1.7, TOP + 3.7, AZ + 1.5, BRONZE_L, 7);
  api.sphere(0.24, AX + 1.7, TOP + 4.15, AZ + 1.5, BRONZE_L, 6);
  api.cone(0.16, 0.5, AX + 1.7, TOP + 4.3, AZ + 1.5, BRONZE, 6);

  // ---------- Temple of Athena Nike on its bastion ----------
  const NX = 23.0;
  const NZ = 18.0;
  const NY = TOP + 2.2;
  api.group({ x: NX, y: 4.2, z: NZ }, (g) => {
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 7.0 * (1 + jit(0.06));
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    g.prism(pts, 12.0, 0, ROCK5);
  });
  api.box(7.6, 0.40, 10.0, NX, NY, NZ, MARBLE3);
  api.box(7.0, 0.40, 9.4, NX, NY + 0.40, NZ, MARBLE2);
  api.box(6.5, 0.40, 8.8, NX, NY + 0.80, NZ, MARBLE);
  const NT = NY + 1.20;
  api.box(4.8, 3.6, 6.4, NX, NT, NZ, MARBLE2);
  for (const dz of [4.2, -4.2]) {
    for (let i = 0; i < 4; i++) {
      ionic(NX - 2.4 + i * 1.6, NT, NZ + dz, 4.2, 8);
    }
  }
  api.box(6.8, 0.55, 8.8, NX, NT + 4.2, NZ, MARBLE);
  api.box(6.4, 0.85, 8.4, NX, NT + 4.75, NZ, MARBLE2);
  api.box(6.5, 0.22, 8.5, NX, NT + 5.60, NZ, BLUE);
  api.box(7.0, 0.35, 9.0, NX, NT + 5.82, NZ, MARBLE3);
  api.gable(9.0, 1.8, 7.0, NX, NT + 6.17, NZ, MARBLE);
  api.cone(0.34, 1.1, NX, NT + 7.97, NZ + 4.35, GOLD, 6);
  api.cone(0.34, 1.1, NX, NT + 7.97, NZ - 4.35, GOLD, 6);
  balustradeX(NX - 3.5, NX + 3.5, NZ + 4.9, NY);
  balustradeX(NX - 3.5, NX + 3.5, NZ - 4.9, NY);
  balustradeZ(NZ - 4.7, NZ + 4.7, NX - 3.5, NY);
  balustradeZ(NZ - 4.7, NZ + 4.7, NX + 3.5, NY);

  // ---------- zig-zag ceremonial ramp ----------
  rampZ(13, 40, 35.5, 0, 4.0, 6, ROCK5);
  api.box(7, 0.8, 3.6, 13, 4.0, 35.4, ROCK5);
  rampX(13, 3, 35.5, 4.8, 6.0, 4.5, ROCK5);
  api.box(6, 0.8, 4.2, 3, 6.0, 35.2, ROCK5);
  rampZ(3, 35.0, 32.5, 6.8, 10.8, 5, ROCK5);
  api.box(6, 0.8, 3.8, 3, 10.8, 31.9, ROCK5);
  rampZ(3, 32.0, 28.8, 11.6, 14.0, 5, ROCK5);
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    api.box(0.34, 0.95, 0.34, 10.1, 4.0 * t + 0.35, 40 - 4.5 * t, MARBLE3);
    api.box(0.34, 0.95, 0.34, 15.9, 4.0 * t + 0.35, 40 - 4.5 * t, MARBLE3);
  }
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    api.box(0.34, 0.95, 0.34, 3 + 10 * t, 4.8 + 1.2 * t + 0.35, 33.3, MARBLE3);
    api.box(0.34, 0.95, 0.34, 3 + 10 * t, 4.8 + 1.2 * t + 0.35, 37.7, MARBLE3);
  }
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    api.box(0.34, 0.95, 0.34, 0.8, 6.8 + 4.0 * t + 0.35, 35.0 - 2.5 * t, MARBLE3);
    api.box(0.34, 0.95, 0.34, 5.2, 6.8 + 4.0 * t + 0.35, 35.0 - 2.5 * t, MARBLE3);
  }
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    api.box(0.34, 0.95, 0.34, 0.8, 11.6 + 2.4 * t + 0.35, 32.0 - 3.2 * t, MARBLE3);
    api.box(0.34, 0.95, 0.34, 5.2, 11.6 + 2.4 * t + 0.35, 32.0 - 3.2 * t, MARBLE3);
  }
  banner(18.2, 4.8, 35.4, BLUE, 1.0);
  banner(7.8, 6.8, 35.2, RED, 0.95);
  banner(-8.0, GY, 28.8, BLUE, 1.05);
  banner(8.0, GY, 28.8, RED, 1.05);

  // ---------- forecourt, gardens and lamps ----------
  api.box(30.0, 0.25, 4.8, 4, 0, 39.4, ROCK5);
  api.box(30.0, 0.16, 0.6, 4, 0.25, 41.6, MARBLE3);
  api.box(30.0, 0.16, 0.6, 4, 0.25, 37.2, MARBLE3);
  api.box(0.6, 0.16, 4.8, -10.7, 0.25, 39.4, MARBLE3);
  api.box(0.6, 0.16, 4.8, 18.7, 0.25, 39.4, MARBLE3);
  for (const [x, z] of [[-16, 39], [-13.5, 39], [21.5, 39], [24, 39]]) {
    api.box(1.8, 0.45, 1.8, x, 0, z, MARBLE3);
    bush(x, 0.4, z, 0.95);
  }
  lamp(6.0, 0, 39.3, 1.0);
  lamp(18.0, 0, 39.3, 1.0);
  lamp(-6.0, 0, 39.3, 0.9);
  lamp(22.5, 0, 39.3, 0.9);
  cypress(-18.0, 0, 39.0, 1.0);
  cypress(26.0, 0, 38.5, 0.9);
  for (const [x, z] of [[-8.5, 39], [21, 39]]) {
    api.box(1.4, 0.6, 1.4, x, 0, z, MARBLE3);
    figure(x, 0.6, z, 1.35, MARBLE2, 0);
  }

  // plateau edge balustrades near the gate
  balustradeZ(16.0, 21.0, -17.0, TOP);
  balustradeZ(-2.0, 4.0, 29.5, TOP);

  // ---------- east stoa and north treasury colonnade ----------
  api.box(7.2, 0.40, 16.4, 20.5, TOP, -11.0, MARBLE3);
  api.box(6.6, 0.40, 15.8, 20.5, TOP + 0.40, -11.0, MARBLE2);
  const SY = TOP + 0.80;
  for (let i = 0; i < 7; i++) doric(18.2, SY, -18.4 + i * 2.4, 5.0, 8);
  api.box(0.6, 5.0, 14.8, 23.6, SY, -11.0, MARBLE2);
  api.box(6.0, 0.60, 15.4, 20.5, SY + 5.0, -11.0, MARBLE);
  api.box(5.6, 0.90, 15.0, 20.5, SY + 5.6, -11.0, MARBLE2);
  api.box(6.0, 0.30, 15.6, 20.5, SY + 6.5, -11.0, MARBLE3);
  api.gable(15.6, 1.7, 6.0, 20.5, SY + 6.8, -11.0, MARBLE);
  for (let i = 0; i < 6; i++) {
    api.box(0.10, 0.62, 1.0, 17.52, SY + 5.72, -17.8 + i * 2.4, i % 2 ? BLUE : RED);
    api.cone(0.14, 0.45, 17.6, SY + 6.1, -17.8 + i * 2.4, MARBLE2, 5);
  }

  api.box(20.0, 0.40, 5.0, 0, TOP, -26.5, MARBLE3);
  api.box(19.4, 0.40, 4.4, 0, TOP + 0.40, -26.5, MARBLE2);
  const TY = TOP + 0.80;
  for (let i = 0; i < 9; i++) doric(-10.0 + i * 2.5, TY, -24.8, 5.0, 8);
  api.box(19.4, 5.0, 0.6, 0, TY, -28.8, MARBLE2);
  api.box(19.4, 0.60, 4.6, 0, TY + 5.0, -26.5, MARBLE);
  api.box(19.0, 0.90, 4.2, 0, TY + 5.6, -26.5, MARBLE2);
  api.box(19.6, 0.30, 4.8, 0, TY + 6.5, -26.5, MARBLE3);
  api.gable(19.6, 1.6, 4.8, 0, TY + 6.8, -26.5, MARBLE, { ry: Math.PI / 2 });
  for (let i = 0; i < 8; i++) {
    api.box(1.0, 0.62, 0.10, -8.75 + i * 2.5, TY + 5.72, -24.2, i % 2 ? BLUE : RED);
    api.cone(0.14, 0.45, -8.75 + i * 2.5, TY + 6.1, -24.25, MARBLE2, 5);
  }
  api.box(16.0, 0.24, 1.0, 0, TOP + 0.08, -23.9, MARBLE3);

  // ---------- more planting on the ledges and plateau ----------
  const extraTrees = [
    [14, 23, TOP, 0.85], [-18, 22, TOP, 0.85], [15, -25, TOP, 0.9],
    [-15, -25, TOP, 0.9], [27, -10, TOP, 0.8], [-20, -22, TOP, 0.8],
    [16, 6, TOP, 0.8], [35.1, -2, 4.2, 0.8], [-35.0, 8, 4.2, 0.8],
    [29.5, -15.7, 7.8, 0.8], [-28.7, 16.9, 7.8, 0.8], [28.9, -12.9, 11.2, 0.8],
    [-31.7, -2, 11.2, 0.8]
  ];
  for (const [x, z, y, s] of extraTrees) olive(x, y, z, s);

  const extraBushes = [
    [20, 20, TOP, 0.8], [-19, 22, TOP, 0.8], [21, -19, TOP, 0.8],
    [-22, -20, TOP, 0.8], [10, 25, TOP, 0.7], [-9, -27, TOP, 0.7],
    [34.6, -9.8, 4.2, 0.8], [-35.5, 0, 4.2, 0.8], [28.0, 18.1, 7.8, 0.8],
    [-27.9, -18.1, 7.8, 0.8], [26.4, 16.5, 11.2, 0.8], [-26.4, -16.5, 11.2, 0.8]
  ];
  for (const [x, z, y, s] of extraBushes) bush(x, y, z, s);

  // ---------- votive statues, altar and tripods ----------
  for (const [x, z] of [[-7, 17.0], [-4, 17.0], [4, 17.0], [7, 17.0], [-8, 14.5], [8, 14.5]]) {
    api.box(1.2, 0.9, 1.2, x, TOP, z, MARBLE3);
    figure(x, TOP + 0.9, z, 1.25, MARBLE2, 0);
  }
  api.box(3.6, 0.40, 3.6, -5, TOP, 11.5, MARBLE3);
  api.box(3.0, 0.50, 3.0, -5, TOP + 0.40, 11.5, MARBLE2);
  api.box(2.4, 1.0, 2.4, -5, TOP + 0.90, 11.5, MARBLE);
  api.box(2.8, 0.20, 2.8, -5, TOP + 1.90, 11.5, MARBLE3);
  api.box(1.6, 0.45, 1.6, -5, TOP + 2.10, 11.5, DARK);
  api.cone(0.5, 1.1, -5, TOP + 2.30, 11.5, RED, 6);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    api.box(1.5, 0.28, 0.14, -5 + Math.cos(a) * 1.45, TOP + 1.30, 11.5 + Math.sin(a) * 1.45, i % 2 ? BLUE : RED, { ry: a });
  }

  for (const sx of [-1, 1]) {
    const x = sx * 9.5;
    const z = 29.4;
    api.box(1.4, 0.5, 1.4, x, TOP, z, MARBLE3);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      api.cyl(0.08, 0.13, 1.9, x + Math.cos(a) * 0.55, TOP + 0.5, z + Math.sin(a) * 0.55, BRONZE, 6);
    }
    api.dome(0.82, x, TOP + 2.3, z, GOLD, 10);
    api.sphere(0.24, x, TOP + 3.15, z, BRONZE, 6);
    api.cone(0.16, 0.5, x, TOP + 3.35, z, GOLD, 6);
  }

  // extra edge balustrades
  balustradeZ(-17, -10, 25.0, TOP);
  balustradeZ(-8, 8, -28.0, TOP);
  balustradeZ(-6, 0, -29.5, TOP);

  // Nike roof antefixes
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      api.cone(0.13, 0.42, NX + sx * 3.35, NT + 6.0, NZ - 4.0 + i * 1.33, MARBLE2, 5);
    }
  }

  return { solid: api.build(), glass: null, name: '雅典卫城', radius: 42, height: 44.2 };
}
