import { createGeo } from './geo.js';

export function buildPalace() {
  const g = createGeo();
  const RED = 0xa8322a;
  const YELLOW = 0xd9a520;
  const MARBLE = 0xeee9dd;
  const STONE = 0xbdb6a6;
  const GOLD = 0xd4a73a;
  const DARK = 0x3a1412;
  const GREEN = 0x3e6b3a;
  const GREEN2 = 0x4a7d44;
  const WATER = 0x7fa8b8;
  const TRUNK = 0x6b4a2f;

  function column(x, y, z, h, r = 0.4, col = RED) {
    g.cyl(r, r, h, x, y, z, col, 8);
    g.cyl(r * 0.6, r * 0.6, 0.3, x, y + h, z, GOLD, 8);
    g.box(r * 2.3, 0.22, r * 2.3, x, y, z, STONE, {});
  }

  function railing(x0, x1, z0, z1, y, sp = 2.5) {
    const ph = 0.9;
    for (let px = x0; px <= x1 + 0.01; px += sp) {
      g.box(0.28, ph, 0.28, px, y, z0, MARBLE, {});
      g.box(0.28, ph, 0.28, px, y, z1, MARBLE, {});
    }
    for (let pz = z0; pz <= z1 + 0.01; pz += sp) {
      g.box(0.28, ph, 0.28, x0, y, pz, MARBLE, {});
      g.box(0.28, ph, 0.28, x1, y, pz, MARBLE, {});
    }
    g.box(x1 - x0 + 0.3, 0.16, 0.24, (x0 + x1) / 2, y + ph, z0, MARBLE, {});
    g.box(x1 - x0 + 0.3, 0.16, 0.24, (x0 + x1) / 2, y + ph, z1, MARBLE, {});
    g.box(0.24, 0.16, z1 - z0 + 0.3, x0, y + ph, (z0 + z1) / 2, MARBLE, {});
    g.box(0.24, 0.16, z1 - z0 + 0.3, x1, y + ph, (z0 + z1) / 2, MARBLE, {});
  }

  function wall(x, z, w, d, h) {
    g.box(w, h, d, x, 0, z, RED, {});
    const alongX = w >= d;
    const len = alongX ? w : d;
    const n = Math.floor((len - 1.4) / 1.8) + 1;
    for (let i = 0; i < n; i++) {
      const off = -len / 2 + 0.7 + i * 1.8;
      if (alongX) g.box(0.7, 0.9, 0.7, x + off, h, z, RED, {});
      else g.box(0.7, 0.9, 0.7, x, h, z + off, RED, {});
    }
  }

  function tree(x, z, s = 1) {
    g.cyl(0.22 * s, 0.3 * s, 1.2 * s, x, 0, z, TRUNK, 6);
    g.dome(0.95 * s, x, 1.1 * s, z, GREEN, 12);
    g.dome(0.72 * s, x, 1.7 * s, z, GREEN2, 12);
  }

  function lantern(x, z, s = 1) {
    g.cyl(0.1 * s, 0.1 * s, 1.5 * s, x, 0, z, STONE, 6);
    g.cyl(0.34 * s, 0.34 * s, 0.62 * s, x, 1.5 * s, z, RED, 8);
    g.box(0.8 * s, 0.1 * s, 0.8 * s, x, 1.42 * s, z, GOLD, {});
    g.box(0.8 * s, 0.1 * s, 0.8 * s, x, 2.12 * s, z, GOLD, {});
    g.dome(0.16 * s, x, 2.22 * s, z, GOLD, 8);
  }

  function lion(x, z, ry) {
    g.group({ x, z, ry }, () => {
      g.box(1.6, 0.5, 2.4, 0, 0, 0, STONE, {});
      g.box(1.1, 0.9, 1.4, 0, 0.5, -0.2, STONE, {});
      g.box(0.75, 0.7, 0.7, 0, 1.15, 0.35, STONE, {});
      g.box(0.9, 0.35, 0.9, 0, 1.55, 0.3, STONE, {});
      g.sphere(0.16, -0.3, 1.3, 0.65, DARK, 8);
      g.sphere(0.16, 0.3, 1.3, 0.65, DARK, 8);
    });
  }

  function incense(x, z, s = 1) {
    g.cyl(0.5 * s, 0.72 * s, 1.0 * s, x, 0, z, GOLD, 8);
    g.cyl(0.4 * s, 0.4 * s, 0.5 * s, x, 1.0 * s, z, GOLD, 8);
    g.box(1.3 * s, 0.26 * s, 1.3 * s, x, 1.5 * s, z, GOLD, {});
    g.box(1.0 * s, 0.2 * s, 1.0 * s, x, 1.76 * s, z, GOLD, {});
  }

  function cornerTower(x, z) {
    g.box(8, 8, 8, x, 0, z, RED, {});
    for (const [dx, dz] of [[-3, -3], [-3, 3], [3, -3], [3, 3]]) {
      column(x + dx, 0.4, z + dz, 7.2, 0.34);
    }
    g.box(6, 5, 6, x, 8, z, RED, {});
    g.hip(9, 9, 3.5, x, 13, z, YELLOW, 0.12, {});
    g.hip(6, 6, 4, x, 16.5, z, YELLOW, 0.1, {});
    g.sphere(0.5, x, 20.8, z, GOLD, 8);
  }

  function sideHall(x, z, w, d) {
    g.box(w, 6, d, x, 0, z, RED, {});
    const nc = Math.max(5, Math.floor(w / 2.2));
    for (let i = 0; i < nc; i++) {
      const cx = x - w / 2 + w * (i + 0.5) / nc;
      column(cx, 0.4, z + d / 2 - 0.5, 5.4, 0.32);
    }
    g.hip(w + 2, d + 2, 3, x, 6, z, YELLOW, 0.08, {});
  }

  function bridge(x, z) {
    g.box(5, 0.9, 8.4, x, 0.9, z, MARBLE, {});
    g.box(5, 0.55, 0.4, x, 1.6, z - 3.8, MARBLE, {});
    g.box(5, 0.55, 0.4, x, 1.6, z + 3.8, MARBLE, {});
    for (const [rx, rz] of [[-2.2, -3.8], [-2.2, 3.8], [2.2, -3.8], [2.2, 3.8]]) {
      g.box(0.3, 0.5, 0.3, x + rx, 1.6, z + rz, MARBLE, {});
    }
  }

  // Outer red walls
  wall(0, -54, 88, 2, 9);
  wall(-42, 0, 2, 108, 9);
  wall(42, 0, 2, 108, 9);
  wall(-28.5, 54, 27, 2, 9);
  wall(28.5, 54, 27, 2, 9);

  // Corner towers
  cornerTower(-40, -52);
  cornerTower(40, -52);
  cornerTower(-40, 52);
  cornerTower(40, 52);

  // Meridian Gate (5 arches, double-eave)
  g.box(30, 3, 12, 0, 0, 50, RED, {});
  g.box(28, 8, 10, 0, 3, 50, RED, {});
  for (let i = -2; i <= 2; i++) {
    const ax = i * 4.4;
    const r = i === 0 ? 1.8 : 1.4;
    g.arch(r, 0.45, 1.0, ax, 1.6, 55.6, DARK, 10, {});
    g.arch(r, 0.2, 1.1, ax, 1.6, 55.7, GOLD, 10, {});
  }
  for (let i = 0; i < 9; i++) {
    column(-12 + i * 3, 3, 55.2, 7.4, 0.4);
  }
  g.hip(34, 14, 4, 0, 11, 50, YELLOW, 0.12, {});
  g.hip(24, 10, 5, 0, 15, 50, YELLOW, 0.1, {});
  g.sphere(0.4, -12, 20, 50, GOLD, 8);
  g.sphere(0.4, 12, 20, 50, GOLD, 8);

  // Side halls / palaces
  sideHall(-30, 32, 12, 10);
  sideHall(30, 32, 12, 10);
  sideHall(-30, -14, 12, 9);
  sideHall(30, -14, 12, 9);
  sideHall(-28, -38, 10, 8);
  sideHall(28, -38, 10, 8);

  // Shallow canal + 3 marble bridges
  g.box(70, 1, 6, 0, 0, 18, STONE, {});
  g.box(72, 0.9, 1.2, 0, 0.9, 15.5, STONE, {});
  g.box(72, 0.9, 1.2, 0, 0.9, 20.5, STONE, {});
  g.box(68, 0.35, 4.4, 0, 0.8, 18, WATER, {});
  bridge(-14, 18);
  bridge(0, 18);
  bridge(14, 18);

  // Hall of Supreme Harmony — 3-tier marble terrace
  g.box(36, 2, 28, 0, 0, 0, MARBLE, {});
  g.box(30, 2, 22, 0, 2, 0, MARBLE, {});
  g.box(24, 2, 16, 0, 4, 0, MARBLE, {});
  railing(-18, 18, -14, 14, 2);
  railing(-15, 15, -11, 11, 4);
  railing(-12, 12, -8, 8, 6);
  for (let i = 0; i < 6; i++) {
    const zA = 8.2 + (5 - i) * 1.4;
    g.box(12, i + 1, 1.4, 0, 0, zA + 0.7, MARBLE, {});
  }
  g.box(20, 9, 12, 0, 6, 0, RED, {});
  for (let i = 0; i < 11; i++) {
    column(-9 + i * 1.8, 6, 6.2, 8.4, 0.4);
  }
  g.hip(26, 18, 4, 0, 15, 0, YELLOW, 0.12, {});
  g.hip(17, 11, 5, 0, 19, 0, YELLOW, 0.1, {});
  g.sphere(0.45, -8.5, 24.3, 0, GOLD, 8);
  g.sphere(0.45, 8.5, 24.3, 0, GOLD, 8);
  g.cyl(0.2, 0.35, 1.2, 0, 24, 0, GOLD, 8);

  // Second hall
  g.box(20, 1.6, 14, 0, 0, -26, MARBLE, {});
  railing(-10, 10, -33, -19, 1.6);
  g.box(14, 7, 9, 0, 1.6, -26, RED, {});
  for (let i = 0; i < 7; i++) {
    column(-5.6 + i * 1.86, 1.6, -21.2, 6.4, 0.36);
  }
  g.hip(18, 12, 3.5, 0, 8.6, -26, YELLOW, 0.1, {});
  g.hip(12, 7, 4, 0, 12.1, -26, YELLOW, 0.08, {});
  g.box(8, 0.8, 1.4, 0, 0, -17.9, MARBLE, {});
  g.box(8, 1.6, 1.4, 0, 0, -19.3, MARBLE, {});

  // Third hall
  g.box(16, 1.4, 11, 0, 0, -40, MARBLE, {});
  railing(-8, 8, -45.5, -34.5, 1.4);
  g.box(11, 6, 7, 0, 1.4, -40, RED, {});
  for (let i = 0; i < 6; i++) {
    column(-4.2 + i * 1.68, 1.4, -36.2, 5.4, 0.34);
  }
  g.hip(14, 10, 3, 0, 7.4, -40, YELLOW, 0.1, {});
  g.hip(9, 6, 3.5, 0, 10.4, -40, YELLOW, 0.08, {});
  g.box(7, 0.7, 1.4, 0, 0, -32.4, MARBLE, {});
  g.box(7, 1.4, 1.4, 0, 0, -33.8, MARBLE, {});

  // Lions, incense, lanterns
  lion(-5, 44, Math.PI / 2);
  lion(5, 44, -Math.PI / 2);
  incense(-4, 20);
  incense(4, 20);
  lantern(-8, 40); lantern(8, 40);
  lantern(-8, 32); lantern(8, 32);
  lantern(-8, 24); lantern(8, 24);

  // Trees near the edge inside the footprint
  tree(-36, -46, 1); tree(36, -46, 1);
  tree(-36, 46, 1); tree(36, 46, 1);
  tree(-30, -50, 0.8); tree(30, -50, 0.8);
  tree(-34, 4, 1); tree(34, 4, 1);
  tree(-34, -30, 1); tree(34, -30, 1);
  tree(0, -50, 0.9);

  const solid = g.build();
  return {
    solid,
    glass: null,
    name: '紫宸宫',
    radius: 71,
    height: 26,
  };
}
