// 紫宸宫 — a Forbidden-City-inspired palace wonder.
// The whole complex is baked into two merged geometries: solid surfaces and glass.
import { createGeo } from './geo.js';

export function buildPalace() {
  const solid = createGeo();
  const glass = createGeo();

  const C = {
    wall: 0x9e2f28,
    wallDark: 0x7c241f,
    wallLight: 0xb23a30,
    column: 0xa8322a,
    door: 0x4a1512,
    yellow: 0xd9a520,
    yellowDark: 0xb8860f,
    yellowLight: 0xe8bd45,
    marble: 0xe8e4da,
    marbleDark: 0xd2ccbf,
    marbleLight: 0xf2efe8,
    bronze: 0x6f5a2e,
    bronzeDark: 0x4e3f20,
    bronzeLight: 0x92743c,
    gold: 0xd4af37,
    water: 0x5f8fa8,
    stone: 0xc4bdad,
    stoneDark: 0xa89f8c,
    pine: 0x2f5d3a,
    pineDark: 0x24462d,
    pineLight: 0x3d7048,
    trunk: 0x5b4331,
    glass: 0x27465c,
  };

  // ---------------------------------------------------------------------------
  // Courtyard base and paving
  // ---------------------------------------------------------------------------
  solid.box(40, 0.1, 54, 0, -0.1, 0, C.stone);
  for (let x = -18; x <= 18; x += 6) solid.box(0.07, 0.02, 52, x, 0.0, 0, C.stoneDark);
  for (let z = -24; z <= 24; z += 6) solid.box(39, 0.02, 0.07, 0, 0.0, z, C.stoneDark);
  solid.box(6, 0.05, 12, 0, 0.02, 15, C.marbleLight);

  // ---------------------------------------------------------------------------
  // Outer red walls with yellow tile caps and ridge tiles
  // ---------------------------------------------------------------------------
  solid.box(44, 6, 1.6, 0, 0, 30, C.wall);
  solid.box(44, 6, 1.6, 0, 0, -30, C.wall);
  solid.box(1.6, 6, 60, -22, 0, 0, C.wall);
  solid.box(1.6, 6, 60, 22, 0, 0, C.wall);

  solid.box(44.6, 0.45, 2.3, 0, 6.0, 30, C.yellow);
  solid.box(44.6, 0.45, 2.3, 0, 6.0, -30, C.yellow);
  solid.box(2.3, 0.45, 60.6, -22, 6.0, 0, C.yellow);
  solid.box(2.3, 0.45, 60.6, 22, 6.0, 0, C.yellow);

  solid.box(44.3, 0.16, 1.9, 0, 5.95, 30, C.yellowDark);
  solid.box(44.3, 0.16, 1.9, 0, 5.95, -30, C.yellowDark);
  solid.box(1.9, 0.16, 60.3, -22, 5.95, 0, C.yellowDark);
  solid.box(1.9, 0.16, 60.3, 22, 5.95, 0, C.yellowDark);

  for (let x = -21; x <= 21; x += 2.5) {
    solid.box(0.55, 0.16, 2.1, x, 6.45, 30, C.yellowDark);
    solid.box(0.55, 0.16, 2.1, x, 6.45, -30, C.yellowDark);
  }
  for (let z = -28; z <= 28; z += 2.5) {
    solid.box(2.1, 0.16, 0.55, -22, 6.45, z, C.yellowDark);
    solid.box(2.1, 0.16, 0.55, 22, 6.45, z, C.yellowDark);
  }

  // ---------------------------------------------------------------------------
  // Four corner pavilions, each with a double flared roof
  // ---------------------------------------------------------------------------
  const corners = [[-22, -30], [22, -30], [-22, 30], [22, 30]];
  for (const [cx, cz] of corners) {
    solid.group({ x: cx, y: 6.3, z: cz }, () => {
      solid.box(5.2, 0.45, 5.2, 0, 0, 0, C.marbleDark);
      solid.box(4.4, 4.8, 4.4, 0, 0.45, 0, C.wall);
      solid.box(4.55, 0.22, 4.55, 0, 4.95, 0, C.gold);
      solid.box(0.7, 1.4, 0.10, 0, 1.6, 2.21, C.door);
      solid.box(0.10, 1.4, 0.7, 2.21, 1.6, 0, C.door);
      solid.box(0.10, 1.4, 0.7, -2.21, 1.6, 0, C.door);
      solid.box(0.7, 1.4, 0.10, 0, 1.6, -2.21, C.door);
      solid.hip(6.8, 6.8, 1.7, 0, 5.25, 0, C.yellow, 1.1);
      solid.box(3.2, 1.0, 3.2, 0, 6.95, 0, C.wallDark);
      solid.hip(4.8, 4.8, 1.5, 0, 7.95, 0, C.yellowLight, 0.7);
      solid.cyl(0.12, 0.22, 0.8, 0, 9.45, 0, C.gold, 6);
      solid.sphere(0.28, 0, 10.3, 0, C.gold, 6);
    });
  }

  // ---------------------------------------------------------------------------
  // Meridian Gate: central bastion, three arches, U-shaped wings and pavilions
  // ---------------------------------------------------------------------------
  solid.box(16, 8, 10, 0, 0, 26, C.wall);
  solid.box(17, 0.45, 11, 0, 0, 26, C.marbleDark);
  solid.box(17, 0.4, 11, 0, 8, 26, C.yellow);

  for (const ax of [-4.4, 0, 4.4]) {
    solid.box(2.2, 2.2, 0.10, ax, 0.15, 31.02, C.door);
    solid.arch(2.5, 0.55, 0.5, ax, 0.15, 31.12, C.marble, 8);
    solid.box(4.6, 0.28, 0.65, ax, 2.7, 31.05, C.marbleLight);
  }

  // Central gate hall on the bastion
  solid.box(14, 6, 9, 0, 8, 26, C.wall);
  solid.box(14.25, 0.32, 9.25, 0, 13.75, 26, C.gold);
  for (let i = 0; i < 7; i++) {
    solid.cyl(0.24, 0.30, 6, -6 + i * 2, 8, 30.65, C.column, 8);
  }
  solid.hip(18, 12, 2.8, 0, 14, 26, C.yellow, 1.4);
  solid.box(10, 1.8, 6.5, 0, 16.8, 26, C.wallDark);
  solid.box(10.2, 0.24, 6.7, 0, 18.35, 26, C.gold);
  solid.hip(14, 9.5, 2.7, 0, 18.6, 26, C.yellowLight, 0.9);
  solid.box(5.2, 0.4, 0.7, 0, 21.3, 26, C.gold);
  solid.sphere(0.32, -2.4, 21.75, 26, C.gold, 6);
  solid.sphere(0.32, 0, 21.75, 26, C.gold, 6);
  solid.sphere(0.32, 2.4, 21.75, 26, C.gold, 6);
  for (let i = 0; i < 5; i++) {
    glass.box(1.2, 2.0, 0.10, -5 + i * 2.5, 9.0, 30.52, C.glass);
  }

  for (const s of [-1, 1]) {
    solid.box(2.0, 6, 12, s * 13, 0, 20, C.wall);
    solid.box(2.6, 0.45, 12.6, s * 13, 6, 20, C.yellow);
    solid.box(2.3, 0.16, 12.2, s * 13, 5.95, 20, C.yellowDark);
    for (let z = 15; z <= 25; z += 2.5) {
      solid.box(2.35, 0.16, 0.5, s * 13, 6.45, z, C.yellowDark);
    }
  }

  for (const s of [-1, 1]) {
    solid.group({ x: s * 12.9, y: 6.2, z: 15 }, () => {
      solid.box(5.6, 0.4, 5.6, 0, 0, 0, C.marbleDark);
      solid.box(4.8, 4.4, 4.8, 0, 0.4, 0, C.wall);
      solid.box(4.95, 0.22, 4.95, 0, 4.65, 0, C.gold);
      solid.hip(7, 7, 1.8, 0, 4.8, 0, C.yellow, 1.0);
      solid.box(3.0, 0.9, 3.0, 0, 6.6, 0, C.wallDark);
      solid.hip(4.8, 4.8, 1.4, 0, 7.5, 0, C.yellowLight, 0.7);
      solid.cyl(0.1, 0.18, 0.6, 0, 8.9, 0, C.gold, 6);
      solid.sphere(0.24, 0, 9.5, 0, C.gold, 6);
    });
  }

  // ---------------------------------------------------------------------------
  // Golden Water stream: an arc of thin water boxes with marble banks
  // ---------------------------------------------------------------------------
  const streamN = 9;
  const streamHalf = 11;
  const streamZ = 11.5;
  for (let i = 0; i < streamN; i++) {
    const t0 = -1 + (2 * i) / streamN;
    const t1 = -1 + (2 * (i + 1)) / streamN;
    const x0 = streamHalf * t0;
    const x1 = streamHalf * t1;
    const z0 = streamZ + 3.6 * (1 - t0 * t0);
    const z1 = streamZ + 3.6 * (1 - t1 * t1);
    const mx = (x0 + x1) * 0.5;
    const mz = (z0 + z1) * 0.5;
    const len = Math.hypot(x1 - x0, z1 - z0) + 0.18;
    const ang = Math.atan2(-(z1 - z0), x1 - x0);
    solid.box(len, 0.18, 1.5, mx, -0.02, mz, C.marbleDark, { ry: ang });
    solid.box(len, 0.10, 0.9, mx, 0.16, mz, C.water, { ry: ang });
  }

  // Five little marble bridges over the stream
  for (const bx of [-8, -4, 0, 4, 8]) {
    const t = bx / streamHalf;
    const bz = streamZ + 3.6 * (1 - t * t);
    solid.group({ x: bx, y: 0, z: bz }, () => {
      solid.box(2.4, 0.15, 0.9, 0, 0, 2.45, C.marbleDark);
      solid.box(2.4, 0.15, 0.9, 0, 0, -2.45, C.marbleDark);
      solid.box(2.2, 0.3, 4.2, 0, 0.10, 0, C.marble);
      solid.box(0.22, 0.6, 4.2, -1.0, 0.38, 0, C.marbleLight);
      solid.box(0.22, 0.6, 4.2, 1.0, 0.38, 0, C.marbleLight);
      solid.box(1.8, 0.14, 0.42, 0, 0.38, -1.85, C.marbleDark);
      solid.box(1.8, 0.14, 0.42, 0, 0.38, 1.85, C.marbleDark);
    });
  }

  // ---------------------------------------------------------------------------
  // Three-tier marble terrace with balustrades and central stair flights
  // ---------------------------------------------------------------------------
  solid.box(30, 1.2, 22, 0, 0, -6, C.marble);
  solid.box(26, 1.2, 18, 0, 1.2, -6, C.marbleLight);
  solid.box(22, 1.2, 14, 0, 2.4, -6, C.marble);

  function balustrade(w, d, y) {
    const edgeX = w / 2;
    const edgeZ = d / 2;
    const ph = 0.8;
    const pw = 0.3;
    for (let x = -edgeX; x <= edgeX + 0.01; x += 2.2) {
      solid.box(pw, ph, pw, x, y, -edgeZ, C.marble);
      if (Math.abs(x) > 4.5) solid.box(pw, ph, pw, x, y, edgeZ, C.marble);
    }
    for (let z = -edgeZ + 2.2; z < edgeZ - 0.01; z += 2.2) {
      solid.box(pw, ph, pw, -edgeX, y, z, C.marble);
      solid.box(pw, ph, pw, edgeX, y, z, C.marble);
    }
    const gap = 4.4;
    const railW = w / 2 - gap;
    const railC = -(w / 4 + gap / 2);
    solid.box(railW, 0.16, 0.28, railC, y + 0.6, edgeZ, C.marbleDark);
    solid.box(railW, 0.16, 0.28, -railC, y + 0.6, edgeZ, C.marbleDark);
    solid.box(w, 0.16, 0.28, 0, y + 0.6, -edgeZ, C.marbleDark);
    solid.box(0.28, 0.16, d, -edgeX, y + 0.6, 0, C.marbleDark);
    solid.box(0.28, 0.16, d, edgeX, y + 0.6, 0, C.marbleDark);
  }

  balustrade(30, 22, 1.2);
  balustrade(26, 18, 2.4);
  balustrade(22, 14, 3.6);

  function flight(yBase, yTop, zLow, zHigh, width, steps) {
    const dz = (zHigh - zLow) / steps;
    const dh = (yTop - yBase) / steps;
    for (let i = 0; i < steps; i++) {
      solid.box(width, dh * (i + 1), Math.abs(dz) + 0.03, 0, yBase, zLow + dz * (i + 0.5), C.marbleLight);
    }
  }

  flight(0, 1.2, 9, 5, 8, 4);
  flight(1.2, 2.4, 5, 3, 8, 4);
  flight(2.4, 3.6, 3, 1, 8, 4);

  // ---------------------------------------------------------------------------
  // Main throne hall: red column grid, 11 bays, double-eave flared roof
  // ---------------------------------------------------------------------------
  const colRows = [0.7, -2.7, -9.3, -12.7];
  for (let i = 0; i < 12; i++) {
    const x = -11 + i * 2;
    for (const z of colRows) {
      solid.box(0.9, 0.4, 0.9, x, 3.6, z, C.marbleDark);
      solid.cyl(0.28, 0.36, 7.2, x, 3.7, z, C.column, 8);
    }
  }

  solid.box(23.4, 6.2, 12.6, 0, 6.7, -6, C.wallDark);
  solid.box(23.7, 0.35, 12.9, 0, 9.7, -6, C.gold);
  solid.box(23.0, 0.3, 12.2, 0, 3.6, -6, C.wallDark);

  for (let i = 0; i < 11; i++) {
    const x = -10 + i * 2;
    solid.box(1.55, 3.6, 0.12, x, 4.0, 0.38, C.door);
    solid.box(1.9, 0.24, 0.2, x, 7.55, 0.4, C.gold);
    glass.box(1.3, 1.3, 0.1, x, 8.2, 0.38, C.glass);
  }
  for (let i = 0; i < 7; i++) {
    glass.box(1.0, 1.2, 0.08, -7.5 + i * 2.5, 14.25, -0.44, C.glass);
  }

  solid.hip(28.5, 18.5, 3.0, 0, 10.8, -6, C.yellow, 1.6);
  solid.box(19, 2.2, 11, 0, 13.8, -6, C.wallDark);
  solid.box(19.2, 0.25, 11.2, 0, 15.75, -6, C.gold);
  solid.hip(24, 14, 3.4, 0, 16.0, -6, C.yellowLight, 1.1);
  solid.box(10, 0.5, 0.7, 0, 19.35, -6, C.gold);
  solid.sphere(0.35, -5.1, 19.85, -6, C.gold, 6);
  solid.sphere(0.35, -2.5, 19.85, -6, C.gold, 6);
  solid.sphere(0.35, 0, 19.85, -6, C.gold, 6);
  solid.sphere(0.35, 2.5, 19.85, -6, C.gold, 6);
  solid.sphere(0.35, 5.1, 19.85, -6, C.gold, 6);

  // ---------------------------------------------------------------------------
  // Rear square hall with pyramid roof
  // ---------------------------------------------------------------------------
  solid.box(9.6, 0.9, 9.6, 0, 0, -21, C.marbleDark);
  solid.box(8, 5.2, 8, 0, 0.9, -21, C.wall);
  solid.box(8.2, 0.3, 8.2, 0, 5.9, -21, C.gold);
  for (const [ox, oz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [0, 3.5], [0, -3.5], [3.5, 0], [-3.5, 0]]) {
    solid.cyl(0.22, 0.28, 5.2, ox, 0.9, -21 + oz, C.column, 8);
  }
  solid.cone(6.2, 3.6, 0, 6.1, -21, C.yellow, 4, { ry: Math.PI / 4 });
  solid.cyl(0.12, 0.22, 0.7, 0, 9.7, -21, C.gold, 6);
  solid.sphere(0.34, 0, 10.5, -21, C.gold, 6);

  // ---------------------------------------------------------------------------
  // Third hall behind the square pavilion
  // ---------------------------------------------------------------------------
  solid.box(14, 0.6, 6, 0, 0, -26.2, C.marbleDark);
  solid.box(13, 5.0, 5, 0, 0.6, -26.2, C.wall);
  solid.box(13.2, 0.26, 5.2, 0, 5.5, -26.2, C.gold);
  for (let i = 0; i < 7; i++) {
    solid.cyl(0.2, 0.26, 5, -6 + i * 2, 0.6, -23.55, C.column, 8);
  }
  solid.hip(16, 6.0, 2.6, 0, 5.6, -26.2, C.yellow, 0.9);
  solid.box(6.6, 0.35, 0.5, 0, 8.0, -26.2, C.gold);
  solid.sphere(0.28, -3.3, 8.25, -26.2, C.gold, 6);
  solid.sphere(0.28, 3.3, 8.25, -26.2, C.gold, 6);

  // ---------------------------------------------------------------------------
  // Flanking side halls along both long sides
  // ---------------------------------------------------------------------------
  for (const s of [-1, 1]) {
    solid.group({ x: s * 18.0, y: 0, z: 0 }, () => {
      solid.box(5.8, 0.55, 22, 0, 0, 0, C.marbleDark);
      solid.box(5.2, 4.2, 21, 0, 0.55, 0, C.wall);
      solid.box(5.35, 0.24, 21.2, 0, 4.55, 0, C.gold);
      for (let k = 0; k < 9; k++) {
        solid.cyl(0.22, 0.28, 4.2, -s * 2.75, 0.55, -8.8 + k * 2.2, C.column, 6);
      }
      solid.hip(24, 6.4, 2.5, 0, 4.75, 0, C.yellow, 0.9, { ry: Math.PI / 2 });
      solid.box(0.55, 0.28, 13.2, 0, 7.1, 0, C.gold);
      solid.sphere(0.25, 0, 7.3, 6.2, C.gold, 6);
      solid.sphere(0.25, 0, 7.3, -6.2, C.gold, 6);
    });
    for (let k = 0; k < 9; k++) {
      glass.box(0.08, 1.5, 1.1, s * 15.37, 2.1, -8.8 + k * 2.2, C.glass);
    }
  }

  // ---------------------------------------------------------------------------
  // Pines
  // ---------------------------------------------------------------------------
  function pine(x, z, sc) {
    solid.group({ x, y: 0, z, s: sc }, () => {
      solid.cyl(0.16, 0.24, 2.0, 0, 0, 0, C.trunk, 6);
      solid.cone(1.2, 1.6, 0, 1.5, 0, C.pineDark, 7);
      solid.cone(0.95, 1.4, 0, 2.5, 0, C.pine, 7);
      solid.cone(0.68, 1.2, 0, 3.35, 0, C.pineLight, 7);
    });
  }

  pine(-19, 23, 1.1);
  pine(19, 23, 1.0);
  pine(-9.5, 19, 0.9);
  pine(9.5, 19, 1.05);
  pine(-19, -14, 1.0);
  pine(19, -14, 1.1);

  // ---------------------------------------------------------------------------
  // Bronze incense burners
  // ---------------------------------------------------------------------------
  function burner(x, z) {
    solid.group({ x, y: 0, z }, () => {
      solid.box(1.3, 0.5, 1.3, 0, 0, 0, C.bronzeDark);
      solid.cyl(0.38, 0.55, 0.45, 0, 0.5, 0, C.bronze, 8);
      solid.cyl(0.7, 0.58, 1.05, 0, 0.95, 0, C.bronzeLight, 8);
      solid.dome(0.72, 0, 2.0, 0, C.bronze, 10);
      solid.sphere(0.2, 0, 2.7, 0, C.gold, 6);
    });
  }

  burner(-5.4, 8);
  burner(5.4, 8);
  burner(-5.4, 17.6);
  burner(5.4, 17.6);

  // ---------------------------------------------------------------------------
  // Bronze guardian lions
  // ---------------------------------------------------------------------------
  for (const s of [-1, 1]) {
    solid.group({ x: s * 6.2, y: 0, z: 19.4 }, () => {
      solid.box(1.5, 0.7, 2.0, 0, 0, 0, C.marbleDark);
      for (const lx of [-0.38, 0.38]) {
        for (const lz of [-0.55, 0.55]) {
          solid.box(0.24, 0.6, 0.24, lx, 0.7, lz, C.bronze);
        }
      }
      solid.box(1.0, 1.1, 1.6, 0, 1.1, 0, C.bronze);
      solid.sphere(0.55, 0, 2.1, 0.62, C.bronzeLight, 8);
      solid.box(0.18, 0.24, 0.18, -0.32, 2.48, 0.62, C.bronzeDark);
      solid.box(0.18, 0.24, 0.18, 0.32, 2.48, 0.62, C.bronzeDark);
      solid.box(0.15, 0.8, 0.15, 0, 1.8, -0.95, C.bronzeDark);
    });
  }

  return {
    solid: solid.build(),
    glass: glass.build(),
    name: '紫宸宫',
    radius: 39,
    height: 22.5,
  };
}
