import { createGeo } from './geo.js';

const TAU = Math.PI * 2;

export function buildPantheon() {
  const g = createGeo();
  const gl = createGeo();

  const TRAV = 0xc9b48e;
  const TRAV_D = 0xa8946f;
  const MARBLE = 0xe8dfc9;
  const MARBLE_D = 0xcfc2a5;
  const GRANITE = 0x8b8073;
  const GRANITE_D = 0x6f655a;
  const DOME = 0x9aa0a2;
  const DOME_D = 0x7d8385;
  const RIB = 0xbcb6a8;
  const BRONZE = 0x5c6b4f;
  const BRONZE_L = 0x7b8a63;
  const WATER = 0x5f8fa8;
  const GREEN = 0x4f6b3a;
  const GREEN_D = 0x3b522b;
  const TRUNK = 0x6b4f32;
  const PAVE = 0xbfb49d;
  const PAVE_D = 0x9a8f7a;
  const GOLD = 0xc9a24a;

  const ROT = -10;
  const R = 17.2;
  const BASE = 23.3;

  function statue(x, y, z, s, hex, ry = 0) {
    g.group({ x, y, z, ry, s }, () => {
      g.box(0.32, 0.72, 0.34, -0.18, 0, 0, hex);
      g.box(0.32, 0.72, 0.34, 0.18, 0, 0, hex);
      g.box(0.68, 0.82, 0.44, 0, 0.68, 0, hex);
      g.box(0.2, 0.72, 0.2, -0.46, 0.76, 0.02, hex, { rz: 0.18 });
      g.box(0.2, 0.72, 0.2, 0.46, 0.76, 0.02, hex, { rz: -0.18 });
      g.sphere(0.24, 0, 1.68, 0, hex, 7);
      g.box(0.5, 0.9, 0.18, 0, 0.55, -0.26, hex, { rx: -0.08 });
    });
  }

  function cypress(x, z, s = 1) {
    g.cyl(0.18 * s, 0.3 * s, 1.4 * s, x, 0.35, z, TRUNK, 6);
    for (let i = 0; i < 4; i++) {
      g.cone((1.15 - i * 0.22) * s, (2.6 - i * 0.3) * s, x, 0.9 * s + i * 1.05 * s, z, i % 2 ? GREEN : GREEN_D, 7);
    }
  }

  function column(x, y, z, h) {
    g.group({ x, y, z }, () => {
      g.box(1.8, 0.4, 1.8, 0, 0, 0, MARBLE_D);
      g.cyl(0.82, 0.94, 0.45, 0, 0.4, 0, MARBLE, 10);
      g.cyl(0.62, 0.82, h, 0, 0.85, 0, GRANITE, 12);
      for (let f = 0; f < 10; f++) {
        const a = (f / 10) * TAU;
        g.box(0.1, h * 0.9, 0.1, Math.sin(a) * 0.7, 1.0, Math.cos(a) * 0.7, GRANITE_D, { ry: a });
      }
      g.cyl(0.72, 0.62, 0.35, 0, 0.85 + h, 0, MARBLE, 10);
      for (let f = 0; f < 8; f++) {
        const a = (f / 8) * TAU;
        g.box(0.26, 0.5, 0.18, Math.sin(a) * 0.64, 0.97 + h, Math.cos(a) * 0.64, MARBLE_D, { ry: a });
      }
      g.box(1.5, 0.24, 1.5, 0, 1.3 + h, 0, MARBLE);
      g.box(1.8, 0.22, 1.8, 0, 1.54 + h, 0, MARBLE_D);
    });
  }

  function lamp(x, z) {
    g.cyl(0.42, 0.55, 0.5, x, 0.65, z, TRAV_D, 8);
    g.cyl(0.16, 0.24, 3.1, x, 1.15, z, GRANITE, 8);
    g.box(0.72, 0.16, 0.72, x, 4.25, z, BRONZE);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.box(0.09, 0.7, 0.09, x + sx * 0.28, 4.41, z + sz * 0.28, BRONZE);
    }
    g.cone(0.5, 0.45, x, 5.11, z, BRONZE, 6);
    gl.box(0.5, 0.62, 0.5, x, 4.43, z, 0xffd98a);
  }

  // Rotunda podium and drum.
  g.cyl(18.6, 18.6, 0.55, 0, 0, ROT, TRAV_D, 16);
  g.cyl(18.1, 18.1, 0.5, 0, 0.55, ROT, TRAV, 16);
  g.cyl(17.7, 17.7, 0.55, 0, 1.05, ROT, MARBLE_D, 16);
  g.cyl(17.4, 17.4, 0.5, 0, 1.6, ROT, TRAV, 16);
  g.cyl(17.3, 17.3, 1.0, 0, 2.1, ROT, TRAV_D, 16);
  g.cyl(17.0, 17.0, 18.8, 0, 3.1, ROT, TRAV, 16);

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    g.group({ ry: a }, () => {
      g.box(0.8, 1.3, 1.9, 17.05, 3.1, 0, MARBLE_D);
      g.box(0.62, 16.6, 1.25, 17.1, 4.4, 0, MARBLE);
      g.box(0.9, 0.45, 1.8, 17.0, 21.0, 0, MARBLE_D);
      g.box(0.08, 15.9, 0.16, 17.44, 4.7, -0.32, TRAV_D);
      g.box(0.08, 15.9, 0.16, 17.44, 4.7, 0.32, TRAV_D);
    });
    const b = a + Math.PI / 16;
    g.group({ ry: b }, () => {
      g.box(0.25, 8.6, 2.5, 17.02, 6.0, 0, TRAV_D);
      g.box(0.34, 0.55, 3.1, 17.0, 14.7, 0, MARBLE_D);
      g.box(0.34, 0.55, 3.1, 17.0, 5.4, 0, MARBLE_D);
      if (i % 2 === 0) {
        gl.group({ ry: b }, () => {
          gl.box(0.08, 3.4, 1.3, 17.26, 8.9, 0, 0x9fc4d8);
        });
      }
    });
  }

  g.cyl(17.3, 17.3, 0.55, 0, 18.4, ROT, MARBLE_D, 16);
  for (let i = 0; i < 48; i++) {
    g.group({ ry: (i / 48) * TAU }, () => {
      g.box(0.32, 0.5, 0.62, 17.34, 19.0, 0, MARBLE);
    });
  }
  g.cyl(17.8, 17.8, 0.5, 0, 21.0, ROT, MARBLE, 16);
  g.cyl(17.5, 17.5, 0.45, 0, 21.5, ROT, TRAV, 16);
  g.cyl(17.9, 17.9, 0.45, 0, 21.95, ROT, MARBLE, 16);
  g.cyl(17.5, 17.5, 0.4, 0, 22.4, ROT, TRAV_D, 16);
  g.cyl(17.2, 17.2, 0.35, 0, 22.8, ROT, MARBLE, 16);

  // Rear apse and buttresses.
  g.box(14, 14.5, 4.2, 0, 2.1, -28.2, TRAV);
  g.box(15, 0.6, 5.0, 0, 16.6, -28.2, MARBLE_D);
  g.box(2.4, 12.0, 2.4, -7.6, 2.1, -26.0, TRAV_D);
  g.box(2.4, 12.0, 2.4, 7.6, 2.1, -26.0, TRAV_D);

  // Dome, stepped base rings and bronze-rimmed oculus.
  g.dome(R, 0, BASE, ROT, DOME, 16);
  const ringT = [0.32, 0.47, 0.62, 0.77, 0.92, 1.07, 1.22, 1.37, 1.48];
  for (const t of ringT) {
    const rr = R * Math.sin(t);
    const yy = BASE + R * Math.cos(t);
    g.ring(rr, 0.16, 0, yy, ROT, RIB, 32);
  }
  for (let j = 0; j < 24; j++) {
    const a = (j / 24) * TAU;
    g.group({ ry: a }, () => {
      for (let i = 0; i < 8; i++) {
        const t0 = ringT[i];
        const t1 = ringT[i + 1];
        const tm = (t0 + t1) / 2;
        const rr = R * Math.sin(tm);
        const yy = BASE + R * Math.cos(tm);
        const len = R * (t1 - t0) * 1.15;
        g.box(0.26, len, 0.34, rr, yy - len / 2, 0, RIB, { rz: -(Math.PI / 2 + tm) });
      }
    });
  }
  for (let i = 0; i < 8; i++) {
    const t0 = ringT[i];
    const t1 = ringT[i + 1];
    const tm = (t0 + t1) / 2;
    const rr = R * Math.sin(tm);
    const yy = BASE + R * Math.cos(tm);
    const ph = R * (t1 - t0) * 0.62;
    for (let j = 0; j < 28; j++) {
      const a = ((j + 0.5) / 28) * TAU;
      g.group({ ry: a }, () => {
        g.box(0.14, ph, 0.52, rr + 0.08, yy, 0, DOME_D, { rz: -(Math.PI / 2 + tm) });
        g.box(0.12, ph * 0.7, 0.34, rr + 0.19, yy, 0, 0x6b7173, { rz: -(Math.PI / 2 + tm) });
      });
    }
  }
  g.cyl(2.7, 2.7, 0.5, 0, BASE + R - 1.1, ROT, 0x3b3f40, 16);
  g.ring(2.65, 0.42, 0, BASE + R - 0.55, ROT, BRONZE, 32);
  g.ring(3.15, 0.24, 0, BASE + R + 0.55, ROT, BRONZE_L, 32);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    g.group({ ry: a }, () => {
      g.box(0.14, 1.0, 0.14, 2.9, BASE + R - 0.05, 0, BRONZE, { rz: 0.15 });
    });
  }
  g.sphere(0.38, 0, BASE + R + 1.12, ROT, GOLD, 8);

  // Intermediate block and deep portico podium.
  g.box(30, 18.8, 7.6, 0, 2.1, 10.2, TRAV);
  g.box(30.6, 0.6, 8.2, 0, 2.1, 10.2, MARBLE_D);
  g.box(30.4, 0.5, 8.0, 0, 20.6, 10.2, MARBLE);
  g.box(31.0, 3.0, 16.0, 0, 0, 14.0, TRAV_D);
  g.box(30.4, 0.45, 15.4, 0, 3.0, 14.0, MARBLE);
  for (let i = 0; i < 5; i++) {
    g.box(30.4 - i * 0.55, 2.7 - i * 0.54, 1.15, 0, 0, 22.2 + i * 0.95, i % 2 ? MARBLE_D : TRAV);
  }

  const fx = [-13.3, -9.5, -5.7, -1.9, 1.9, 5.7, 9.5, 13.3];
  for (const x of fx) column(x, 3.0, 20.0, 13.0);
  for (const x of [-9.6, -3.2, 3.2, 9.6]) column(x, 3.0, 16.5, 13.0);
  for (const x of [-9.6, -3.2, 3.2, 9.6]) column(x, 3.0, 13.0, 13.0);

  g.box(30.4, 1.5, 9.0, 0, 17.76, 17.5, MARBLE);
  g.box(30.8, 0.5, 9.4, 0, 19.26, 17.5, MARBLE_D);
  g.gable(30.4, 5.0, 9.0, 0, 19.76, 17.5, MARBLE_D);
  g.gable(27.4, 4.25, 0.35, 0, 19.95, 22.0, TRAV);
  g.box(21.5, 0.85, 0.3, 0, 18.1, 22.06, MARBLE_D);
  for (let r = 0; r < 2; r++) {
    for (let x = -9.8; x <= 9.8; x += 0.72) {
      g.box(0.36, 0.24, 0.12, x, 18.24 + r * 0.42, 22.24, BRONZE);
    }
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const f = (k + 0.5) / 5;
      g.box(3.5, 0.5, 0.34, s * 15.2 * (1 - f), 19.95 + 5 * f, 22.12, k % 2 ? MARBLE : MARBLE_D, { rz: -s * 0.318 });
    }
  }
  statue(-6.0, 20.0, 22.2, 0.95, MARBLE_D);
  statue(0, 20.0, 22.2, 0.95, MARBLE_D);
  statue(6.0, 20.0, 22.2, 0.95, MARBLE_D);
  g.group({ x: 0, y: 24.7, z: 21.9 }, () => {
    g.box(1.4, 0.35, 1.0, 0, 0, 0, BRONZE);
    g.box(0.3, 1.1, 0.3, 0, 0.35, 0, BRONZE_L);
    g.box(2.0, 0.18, 0.22, 0, 1.05, 0, BRONZE);
    g.box(0.18, 0.5, 0.5, -1.0, 0.7, 0, BRONZE);
    g.box(0.18, 0.5, 0.5, 1.0, 0.7, 0, BRONZE);
  });

  // Coffered portico ceiling.
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 3; j++) {
      g.box(1.3, 0.24, 1.3, -12.3 + i * 4.1, 17.55, 14.4 + j * 2.9, MARBLE_D);
    }
  }
  for (let i = 0; i < 8; i++) {
    g.box(0.28, 0.3, 8.8, -13.7 + i * 3.9, 17.55, 17.4, MARBLE);
  }

  // Bronze doors with relief panels.
  g.box(8.2, 11.2, 0.5, 0, 3.0, 14.15, BRONZE);
  g.box(8.8, 0.6, 0.7, 0, 13.9, 14.15, MARBLE_D);
  g.box(0.6, 11.2, 0.7, -4.3, 3.0, 14.15, MARBLE);
  g.box(0.6, 11.2, 0.7, 4.3, 3.0, 14.15, MARBLE);
  for (const sx of [-1, 1]) {
    g.box(3.5, 10.3, 0.22, sx * 1.95, 3.25, 14.42, BRONZE_L);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        g.box(1.05, 1.55, 0.12, sx * 1.95 + (c - 0.5) * 1.5, 3.85 + r * 2.35, 14.55, BRONZE);
      }
    }
  }

  // Piazza paving, balustrades and ceremonial lamps.
  g.box(40, 0.45, 10.0, 0, 0, 26.0, PAVE);
  g.box(40.4, 0.2, 10.0, 0, 0.45, 26.0, PAVE_D);
  for (let i = 0; i < 9; i++) {
    g.box(39.6, 0.04, 0.42, 0, 0.65, 22.1 + i * 1.05, i % 2 ? PAVE_D : PAVE);
  }
  for (const s of [-1, 1]) {
    g.box(0.8, 0.3, 8.6, s * 19.6, 0.65, 26.2, MARBLE_D);
    g.box(0.5, 0.45, 0.5, s * 19.6, 0.95, 22.3, MARBLE);
    g.box(0.5, 0.45, 0.5, s * 19.6, 0.95, 30.1, MARBLE);
    for (let i = 0; i < 12; i++) {
      g.cyl(0.12, 0.17, 0.8, s * 19.6, 0.95, 22.8 + i * 0.62, MARBLE, 6);
    }
    g.box(0.55, 0.25, 8.2, s * 19.6, 1.75, 26.2, MARBLE_D);
  }
  lamp(-9, 26.8);
  lamp(9, 26.8);
  lamp(-9, 30.2);
  lamp(9, 30.2);

  // Fountain with Egyptian obelisk at the piazza centre.
  g.group({ z: 28.05 }, () => {
    g.cyl(2.55, 2.85, 0.8, 0, 0.5, 0, TRAV_D, 16);
    g.cyl(2.3, 2.3, 0.45, 0, 1.25, 0, MARBLE, 16);
    g.cyl(2.1, 2.1, 0.35, 0, 1.3, 0, WATER, 16);
    g.cyl(1.35, 1.7, 1.0, 0, 1.55, 0, TRAV, 16);
    g.box(2.5, 1.3, 2.5, 0, 2.5, 0, MARBLE_D);
    g.box(1.85, 0.5, 1.85, 0, 3.8, 0, MARBLE);
    g.cyl(0.55, 0.95, 7.0, 0, 4.3, 0, GRANITE, 4, { ry: Math.PI / 4 });
    g.cyl(0.58, 0.88, 0.12, 0, 6.1, 0, GOLD, 4, { ry: Math.PI / 4 });
    g.cyl(0.6, 0.82, 0.12, 0, 7.8, 0, GOLD, 4, { ry: Math.PI / 4 });
    g.cone(0.72, 1.15, 0, 11.3, 0, GOLD, 4, { ry: Math.PI / 4 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.cyl(0.05, 0.1, 1.3, Math.cos(a) * 2.15, 1.65, Math.sin(a) * 2.15, 0xbfe0ea, 6);
    }
    for (const a of [0.4, 2.0, 3.6, 5.0]) {
      g.group({ x: Math.cos(a) * 2.35, z: Math.sin(a) * 2.35, ry: -a }, () => {
        g.box(0.55, 0.4, 0.55, 0, 1.5, 0, MARBLE);
        g.box(0.3, 0.75, 0.3, 0, 1.9, 0, BRONZE);
        g.sphere(0.2, 0, 2.75, 0, BRONZE_L, 6);
        g.box(0.5, 0.18, 0.18, 0.2, 2.45, 0, BRONZE, { rz: -0.5 });
      });
    }
  });
  g.box(9.5, 0.04, 0.5, 0, 0.7, 26.6, PAVE_D);
  g.box(9.5, 0.04, 0.5, 0, 0.7, 30.2, PAVE_D);

  // Statues flanking the approach, garden beds and cypresses.
  for (const s of [-1, 1]) {
    g.box(2.2, 0.7, 2.2, s * 13.0, 0.65, 28.0, TRAV_D);
    g.box(1.8, 0.5, 1.8, s * 13.0, 1.35, 28.0, MARBLE);
    statue(s * 13.0, 1.85, 28.0, 1.5, MARBLE, -s * 0.5);
    g.box(3.4, 0.5, 3.4, s * 17.6, 0.45, 23.3, TRAV_D);
    g.cyl(1.45, 1.45, 0.35, s * 17.6, 0.95, 23.3, GREEN, 12);
    cypress(s * 17.6, 23.3, 1.15);
    g.box(3.0, 0.5, 3.0, s * 17.6, 0.45, 29.4, TRAV_D);
    g.cyl(1.3, 1.3, 0.35, s * 17.6, 0.95, 29.4, GREEN, 12);
    cypress(s * 17.6, 29.4, 0.95);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.sphere(0.22, s * 17.6 + Math.cos(a) * 1.0, 1.35, 23.3 + Math.sin(a) * 1.0, i % 2 ? GREEN : GOLD, 5);
    }
  }

  return { solid: g.build(), glass: gl.build(), name: '万神殿', radius: 31, height: 42.0 };
}

