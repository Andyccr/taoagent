import { createGeo } from './geo.js';

export function buildAcropolis() {
  const geo = createGeo();

  const ROCK0 = 0x9a8f7c;
  const ROCK1 = 0xa89d88;
  const ROCK2 = 0xb5aa93;
  const ROCK3 = 0xc0b59d;
  const MARBLE = 0xeee9dd;
  const MARBLE_D = 0xd9d2c3;
  const MARBLE_L = 0xf7f3ea;
  const PALE = 0xf4efe3;
  const GOLD = 0xd4a73a;
  const BRONZE = 0x8a6d43;
  const BRONZE_L = 0xa98a58;
  const OLIVE = 0x7f8a63;
  const OLIVE_D = 0x6b7653;
  const BARK = 0x6b5a3e;

  // ---------------------------------------------------------------- hill
  const basePoly = [
    [-13, -22], [13, -22], [17, -18], [17, 18],
    [13, 22], [-13, 22], [-17, 18], [-17, -18],
  ];
  const midPoly = [
    [-11.5, -20], [11.5, -20], [15, -16.5], [15, 16.5],
    [11.5, 20], [-11.5, 20], [-15, 16.5], [-15, -16.5],
  ];
  const upperPoly = [
    [-10, -18.5], [10, -18.5], [12.5, -15.5], [12.5, 15.5],
    [10, 18.5], [-10, 18.5], [-12.5, 15.5], [-12.5, -15.5],
  ];
  const plateauPoly = [
    [-9, -17], [9, -17], [10.2, -16.2], [11, -14.8],
    [11, 14.8], [10.2, 16.2], [9, 17], [-9, 17],
    [-10.2, 16.2], [-11, 14.8], [-11, -14.8], [-10.2, -16.2],
  ];

  geo.group({ ry: 0.1 }, () => {
    geo.prism(basePoly, 3.2, 0, ROCK0);
  });
  geo.group({ ry: 0.06 }, () => {
    geo.prism(midPoly, 2.8, 3.2, ROCK1);
  });
  geo.prism(upperPoly, 2.1, 6.0, ROCK2);
  geo.prism(plateauPoly, 0.9, 8.1, ROCK3);

  // rocky outcrops around the base
  const outcrops = [
    [-15.5, 8, 0.4, 3.0, 1.6, 2.4],
    [15.0, 11, -0.5, 2.6, 2.0, 2.0],
    [-14.5, -9, 0.9, 2.4, 1.4, 2.6],
    [14.8, -12, -0.7, 3.2, 1.8, 2.2],
    [-11.0, 17.5, 0.2, 2.8, 1.3, 2.0],
    [11.5, 18.0, -0.3, 2.4, 1.5, 2.4],
  ];
  for (const [x, z, ry, w, h, d] of outcrops) {
    geo.box(w, h, d, x, 0, z, ROCK0, { ry, rz: 0.08 });
  }

  // ---------------------------------------------------------------- stairs
  function flightX(x0, x1, z, y0, y1, depth, n, hex) {
    const dx = (x1 - x0) / n;
    const rise = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 + dx * (i + 0.5);
      const h = (i + 1) * rise;
      geo.box(Math.abs(dx) + 0.04, h, depth, cx, y0, z, hex);
    }
  }

  flightX(-7, 1, 22.5, 0, 3, 2.6, 12, MARBLE_D);
  geo.box(2.2, 3.0, 2.6, 2.0, 0, 22.5, ROCK2);
  flightX(1, -6, 21.2, 3, 6, 2.6, 11, MARBLE_D);
  geo.box(2.2, 6.0, 2.6, -7.0, 0, 21.2, ROCK2);
  flightX(-6, 1, 19.9, 6, 9, 2.6, 11, MARBLE_D);
  geo.box(3.6, 1.0, 3.4, 1.5, 8.0, 18.3, ROCK2);
  geo.box(3.6, 0.2, 3.4, 1.5, 9.0, 18.3, MARBLE_D);

  // stair side rails on the top flight
  for (const zz of [18.75, 21.05]) {
    geo.box(7.4, 0.45, 0.22, -2.5, 6.4, zz, MARBLE);
  }

  // ---------------------------------------------------------------- gateway
  const GZ = 14.6;
  geo.box(11.2, 0.5, 5.2, 0, 9.0, GZ, MARBLE_D);
  geo.box(10.4, 0.25, 1.0, 0, 9.0, GZ + 2.9, MARBLE);
  for (let i = 0; i < 6; i++) {
    const x = -3.75 + i * 1.5;
    geo.cyl(0.40, 0.44, 4.1, x, 9.5, GZ - 1.1, MARBLE, 8);
    geo.box(0.95, 0.20, 0.95, x, 13.6, GZ - 1.1, MARBLE_L);
  }
  geo.box(10.6, 0.65, 4.6, 0, 13.8, GZ, MARBLE);
  geo.box(10.9, 0.40, 4.9, 0, 14.45, GZ, MARBLE_D);
  geo.gable(5.2, 1.5, 11.0, 0, 14.85, GZ, MARBLE_D, { ry: Math.PI / 2 });
  geo.gable(0.28, 1.2, 10.2, 0, 14.95, GZ + 2.62, PALE, { ry: Math.PI / 2 });
  geo.gable(0.28, 1.2, 10.2, 0, 14.95, GZ - 2.62, PALE, { ry: Math.PI / 2 });
  // gateway side walls
  geo.box(0.45, 4.1, 3.0, -4.9, 9.5, GZ + 0.4, MARBLE_D);
  geo.box(0.45, 4.1, 3.0, 4.9, 9.5, GZ + 0.4, MARBLE_D);

  // ---------------------------------------------------------------- temple
  const TZ = -3.0;
  geo.box(13.4, 0.45, 27.4, 0, 9.00, TZ, MARBLE_D);
  geo.box(12.8, 0.45, 26.8, 0, 9.45, TZ, MARBLE);
  geo.box(12.2, 0.45, 26.2, 0, 9.90, TZ, MARBLE_L);

  const COL_TOP = 10.35 + 5.0;
  function column(x, z, h = 5.0, r = 0.48) {
    geo.cyl(r, r * 1.06, h, x, 10.35, z, MARBLE, 8);
    geo.box(r * 2.4, 0.24, r * 2.4, x, 10.35 + h, z, MARBLE_L);
  }

  // 8 across the front / back, 17 along each side
  for (let i = 0; i < 8; i++) {
    const x = -5.25 + i * 1.5;
    column(x, TZ + 12.25);
    column(x, TZ - 12.25);
  }
  for (let i = 1; i < 16; i++) {
    const z = TZ - 12.25 + i * 1.53125;
    column(-5.25, z);
    column(5.25, z);
  }

  geo.box(12.2, 0.85, 26.2, 0, COL_TOP + 0.24, TZ, MARBLE);
  geo.box(12.6, 0.60, 26.6, 0, 16.44, TZ, MARBLE_D);
  geo.box(13.2, 0.45, 27.2, 0, 17.04, TZ, MARBLE_L);

  // triglyph blocks on the frieze
  for (let i = 0; i < 12; i++) {
    const x = -5.5 + i * 1.0;
    geo.box(0.28, 0.6, 0.12, x, 16.44, TZ + 13.32, MARBLE);
    geo.box(0.28, 0.6, 0.12, x, 16.44, TZ - 13.32, MARBLE);
  }

  // pediments (ridge along z) + pale tympana
  geo.gable(27.6, 2.4, 13.6, 0, 17.49, TZ, MARBLE_D, { ry: Math.PI / 2 });
  geo.gable(0.30, 2.0, 12.6, 0, 17.62, TZ + 13.82, PALE, { ry: Math.PI / 2 });
  geo.gable(0.30, 2.0, 12.6, 0, 17.62, TZ - 13.82, PALE, { ry: Math.PI / 2 });
  geo.box(0.5, 0.28, 27.4, 0, 19.62, TZ, MARBLE_L);
  // acroteria
  for (const zz of [TZ + 13.8, TZ, TZ - 13.8]) {
    geo.cone(0.22, 0.55, 0, zz === TZ ? 19.85 : 19.85, zz, MARBLE_L, 6);
  }
  geo.cone(0.26, 0.7, 0, 19.86, TZ + 13.8, MARBLE_L, 6);
  geo.cone(0.26, 0.7, 0, 19.86, TZ - 13.8, MARBLE_L, 6);

  // cella walls
  geo.box(0.45, 4.3, 19.0, -4.0, 10.35, TZ, MARBLE_D);
  geo.box(0.45, 4.3, 19.0, 4.0, 10.35, TZ, MARBLE_D);
  geo.box(8.0, 4.3, 0.45, 0, 10.35, TZ - 9.5, MARBLE_D);
  geo.box(3.1, 4.3, 0.45, -2.45, 10.35, TZ + 9.5, MARBLE_D);
  geo.box(3.1, 4.3, 0.45, 2.45, 10.35, TZ + 9.5, MARBLE_D);
  geo.box(1.9, 1.0, 0.45, 0, 13.65, TZ + 9.5, MARBLE_D);

  // cult statue (gold), visible behind the columns
  geo.box(2.4, 0.7, 2.4, 0, 10.35, 3.5, MARBLE_D);
  geo.cyl(0.55, 1.0, 3.6, 0, 11.05, 3.5, GOLD, 8);
  geo.cyl(0.50, 0.65, 1.5, 0, 14.65, 3.5, GOLD, 8);
  geo.sphere(0.42, 0, 16.55, 3.5, GOLD, 10);
  geo.cone(0.50, 0.60, 0, 16.90, 3.5, GOLD, 8);
  geo.cyl(0.16, 0.16, 1.7, -0.72, 14.90, 3.5, GOLD, 6, { rz: 0.30 });
  geo.cyl(0.16, 0.16, 1.7, 0.72, 14.90, 3.5, GOLD, 6, { rz: -0.30 });
  geo.cyl(0.60, 0.60, 0.12, -1.12, 14.60, 3.5, GOLD, 10, { rz: Math.PI / 2 });
  geo.cyl(0.05, 0.05, 8.0, 1.05, 10.60, 3.5, BRONZE_L, 6);
  geo.cone(0.14, 0.50, 1.05, 18.60, 3.5, BRONZE_L, 6);

  // ---------------------------------------------------------------- small ionic temple
  const IX = 8.8;
  const IZ = -6.5;
  geo.box(4.6, 0.40, 7.2, IX, 9.00, IZ, MARBLE_D);
  geo.box(4.2, 0.25, 6.8, IX, 9.40, IZ, MARBLE);
  for (let i = 0; i < 6; i++) {
    const x = 7.1 + i * 0.68;
    geo.cyl(0.14, 0.22, 2.3, x, 9.65, IZ + 2.9, MARBLE_L, 6);
    geo.sphere(0.17, x, 12.12, IZ + 2.9, MARBLE_L, 8);
    geo.box(0.42, 0.18, 0.42, x, 12.28, IZ + 2.9, MARBLE);
  }
  geo.box(4.4, 0.50, 2.2, IX, 12.46, IZ + 2.8, MARBLE);
  geo.box(4.6, 0.30, 2.4, IX, 12.96, IZ + 2.8, MARBLE_D);
  geo.gable(2.4, 0.8, 4.6, IX, 13.26, IZ + 2.8, MARBLE_D, { ry: Math.PI / 2 });
  geo.box(3.4, 2.6, 3.6, IX, 9.40, IZ - 1.1, MARBLE_D);
  geo.box(0.9, 1.7, 0.2, IX, 9.40, IZ + 0.72, PALE);
  geo.box(3.6, 0.25, 3.8, IX, 12.00, IZ - 1.1, MARBLE);

  // ---------------------------------------------------------------- bronze statue near gate
  geo.box(1.8, 1.1, 1.8, -7.6, 9.0, 13.0, MARBLE_D);
  geo.cyl(0.35, 0.60, 2.2, -7.6, 10.1, 13.0, BRONZE, 8);
  geo.cyl(0.42, 0.55, 1.3, -7.6, 12.3, 13.0, BRONZE, 8);
  geo.sphere(0.32, -7.6, 13.8, 13.0, BRONZE_L, 8);
  geo.cone(0.36, 0.50, -7.6, 14.0, 13.0, BRONZE_L, 8);
  // olive trees on the plateau
  for (const [x, z] of [[-12, -6], [-13.5, 2], [12.5, 5], [13, -1], [-10, 9]]) {
    geo.cyl(0.12, 0.18, 1.0, x, 9.0, z, 0x6b5a44, 6);
    geo.sphere(0.9, x, 10.4, z, 0x8a9a6c, 8);
  }
  return { solid: geo.build(), glass: null, name: '雅典卫城', radius: 26, height: 22 };
}
