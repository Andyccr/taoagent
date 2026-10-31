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
      g.box(0.42, 0.2, 0.42, px, y + ph, z0, MARBLE, {});
      g.box(0.42, 0.2, 0.42, px, y + ph, z1, MARBLE, {});
    }
    for (let pz = z0; pz <= z1 + 0.01; pz += sp) {
      g.box(0.28, ph, 0.28, x0, y, pz, MARBLE, {});
      g.box(0.28, ph, 0.28, x1, y, pz, MARBLE, {});
      g.box(0.42, 0.2, 0.42, x0, y + ph, pz, MARBLE, {});
      g.box(0.42, 0.2, 0.42, x1, y + ph, pz, MARBLE, {});
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
    if (alongX) {
      const face = d / 2 + 0.08;
      for (let off = -len / 2 + 2; off <= len / 2 - 2; off += 3.2) {
        g.box(1.7, 2.3, 0.16, x + off, 2.4, z + face, GOLD, {});
        g.box(1.7, 2.3, 0.16, x + off, 2.4, z - face, GOLD, {});
      }
    } else {
      const face = w / 2 + 0.08;
      for (let off = -len / 2 + 2; off <= len / 2 - 2; off += 3.2) {
        g.box(0.16, 2.3, 1.7, x + face, 2.4, z + off, GOLD, {});
        g.box(0.16, 2.3, 1.7, x - face, 2.4, z + off, GOLD, {});
      }
    }
  }

  function lattice(x, y, z, w, h) {
    g.box(w + 0.24, 0.16, 0.22, x, y - 0.08, z, GOLD, {});
    g.box(w + 0.24, 0.16, 0.22, x, y + h, z, GOLD, {});
    for (let i = 1; i < 4; i++) g.box(0.1, h, 0.18, x - w / 2 + w * i / 4, y, z, DARK, {});
    for (let j = 1; j < 3; j++) g.box(w, 0.1, 0.18, x, y + h * j / 3, z, DARK, {});
  }

  function hallDetail(x, z, w, d, y, h, r, n) {
    const nf = n || Math.max(4, Math.round(w / 2));
    const ns = Math.max(3, Math.round(d / 2.2));
    const zf = z + d / 2 + r * 0.5;
    const zb = z - d / 2 - r * 0.5;
    for (let i = 0; i < nf; i++) {
      const cx = x - w / 2 + w * (i + 0.5) / nf;
      column(cx, y, zf, h, r);
      column(cx, y, zb, h, r);
      if (i < nf - 1) {
        const nx = x - w / 2 + w * (i + 1) / nf;
        const bw = Math.max(0.5, nx - cx - r * 2.4);
        lattice((cx + nx) / 2, y + h * 0.3, zf + r * 0.3, bw, h * 0.38);
      }
    }
    for (let i = 0; i < ns; i++) {
      const cz = z - d / 2 + d * (i + 0.5) / ns;
      column(x + w / 2 + r * 0.5, y, cz, h, r);
      column(x - w / 2 - r * 0.5, y, cz, h, r);
    }
    g.box(w + 0.8, 0.7, d + 0.8, x, y + h - 0.9, z, YELLOW, {});
    const top = y + h - 0.45;
    for (let i = 0; i < nf * 2; i++) {
      const cx = x - w / 2 + w * (i + 0.5) / (nf * 2);
      g.box(0.5, 0.35, 0.5, cx, y + h - 0.55, zf + 0.2, GOLD, {});
      g.box(0.5, 0.35, 0.5, cx, y + h - 0.55, zb - 0.2, GOLD, {});
    }
    for (let i = 0; i <= nf * 2; i++) {
      const cx = x - w / 2 + w * i / (nf * 2);
      g.box(0.55, 0.3, 0.55, cx, top, zf + 0.35, DARK, {});
      g.box(0.85, 0.22, 0.85, cx, top + 0.3, zf + 0.35, YELLOW, {});
      g.box(0.55, 0.3, 0.55, cx, top, zb - 0.35, DARK, {});
      g.box(0.85, 0.22, 0.85, cx, top + 0.3, zb - 0.35, YELLOW, {});
    }
    for (let i = 0; i <= ns * 2; i++) {
      const cz = z - d / 2 + d * i / (ns * 2);
      g.box(0.55, 0.3, 0.55, x + w / 2 + 0.35, top, cz, DARK, {});
      g.box(0.85, 0.22, 0.85, x + w / 2 + 0.35, top + 0.3, cz, YELLOW, {});
      g.box(0.55, 0.3, 0.55, x - w / 2 - 0.35, top, cz, DARK, {});
      g.box(0.85, 0.22, 0.85, x - w / 2 - 0.35, top + 0.3, cz, YELLOW, {});
    }
  }

  function eaveTips(w, d, h, x, y, z) {
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const cx = x + w / 2 * sx;
      const cz = z + d / 2 * sz;
      g.box(0.45, 0.8, 0.45, cx, y + 0.05, cz, GOLD, { rz: -0.5 * sx, rx: 0.5 * sz });
      g.cone(0.22, 0.9, cx + 0.3 * sx, y + 0.3, cz + 0.3 * sz, GOLD, 4);
    }
  }

  function ridgeOrnaments(w, d, h, x, y, z) {
    const rl = w - d > 0.5 ? w * 0.06 : 0;
    for (const sx of rl > 0 ? [-1, 1] : [0]) {
      const ex = x + rl * sx;
      g.box(0.55, 0.9, 0.5, ex, y + h - 0.1, z, DARK, {});
      g.box(0.75, 0.45, 0.7, ex, y + h + 0.8, z, GOLD, {});
      g.box(0.35, 0.6, 0.35, ex + 0.35 * (sx || 1), y + h + 1.2, z, GOLD, {});
    }
  }

  function ridgeBeasts(w, d, h, x, y, z) {
    const ax = w * 0.06;
    const az = d * 0.06;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let i = 1; i <= 4; i++) {
          const t = i / 5;
          const bx = x + sx * (ax + (w / 2 - ax) * t);
          const bz = z + sz * (az + (d / 2 - az) * t);
          g.cone(0.15, 0.38, bx, y + h - h * t, bz, GOLD, 4);
        }
      }
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
    eaveTips(9, 9, 3.5, x, 13, z);
    eaveTips(6, 6, 4, x, 16.5, z);
    ridgeOrnaments(9, 9, 3.5, x, 13, z);
    ridgeOrnaments(6, 6, 4, x, 16.5, z);
    ridgeBeasts(9, 9, 3.5, x, 13, z);
    ridgeBeasts(6, 6, 4, x, 16.5, z);
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
    eaveTips(w + 2, d + 2, 3, x, 6, z);
    ridgeOrnaments(w + 2, d + 2, 3, x, 6, z);
    ridgeBeasts(w + 2, d + 2, 3, x, 6, z);
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
  eaveTips(34, 14, 4, 0, 11, 50);
  eaveTips(24, 10, 5, 0, 15, 50);
  ridgeOrnaments(34, 14, 4, 0, 11, 50);
  ridgeOrnaments(24, 10, 5, 0, 15, 50);
  ridgeBeasts(34, 14, 4, 0, 11, 50);
  ridgeBeasts(24, 10, 5, 0, 15, 50);
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
    g.prism([[-1.7, zA + 1.1], [1.7, zA + 1.1], [1.35, zA + 0.1], [-1.35, zA + 0.1]], i + 1.2, 0, MARBLE);
  }
  g.box(20, 9, 12, 0, 6, 0, RED, {});
  hallDetail(0, 0, 20, 12, 6, 9, 0.4, 11);
  g.hip(26, 18, 4, 0, 15, 0, YELLOW, 0.12, {});
  g.hip(17, 11, 5, 0, 19, 0, YELLOW, 0.1, {});
  eaveTips(26, 18, 4, 0, 15, 0);
  eaveTips(17, 11, 5, 0, 19, 0);
  ridgeOrnaments(26, 18, 4, 0, 15, 0);
  ridgeOrnaments(17, 11, 5, 0, 19, 0);
  ridgeBeasts(26, 18, 4, 0, 15, 0);
  ridgeBeasts(17, 11, 5, 0, 19, 0);
  g.sphere(0.45, -8.5, 24.3, 0, GOLD, 8);
  g.sphere(0.45, 8.5, 24.3, 0, GOLD, 8);
  g.cyl(0.16, 0.3, 1.3, 0, 24, 0, GOLD, 8);
  g.ring(0.32, 0.07, 0, 25, 0, GOLD, 12);
  g.sphere(0.4, 0, 25.1, 0, GOLD, 10);
  g.cone(0.16, 0.4, 0, 25.5, 0, GOLD, 8);

  // Second hall
  g.box(20, 1.6, 14, 0, 0, -26, MARBLE, {});
  railing(-10, 10, -33, -19, 1.6);
  g.box(14, 7, 9, 0, 1.6, -26, RED, {});
  hallDetail(0, -26, 14, 9, 1.6, 7, 0.36, 7);
  g.hip(18, 12, 3.5, 0, 8.6, -26, YELLOW, 0.1, {});
  g.hip(12, 7, 4, 0, 12.1, -26, YELLOW, 0.08, {});
  eaveTips(18, 12, 3.5, 0, 8.6, -26);
  eaveTips(12, 7, 4, 0, 12.1, -26);
  ridgeOrnaments(18, 12, 3.5, 0, 8.6, -26);
  ridgeOrnaments(12, 7, 4, 0, 12.1, -26);
  ridgeBeasts(18, 12, 3.5, 0, 8.6, -26);
  ridgeBeasts(12, 7, 4, 0, 12.1, -26);
  g.box(8, 0.8, 1.4, 0, 0, -17.9, MARBLE, {});
  g.box(8, 1.6, 1.4, 0, 0, -19.3, MARBLE, {});

  // Third hall
  g.box(16, 1.4, 11, 0, 0, -40, MARBLE, {});
  railing(-8, 8, -45.5, -34.5, 1.4);
  g.box(11, 6, 7, 0, 1.4, -40, RED, {});
  hallDetail(0, -40, 11, 7, 1.4, 6, 0.34, 6);
  g.hip(14, 10, 3, 0, 7.4, -40, YELLOW, 0.1, {});
  g.hip(9, 6, 3.5, 0, 10.4, -40, YELLOW, 0.08, {});
  eaveTips(14, 10, 3, 0, 7.4, -40);
  eaveTips(9, 6, 3.5, 0, 10.4, -40);
  ridgeOrnaments(14, 10, 3, 0, 7.4, -40);
  ridgeOrnaments(9, 6, 3.5, 0, 10.4, -40);
  ridgeBeasts(14, 10, 3, 0, 7.4, -40);
  ridgeBeasts(9, 6, 3.5, 0, 10.4, -40);
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