export function buildTriumphalArch() {
  const g = createGeo();
  const gl = createGeo();

  const TRAV = 0xcdbb96;
  const LIGHT = 0xe6dcc4;
  const DARK = 0xb8a684;
  const PANEL = 0x8f7c5e;
  const SHADOW = 0x594f3e;
  const BRONZE = 0x5d6b4e;
  const BRONZE_D = 0x45523b;
  const BRONZE_L = 0x7c8a62;
  const GOLD = 0xc9a24a;
  const BANNER = 0x7a3b2e;

  const BODY_TOP = 21.0;
  const ATTIC_TOP = 28.6;

  function statue(x, y, z, s, hex, ry = 0) {
    g.group({ x, y, z, ry, s }, () => {
      g.box(0.3, 0.7, 0.32, -0.17, 0, 0, hex);
      g.box(0.3, 0.7, 0.32, 0.17, 0, 0, hex);
      g.box(0.64, 0.8, 0.42, 0, 0.66, 0, hex);
      g.box(0.18, 0.7, 0.18, -0.43, 0.72, 0.02, hex, { rz: 0.22 });
      g.box(0.18, 0.7, 0.18, 0.43, 0.72, 0.02, hex, { rz: -0.3 });
      g.sphere(0.23, 0, 1.64, 0, hex, 7);
      g.box(0.46, 0.85, 0.16, 0, 0.55, -0.25, hex, { rx: -0.06 });
    });
  }

  function captive(x, y, z, face) {
    g.group({ x, y, z, ry: face > 0 ? 0 : Math.PI }, () => {
      g.box(1.2, 0.24, 1.0, 0, 0, 0, LIGHT);
      g.box(0.3, 0.72, 0.32, -0.16, 0.24, 0, BRONZE_D);
      g.box(0.3, 0.72, 0.32, 0.16, 0.24, 0, BRONZE_D);
      g.box(0.66, 0.82, 0.42, 0, 0.9, 0, BRONZE);
      g.box(0.18, 0.72, 0.18, -0.46, 0.94, 0.02, BRONZE, { rz: 0.28 });
      g.box(0.18, 0.72, 0.18, 0.46, 0.94, 0.02, BRONZE, { rz: -0.28 });
      g.sphere(0.23, 0, 1.92, 0, BRONZE_L, 7);
      g.box(0.3, 0.2, 0.3, 0, 2.1, -0.04, BRONZE_D);
      g.box(0.5, 0.7, 0.15, 0, 0.75, -0.26, BANNER);
      g.box(0.12, 0.5, 0.12, -0.4, 0.5, 0.24, LIGHT);
      g.box(0.12, 0.5, 0.12, 0.4, 0.5, 0.24, LIGHT);
    });
  }

  function column(x, y, z, h) {
    g.group({ x, y, z }, () => {
      g.box(1.55, 0.42, 1.55, 0, 0, 0, LIGHT);
      g.cyl(0.55, 0.7, 0.35, 0, 0.42, 0, TRAV, 12);
      g.cyl(0.44, 0.56, h, 0, 0.77, 0, LIGHT, 12);
      for (let f = 0; f < 10; f++) {
        const a = (f / 10) * TAU;
        g.box(0.07, h * 0.92, 0.07, Math.sin(a) * 0.5, 0.9, Math.cos(a) * 0.5, PANEL, { ry: a });
      }
      g.cyl(0.52, 0.44, 0.3, 0, 0.77 + h, 0, LIGHT, 10);
      for (let f = 0; f < 8; f++) {
        const a = (f / 8) * TAU;
        g.box(0.24, 0.42, 0.14, Math.sin(a) * 0.46, 0.9 + h, Math.cos(a) * 0.46, PANEL, { ry: a });
      }
      g.box(1.05, 0.22, 1.05, 0, 1.07 + h, 0, LIGHT);
      g.sphere(0.16, -0.38, 1.1 + h, 0, TRAV, 6);
      g.sphere(0.16, 0.38, 1.1 + h, 0, TRAV, 6);
    });
  }

  function pedestal(x, z, face) {
    g.box(2.45, 0.55, 2.05, x, 1.4, z, LIGHT);
    g.box(2.15, 6.0, 1.75, x, 1.95, z, TRAV);
    g.box(2.35, 0.45, 1.95, x, 7.55, z, LIGHT);
    g.box(2.55, 0.28, 2.15, x, 7.95, z, DARK);
    const zf = z + face * 0.9;
    g.box(1.25, 1.7, 0.14, x, 2.55, zf, PANEL);
    g.box(1.25, 1.7, 0.14, x, 4.55, zf, PANEL);
    g.box(0.36, 1.2, 0.18, x - 0.3, 2.85, zf + face * 0.05, SHADOW);
    g.box(0.36, 1.2, 0.18, x + 0.3, 4.8, zf + face * 0.05, SHADOW);
  }

  // Podium, piers and arched spandrels.
  g.box(35, 0.9, 17, 0, 0, 0, DARK);
  g.box(34.2, 0.5, 16.2, 0, 0.9, 0, LIGHT);
  for (const s of [-1, 1]) {
    g.box(5.0, BODY_TOP - 1.4, 14, s * 14.5, 1.4, 0, TRAV);
    g.box(2.8, BODY_TOP - 1.4, 14, s * 6.0, 1.4, 0, TRAV);
    g.box(4.6, 11.4, 14, s * 9.7, 9.6, 0, TRAV);
    g.box(5.4, 0.5, 14.6, s * 14.5, 1.4, 0, LIGHT);
    g.box(3.1, 0.5, 14.6, s * 6.0, 1.4, 0, LIGHT);
    g.box(5.2, 0.55, 14.6, s * 14.5, BODY_TOP - 0.55, 0, LIGHT);
    g.box(3.0, 0.55, 14.6, s * 6.0, BODY_TOP - 0.55, 0, LIGHT);
  }
  g.box(9.2, 7.0, 14, 0, 14.0, 0, TRAV);
  g.box(9.6, 0.6, 14.6, 0, 13.6, 0, LIGHT);
  g.box(34.6, 0.8, 14.6, 0, BODY_TOP - 0.6, 0, LIGHT);
  g.box(35.0, 0.5, 15.0, 0, BODY_TOP, 0, DARK);

  for (const z of [7.05, -7.05]) {
    g.arch(5.0, 0.4, 0.6, 0, 9.4, z, LIGHT, 16);
    for (const s of [-1, 1]) g.arch(2.7, 0.4, 0.6, s * 9.7, 7.3, z, LIGHT, 16);
    g.box(0.85, 1.3, 0.85, 0, 13.55, z + Math.sign(z) * 0.12, LIGHT);
    g.box(0.6, 0.9, 0.7, 9.7, 9.45, z + Math.sign(z) * 0.12, LIGHT);
    g.box(0.6, 0.9, 0.7, -9.7, 9.45, z + Math.sign(z) * 0.12, LIGHT);
  }
  g.arch(4.7, 0.12, 13.9, 0, 9.4, 0, SHADOW, 16);
  for (const s of [-1, 1]) g.arch(2.42, 0.1, 13.9, s * 9.7, 7.3, 0, SHADOW, 16);

  // Detached Corinthian columns and pedestals on both faces.
  for (const z of [7.7, -7.7]) {
    const face = Math.sign(z);
    for (const x of [-14.5, -6.0, 6.0, 14.5]) {
      pedestal(x, z, face);
      column(x, 8.2, z, 10.9);
      captive(x, 20.35, z + face * 0.05, face);
    }
  }

  // Roundel reliefs over the side arches.
  for (const z of [7.12, -7.12]) {
    const face = Math.sign(z);
    for (const x of [-9.7, 9.7]) {
      g.cyl(1.55, 1.55, 0.3, x, 14.85, z, PANEL, 16, { rx: Math.PI / 2 });
      g.cyl(1.22, 1.22, 0.38, x, 14.85, z + face * 0.05, LIGHT, 16, { rx: Math.PI / 2 });
      g.sphere(0.48, x, 15.05, z + face * 0.3, DARK, 7);
      g.box(0.62, 0.8, 0.24, x, 14.35, z + face * 0.28, DARK);
    }
  }

  // Tall attic with inscription and relief panels.
  g.box(34, 7.2, 14, 0, 21.4, 0, TRAV);
  g.box(35.0, 0.6, 15.0, 0, ATTIC_TOP, 0, LIGHT);
  g.box(34.2, 0.4, 14.2, 0, ATTIC_TOP + 0.6, 0, TRAV);
  for (const z of [7.15, -7.15]) {
    const face = Math.sign(z);
    g.box(14.0, 2.45, 0.3, 0, 23.2, z, PANEL);
    for (let r = 0; r < 2; r++) {
      for (let x = -6.2; x <= 6.2; x += 0.62) {
        g.box(0.3, 0.22, 0.12, x, 22.55 + r * 0.7, z + face * 0.2, GOLD);
      }
    }
    for (const x of [-12.4, 12.4]) {
      g.box(4.2, 2.2, 0.3, x, 23.2, z, PANEL);
      for (let i = 0; i < 3; i++) g.box(0.5, 1.5, 0.16, x - 1.1 + i * 1.1, 23.45, z + face * 0.2, SHADOW);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.box(0.3, 0.3, 0.14, Math.cos(a) * 0.9, 26.4 + Math.sin(a) * 0.9, z + face * 0.24, GOLD);
    }
    for (const sx of [-1, 1]) {
      g.box(0.15, 3.0, 0.15, sx * 14.2, 24.1, z + face * 0.3, BRONZE_D);
      g.box(1.3, 2.1, 0.12, sx * 14.2, 24.6, z + face * 0.36, BANNER);
    }
  }
  for (const s of [-1, 1]) {
    statue(s * 15.6, 29.6, 6.1, 1.3, GOLD, -s * 0.2);
    statue(s * 15.6, 29.6, -6.1, 1.3, GOLD, Math.PI + s * 0.2);
  }

  // Bronze quadriga: four horses, chariot and standing figure.
  g.box(10.5, 0.7, 5.6, 0, 29.6, 0, BRONZE_D);
  g.box(9.6, 0.3, 4.8, 0, 30.3, 0, BRONZE);
  for (const hx of [-2.55, -0.85, 0.85, 2.55]) {
    g.box(0.5, 0.85, 1.7, hx, 31.45, 0.35, BRONZE);
    g.box(0.42, 0.9, 0.45, hx, 32.1, 1.28, BRONZE, { rx: -0.5 });
    g.box(0.36, 0.5, 0.72, hx, 32.7, 1.6, BRONZE_D);
    g.box(0.12, 0.22, 0.12, hx - 0.12, 33.16, 1.42, BRONZE_D);
    g.box(0.12, 0.22, 0.12, hx + 0.12, 33.16, 1.42, BRONZE_D);
    for (const lx of [-0.17, 0.17]) {
      for (const lz of [0.95, 1.05, -0.35, -0.45]) {
        g.box(0.12, 0.95, 0.12, hx + lx, 30.55, lz, BRONZE_D);
      }
    }
    g.box(0.14, 0.7, 0.14, hx, 31.0, -0.55, BRONZE_D, { rx: 0.4 });
    g.box(0.1, 0.55, 0.1, hx, 32.95, 0.45, BRONZE_L);
  }
  g.box(3.0, 1.0, 1.8, 0, 30.6, -1.7, BRONZE_D);
  g.box(3.2, 0.2, 2.0, 0, 31.6, -1.7, BRONZE);
  g.cyl(0.62, 0.62, 0.18, -1.5, 30.55, -1.7, BRONZE, 12, { rz: Math.PI / 2 });
  g.cyl(0.62, 0.62, 0.18, 1.5, 30.55, -1.7, BRONZE, 12, { rz: Math.PI / 2 });
  g.box(0.55, 1.0, 0.42, 0, 31.65, -1.9, BRONZE_D);
  g.sphere(0.26, 0, 32.95, -1.9, BRONZE_L, 7);
  g.box(0.18, 0.85, 0.18, -0.42, 31.7, -1.88, BRONZE, { rz: 0.55 });
  g.box(0.18, 0.85, 0.18, 0.42, 31.7, -1.88, BRONZE, { rz: -0.55 });
  g.box(0.12, 1.2, 0.12, 0.55, 33.0, -1.88, GOLD);
  g.box(0.42, 0.3, 0.42, 0.55, 34.0, -1.88, GOLD);
  g.box(0.5, 0.35, 0.5, 0, 33.2, -1.9, GOLD);

  return { solid: g.build(), glass: null, name: '凯旋门', radius: 18, height: 34.3 };
}
