import { createGeo } from './geo.js';

export function buildPalace() {
  const g = createGeo();
  const RED = 0xa8322a;
  const YELLOW = 0xd9a520;
  const MARBLE = 0xeee9dd;
  const STONE = 0xbdb6a6;
  const GOLD = 0xd4a73a;
  const GOLD2 = 0xe6c14a;
  const DARK = 0x3a1412;
  const GREEN = 0x3e6b3a;
  const GREEN2 = 0x4a7d44;
  const WATER = 0x6fa0c8;
  const TRUNK = 0x6b4a2f;
  const BRONZE = 0x6f6040;
  const SOIL = 0x8a7a58;

  // Column: shaft + gold capital + stone base.
  function column(x, y, z, h, r = 0.36, col = RED) {
    g.cyl(r, r * 1.05, h, x, y, z, col, 8);
    g.cyl(r * 0.62, r * 0.62, 0.28, x, y + h, z, GOLD, 8);
    g.box(r * 2.3, 0.2, r * 2.3, x, y - 0.02, z, STONE, {});
  }

  // Balustrade posts every ~sp metres with rails around a rectangle.
  function balustrade(x0, x1, z0, z1, y, sp = 2) {
    const ph = 0.85;
    for (let x = x0; x <= x1 + 1e-6; x += sp) {
      g.box(0.2, ph, 0.2, x, y, z0, MARBLE, {});
      g.box(0.2, ph, 0.2, x, y, z1, MARBLE, {});
      g.box(0.32, 0.13, 0.32, x, y + ph, z0, MARBLE, {});
      g.box(0.32, 0.13, 0.32, x, y + ph, z1, MARBLE, {});
    }
    for (let z = z0; z <= z1 + 1e-6; z += sp) {
      g.box(0.2, ph, 0.2, x0, y, z, MARBLE, {});
      g.box(0.2, ph, 0.2, x1, y, z, MARBLE, {});
      g.box(0.32, 0.13, 0.32, x0, y + ph, z, MARBLE, {});
      g.box(0.32, 0.13, 0.32, x1, y + ph, z, MARBLE, {});
    }
    g.box(x1 - x0 + 0.24, 0.13, 0.2, (x0 + x1) / 2, y + ph, z0, MARBLE, {});
    g.box(x1 - x0 + 0.24, 0.13, 0.2, (x0 + x1) / 2, y + ph, z1, MARBLE, {});
    g.box(0.2, 0.13, z1 - z0 + 0.24, x0, y + ph, (z0 + z1) / 2, MARBLE, {});
    g.box(0.2, 0.13, z1 - z0 + 0.24, x1, y + ph, (z0 + z1) / 2, MARBLE, {});
  }

  // Red wall with yellow cap tiles and gold trim band.
  function wall(x, z, w, d, h) {
    g.box(w, h, d, x, 0, z, RED, {});
    g.box(w + 0.6, 0.5, d + 0.6, x, h, z, YELLOW, {});
    g.box(w + 0.6, 0.14, d + 0.6, x, h + 0.32, z, GOLD, {});
    const alongX = w >= d;
    const len = alongX ? w : d;
    const n = Math.floor((len - 1.2) / 2.1) + 1;
    for (let i = 0; i < n; i++) {
      const off = -len / 2 + 0.6 + i * 2.1;
      if (alongX) g.box(0.6, 0.85, 0.6, x + off, h + 0.5, z, RED, {});
      else g.box(0.6, 0.85, 0.6, x, h + 0.5, z + off, RED, {});
    }
  }

  // Lattice door panel between columns.
  function lattice(x, y, z, w, h) {
    g.box(w + 0.24, 0.15, 0.2, x, y - 0.08, z, GOLD, {});
    g.box(w + 0.24, 0.15, 0.2, x, y + h, z, GOLD, {});
    for (let i = 1; i < 4; i++) g.box(0.08, h, 0.16, x - w / 2 + w * i / 4, y, z, DARK, {});
    for (let j = 1; j < 3; j++) g.box(w, 0.08, 0.16, x, y + h * j / 3, z, DARK, {});
  }

  // Dougong bracket clusters under an eave, spread along the x axis.
  function dougong(x, y, z, w, step) {
    const n = Math.max(2, Math.round(w / step));
    for (let i = 0; i <= n; i++) {
      const cx = x - w / 2 + (w * i) / n;
      g.box(0.42, 0.3, 0.3, cx, y, z, GOLD, {});
      g.box(0.28, 0.22, 0.24, cx, y + 0.3, z, GOLD, {});
    }
  }

  function eaveTips(w, d, h, x, y, z) {
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const cx = x + w / 2 * sx;
      const cz = z + d / 2 * sz;
      g.box(0.4, 0.72, 0.4, cx, y + 0.05, cz, GOLD, { rz: -0.5 * sx, rx: 0.5 * sz });
      g.cone(0.2, 0.85, cx + 0.28 * sx, y + 0.32, cz + 0.28 * sz, GOLD, 4);
    }
  }

  // Dragon-head ridge ends (chiwen).
  function chiwen(w, d, h, x, y, z) {
    const rl = Math.max(0.06 * w, 0.06 * d);
    for (const sx of [-1, 1]) {
      const ex = x + rl * sx;
      g.box(0.55, 0.55, 0.7, ex, y + h - 0.1, z, DARK, {});
      g.box(0.6, 0.72, 0.55, ex, y + h + 0.35, z, GOLD, {});
      g.box(0.4, 0.4, 0.4, ex + 0.24 * sx, y + h + 0.85, z, GOLD, {});
      g.box(0.5, 0.35, 0.5, ex + 0.4 * sx, y + h + 1.05, z, GOLD2, {});
    }
  }

  // Row of small ridge beasts on the four corner ridges.
  function ridgeBeasts(w, d, h, x, y, z) {
    const ax = w * 0.06, az = d * 0.06;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let i = 1; i <= 4; i++) {
          const t = i / 5;
          const bx = x + sx * (ax + (w / 2 - ax) * t);
          const bz = z + sz * (az + (d / 2 - az) * t);
          g.cone(0.13, 0.34, bx, y + h - h * t * 0.9, bz, GOLD, 4);
        }
      }
    }
  }

  function hipRoof(w, d, h, x, y, z, flare = 0.12) {
    g.hip(w, d, h, x, y, z, YELLOW, flare, {});
    eaveTips(w, d, h, x, y, z);
    ridgeBeasts(w, d, h, x, y, z);
    chiwen(w, d, h, x, y, z);
  }

  function doubleRoof(w, d, hLow, hUp, x, y, z, flare = 0.12) {
    hipRoof(w, d, hLow, x, y, z, flare);
    const w2 = w * 0.72, d2 = d * 0.72, y2 = y + hLow;
    hipRoof(w2, d2, hUp, x, y2, z, flare * 0.9);
    const top = y2 + hUp;
    g.cyl(0.1, 0.22, 0.7, x, top, z, GOLD, 6);
    g.sphere(0.34, x, top + 0.8, z, GOLD, 8);
    g.cone(0.14, 0.5, x, top + 1.1, z, GOLD, 8);
  }

  // Full palace hall: red body, colonnade, lattice, dougong, hip roof.
  function hall(x, z, w, d, y, bodyH, bays, opt = {}) {
    const double = opt.double !== false;
    const flare = opt.flare ?? 0.12;
    const hLow = opt.hLow ?? 4.5;
    const hUp = opt.hUp ?? 5.2;
    const hRoof = opt.hRoof ?? 4.6;
    g.box(w, bodyH, d, x, y, z, RED, {});
    const nf = bays;
    for (let i = 0; i < nf; i++) {
      const cx = x - w / 2 + w * (i + 0.5) / nf;
      column(cx, y, z + d / 2 + 0.06, bodyH - 0.4, 0.36);
      column(cx, y, z - d / 2 - 0.06, bodyH - 0.4, 0.36);
      if (i < nf - 1) {
        const nx = x - w / 2 + w * (i + 1) / nf;
        lattice((cx + nx) / 2, y + (bodyH - 0.4) * 0.3, z + d / 2 + 0.28, nx - cx - 0.7, (bodyH - 0.4) * 0.42);
      }
    }
    const ns = Math.max(2, Math.round(d / 2));
    for (let i = 0; i < ns; i++) {
      const cz = z - d / 2 + d * (i + 0.5) / ns;
      column(x + w / 2 + 0.06, y, cz, bodyH - 0.4, 0.36);
      column(x - w / 2 - 0.06, y, cz, bodyH - 0.4, 0.36);
    }
    g.box(w + 0.9, 0.55, d + 0.9, x, y + bodyH - 0.55, z, RED, {});
    g.box(w + 0.9, 0.18, d + 0.9, x, y + bodyH - 0.2, z, GOLD, {});
    const yD = y + bodyH - 0.1;
    dougong(x, yD, z + d / 2 + 0.35, w + 1, 1.1);
    dougong(x, yD, z - d / 2 - 0.35, w + 1, 1.1);
    const sd = Math.max(2, Math.round(d / 1.1));
    for (let i = 0; i <= sd; i++) {
      const cz = z - d / 2 + (d * i) / sd;
      g.box(0.3, 0.3, 0.42, x + w / 2 + 0.35, yD, cz, GOLD, {});
      g.box(0.3, 0.3, 0.42, x - w / 2 - 0.35, yD, cz, GOLD, {});
      g.box(0.24, 0.22, 0.28, x + w / 2 + 0.35, yD + 0.3, cz, GOLD, {});
      g.box(0.24, 0.22, 0.28, x - w / 2 - 0.35, yD + 0.3, cz, GOLD, {});
    }
    const ry = y + bodyH;
    if (double) doubleRoof(w + 2.6, d + 2.6, hLow, hUp, x, ry, z, flare);
    else hipRoof(w + 2.2, d + 2.2, hRoof, x, ry, z, flare);
    return ry;
  }

  function pavilion(x, y, z, s) {
    g.box(s, s * 0.72, s, x, y, z, RED, {});
    for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      column(x + dx * (s / 2 - 0.5), y, z + dz * (s / 2 - 0.5), s * 0.68, 0.28);
    }
    const ry = y + s * 0.72;
    g.hip(s + 1.4, s + 1.4, s * 0.4, x, ry, z, YELLOW, 0.12, {});
    eaveTips(s + 1.4, s + 1.4, s * 0.4, x, ry, z);
    ridgeBeasts(s + 1.4, s + 1.4, s * 0.4, x, ry, z);
    chiwen(s + 1.4, s + 1.4, s * 0.4, x, ry, z);
    g.sphere(0.26, x, ry + s * 0.4 + 0.3, z, GOLD, 8);
  }

  // Corner watchtower with cross-gabled double roofs.
  function cornerTower(x, yBase, z) {
    g.box(6.4, 6.6, 6.4, x, yBase, z, RED, {});
    for (const [dx, dz] of [[-2.4, -2.4], [-2.4, 2.4], [2.4, -2.4], [2.4, 2.4]]) {
      column(x + dx, yBase + 0.3, z + dz, 6.0, 0.28);
    }
    g.box(5, 4.2, 5, x, yBase + 6.6, z, RED, {});
    g.hip(7.6, 7.6, 2.8, x, yBase + 10.8, z, YELLOW, 0.12, {});
    g.hip(5.2, 5.2, 3.2, x, yBase + 13.6, z, YELLOW, 0.1, {});
    g.gable(2.4, 1.3, 1.5, x, yBase + 10.4, z + 3.2, YELLOW, {});
    g.gable(2.4, 1.3, 1.5, x, yBase + 10.4, z - 3.2, YELLOW, { rz: Math.PI });
    g.gable(1.5, 1.3, 2.4, x + 3.2, yBase + 10.4, z, YELLOW, { ry: Math.PI / 2 });
    g.gable(1.5, 1.3, 2.4, x - 3.2, yBase + 10.4, z, YELLOW, { ry: -Math.PI / 2 });
    eaveTips(7.6, 7.6, 2.8, x, yBase + 10.8, z);
    ridgeBeasts(7.6, 7.6, 2.8, x, yBase + 10.8, z);
    chiwen(7.6, 7.6, 2.8, x, yBase + 10.8, z);
    g.sphere(0.36, x, yBase + 17.2, z, GOLD, 8);
  }

  function sideHall(x, z, w, d, y = 0) {
    g.box(w, 5, d, x, y, z, RED, {});
    const nc = Math.max(4, Math.floor(w / 2.2));
    for (let i = 0; i < nc; i++) {
      const cx = x - w / 2 + w * (i + 0.5) / nc;
      column(cx, y + 0.3, z + d / 2 - 0.5, 4.6, 0.3);
      if (i < nc - 1) {
        const nx = x - w / 2 + w * (i + 1) / nc;
        lattice((cx + nx) / 2, y + 1.6, z + d / 2 - 0.3, nx - cx - 0.6, 1.5);
      }
    }
    g.box(w + 0.7, 0.4, d + 0.7, x, y + 5 - 0.4, z, RED, {});
    g.box(w + 0.7, 0.14, d + 0.7, x, y + 5 - 0.15, z, GOLD, {});
    dougong(x, y + 5 - 0.05, z + d / 2 + 0.3, w + 0.8, 1.2);
    g.hip(w + 2, d + 2, 3, x, y + 5, z, YELLOW, 0.09, {});
    eaveTips(w + 2, d + 2, 3, x, y + 5, z);
    ridgeBeasts(w + 2, d + 2, 3, x, y + 5, z);
    chiwen(w + 2, d + 2, 3, x, y + 5, z);
  }

  // Cloud pillar (huabiao) used on the ceremonial approach.
  function huabiao(x, z) {
    g.box(0.9, 0.35, 0.9, x, 0, z, STONE, {});
    g.cyl(0.32, 0.42, 4.2, x, 0.35, z, MARBLE, 8);
    g.box(1.05, 0.3, 1.05, x, 4.55, z, MARBLE, {});
    g.box(0.8, 0.6, 0.8, x, 4.85, z, STONE, {});
    g.sphere(0.3, x, 5.55, z, GOLD, 8);
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

  function crane(x, z) {
    g.cyl(0.1, 0.12, 1.2, x, 0, z, BRONZE, 6);
    g.box(0.8, 0.5, 0.55, x, 1.1, z - 0.3, BRONZE, {});
    g.cyl(0.09, 0.09, 1.0, x + 0.12, 1.35, z - 0.25, BRONZE, 6);
    g.sphere(0.17, x + 0.12, 2.4, z - 0.18, BRONZE, 8);
    g.cone(0.07, 0.4, x + 0.12, 2.5, z + 0.14, GOLD, 4);
    g.box(0.7, 0.15, 0.7, x, 0, z, SOIL, {});
  }

  function tortoise(x, z) {
    g.dome(0.75, x, 0.32, z, BRONZE, 10);
    g.box(1.3, 0.28, 1.0, x, 0.15, z, BRONZE, {});
    g.sphere(0.22, x, 0.26, z + 0.6, BRONZE, 8);
    g.box(0.24, 0.18, 0.24, x - 0.5, 0.12, z, BRONZE, {});
    g.box(0.24, 0.18, 0.24, x + 0.5, 0.12, z, BRONZE, {});
  }

  function burner(x, z, s = 1) {
    g.cyl(0.42 * s, 0.55 * s, 0.9 * s, x, 0, z, BRONZE, 8);
    g.cyl(0.34 * s, 0.34 * s, 0.4 * s, x, 0.9 * s, z, BRONZE, 8);
    g.box(1.3 * s, 0.2 * s, 1.3 * s, x, 1.3 * s, z, BRONZE, {});
    g.box(0.14 * s, 0.4 * s, 0.14 * s, x - 0.42 * s, 0.85 * s, z, BRONZE, {});
    g.box(0.14 * s, 0.4 * s, 0.14 * s, x + 0.42 * s, 0.85 * s, z, BRONZE, {});
    g.box(0.12 * s, 0.3 * s, 0.12 * s, x, 1.4 * s, z, GOLD, {});
    g.box(0.12 * s, 0.3 * s, 0.12 * s, x - 0.3 * s, 1.4 * s, z, GOLD, {});
    g.box(0.12 * s, 0.3 * s, 0.12 * s, x + 0.3 * s, 1.4 * s, z, GOLD, {});
  }

  function banner(x, y, z, h) {
    g.box(0.1, h, 0.1, x, y, z, GOLD, {});
    g.box(0.95, h * 0.7, 0.07, x, y + h * 0.18, z + 0.18, RED, {});
    g.box(0.3, 0.1, 0.3, x, y + h, z, GOLD, {});
    g.sphere(0.1, x, y + h + 0.12, z, GOLD, 6);
  }

  function bridge(x, z) {
    g.box(3.4, 0.5, 9, x, 0.5, z, MARBLE, {});
    g.box(3.4, 0.45, 0.24, x, 1.05, z - 4.1, MARBLE, {});
    g.box(3.4, 0.45, 0.24, x, 1.05, z + 4.1, MARBLE, {});
    for (const dz of [-4.1, 4.1]) {
      g.box(0.24, 0.55, 0.24, x - 1.55, 0.95, z + dz, MARBLE, {});
      g.box(0.24, 0.55, 0.24, x + 1.55, 0.95, z + dz, MARBLE, {});
    }
  }

  function stairs(cx, halfW, n) {
    const h = 9;
    for (let i = 0; i < n; i++) {
      const zc = 6.0 - i * 1.6;
      g.box(halfW * 2, (i + 1) * (h / n), 1.6, cx, 0, zc, MARBLE, {});
    }
  }

  // ===== Enclosure walls =====
  wall(-44, 0, 2, 114, 8);
  wall(44, 0, 2, 114, 8);
  wall(0, -57, 88, 2, 8);
  wall(-38, 57, 12, 2, 8);
  wall(38, 57, 12, 2, 8);

  // ===== Corner watchtowers =====
  cornerTower(-40, 8, -54);
  cornerTower(40, 8, -54);
  cornerTower(-40, 8, 54);
  cornerTower(40, 8, 54);

  // ===== Meridian Gate (午门): U-shaped platform + 5 towers =====
  const MG = 14;
  g.box(64, MG, 8, 0, 0, 53, RED, {});
  g.box(6, MG, 12, -29, 0, 41, RED, {});
  g.box(6, MG, 12, 29, 0, 41, RED, {});
  g.box(64, 0.5, 8.6, 0, MG, 53, MARBLE, {});
  g.box(6, 0.5, 12.6, -29, MG, 41, MARBLE, {});
  g.box(6, 0.5, 12.6, 29, MG, 41, MARBLE, {});
  for (let i = -2; i <= 2; i++) {
    const ax = i * 9;
    const r = i === 0 ? 2.1 : 1.5;
    g.arch(r, 0.4, 0.9, ax, 1.4, 57.1, DARK, 10, {});
    g.arch(r, 0.4, 0.9, ax, 1.4, 48.9, DARK, 10, {});
    g.arch(r, 0.16, 1.0, ax, 1.4, 57.2, GOLD, 10, {});
    g.arch(r, 0.16, 1.0, ax, 1.4, 48.8, GOLD, 10, {});
  }
  g.box(26, 8, 9, 0, MG, 53, RED, {});
  for (let i = 0; i < 9; i++) {
    column(-12 + i * 3, MG, 57.7, 7.6, 0.4);
    column(-12 + i * 3, MG, 48.3, 7.6, 0.4);
  }
  g.box(26.9, 0.55, 9.9, 0, MG + 8, 53, RED, {});
  g.box(26.9, 0.16, 9.9, 0, MG + 8.35, 53, GOLD, {});
  dougong(0, MG + 8.45, 57.9, 27, 1.1);
  dougong(0, MG + 8.45, 48.1, 27, 1.1);
  doubleRoof(30, 11, 4.5, 6.5, 0, MG + 8, 53, 0.12);
  pavilion(-29, MG, 52, 7);
  pavilion(29, MG, 52, 7);
  pavilion(-29, MG, 40, 7);
  pavilion(29, MG, 40, 7);
  banner(-9, MG, 57.4, 4.4);
  banner(-6, MG, 57.4, 4.4);
  banner(6, MG, 57.4, 4.4);
  banner(9, MG, 57.4, 4.4);

  // ===== Golden Water stream + 5 bridges =====
  {
    const zc = 34;
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const x = -31 + i * (62 / 14);
      pts.push([x, zc + Math.sin(i * 0.62) * 1.7 - 2.6]);
    }
    for (let i = 14; i >= 0; i--) {
      const x = -31 + i * (62 / 14);
      pts.push([x, zc + Math.sin(i * 0.62) * 1.7 + 2.6]);
    }
    g.prism(pts, 0.4, 0, WATER);
    g.box(64, 0.5, 0.9, 0, 0, 30.5, STONE, {});
    g.box(64, 0.5, 0.9, 0, 0, 37.5, STONE, {});
  }
  for (const bx of [-12, -6, 0, 6, 12]) bridge(bx, 34);

  // ===== Gate of Supreme Harmony (太和门) =====
  g.box(30, 2, 12, 0, 0, 20, MARBLE, {});
  balustrade(-15, 15, 14, 26, 2, 2);
  hall(0, 20, 22, 8, 2, 5.6, 7, { double: true, flare: 0.11 });
  for (let i = 0; i < 3; i++) {
    g.box(1.1, 3.4, 0.14, -10 + i * 10, 2, 24.1, DARK, {});
  }
  lion(-7, 25.5, Math.PI / 2);
  lion(7, 25.5, -Math.PI / 2);

  // ===== Three-tier marble terrace + three great halls =====
  g.box(42, 3, 50, 0, 0, -20, MARBLE, {});
  g.box(34, 3, 42, 0, 3, -20, MARBLE, {});
  g.box(26, 3, 34, 0, 6, -20, MARBLE, {});
  balustrade(-21, 21, 5, -45, 3, 2);
  balustrade(-17, 17, 1, -41, 6, 2);
  balustrade(-13, 13, -3, -37, 9, 2);

  // Triple staircase (front) with central dragon ramp.
  stairs(0, 2.6, 6);
  g.prism([[-2.0, 6.4], [2.0, 6.4], [1.3, -2.2], [-1.3, -2.2]], 0.3, 0.3, GOLD);
  stairs(-8, 1.4, 6);
  stairs(8, 1.4, 6);

  // Hall of Supreme Harmony (太和殿) - 11 bays.
  hall(0, -4, 22, 11, 9, 15, 11, { double: true, flare: 0.13, hLow: 6, hUp: 9 });
  for (const dx of [-8, 0, 8]) banner(dx, 9, -4 + 5.8, 5);
  crane(-15, 2);
  crane(15, 2);
  tortoise(-10, 3);
  tortoise(10, 3);
  burner(-18, 5.2, 1);
  burner(18, 5.2, 1);

  // Hall of Central Harmony (中和殿) - square.
  hall(0, -16, 10, 10, 9, 8, 5, { double: false, flare: 0.11 });
  g.sphere(0.4, 0, 9 + 8 + 4.6 + 0.5, -16, GOLD, 8);

  // Hall of Preserving Harmony (保和殿).
  hall(0, -27, 16, 9, 9, 10, 7, { double: true, flare: 0.12 });

  // ===== Side halls and corridors lining the courtyard walls =====
  sideHall(-30, 34, 11, 9);
  sideHall(30, 34, 11, 9);
  sideHall(-30, -2, 10, 8);
  sideHall(30, -2, 10, 8);
  sideHall(-28, -12, 9, 7);
  sideHall(28, -12, 9, 7);
  g.box(4, 3, 82, -42, 0, -15, RED, {});
  g.box(4, 3, 82, 42, 0, -15, RED, {});
  g.box(4, 0.4, 82, -42, 3, -15, YELLOW, {});
  g.box(4, 0.4, 82, 42, 3, -15, YELLOW, {});
  for (let i = 0; i < 14; i++) {
    const z = -56 + i * 7.5;
    column(-42, 0, z, 3, 0.2);
    column(42, 0, z, 3, 0.2);
  }

  // ===== Statues, lanterns, banners, trees =====
  lantern(-9, 42); lantern(9, 42);
  lantern(-9, 30); lantern(9, 30);
  lantern(-9, 12); lantern(9, 12);
  lantern(-9, 8); lantern(9, 8);
  crane(-14, -34);
  crane(14, -34);
  tree(-36, 46, 1); tree(36, 46, 1);
  tree(-36, -46, 1); tree(36, -46, 1);
  tree(-30, 4, 0.9); tree(30, 4, 0.9);
  tree(-30, -28, 0.9); tree(30, -28, 0.9);
  tree(-38, 20, 0.8); tree(38, 20, 0.8);
  tree(0, 40, 0.8);

  // ===== Ceremonial forecourt at the +z approach =====
  g.box(68, 0.4, 2, 0, 0, 57.6, STONE, {});
  g.box(60, 0.3, 3.4, 0, 0, 54.8, STONE, {});
  huabiao(-20, 57.4);
  huabiao(20, 57.4);
  lion(-6, 57.2, Math.PI);
  lion(6, 57.2, Math.PI);

  // Bronze burner rows on the terrace and forecourts.
  burner(-12, 6, 0.9);
  burner(12, 6, 0.9);
  burner(-16, 7, 0.8);
  burner(16, 7, 0.8);
  burner(-6, -38, 0.9);
  burner(6, -38, 0.9);

  // Stone bollards along the golden water banks.
  for (let x = -30; x <= 30; x += 3) {
    g.box(0.24, 0.55, 0.24, x, 0, 30.2, MARBLE, {});
    g.box(0.24, 0.55, 0.24, x, 0, 37.8, MARBLE, {});
  }

  // More banners along the gates and side halls.
  banner(-4, 0, 25.6, 4.6);
  banner(4, 0, 25.6, 4.6);
  banner(-15, MG, 48.8, 5);
  banner(15, MG, 48.8, 5);
  banner(-11, 0, -33.5, 4.5);
  banner(11, 0, -33.5, 4.5);

  // Inner gardens and additional trees.
  tree(-38, -30, 0.9); tree(38, -30, 0.9);
  tree(-38, 30, 0.9); tree(38, 30, 0.9);
  tree(-34, 50, 0.8); tree(34, 50, 0.8);
  tree(-34, -50, 0.8); tree(34, -50, 0.8);
  tree(-20, -44, 0.9); tree(20, -44, 0.9);

  const solid = g.build();

  // ===== Glass: lit window panes and lantern glows =====
  const glass = createGeo();
  for (let i = 0; i < 10; i++) {
    const wx = -9.9 + i * 2.2;
    glass.box(1.2, 2.6, 0.12, wx, 10.4, 1.8, 0x7fd4ff, {});
  }
  for (let i = 0; i < 6; i++) {
    const wx = -6.6 + i * 2.6;
    glass.box(1.4, 2.2, 0.12, wx, 10.4, -9.0, 0x7fd4ff, {});
  }
  for (const lx of [-9, 9]) for (const lz of [42, 30, 12, 8]) {
    glass.cyl(0.3, 0.3, 0.6, lx, 1.6, lz, 0xffd27f, 8);
  }

  const solidBox = solid.boundingBox;
  return {
    solid,
    glass: glass.build(),
    name: '紫宸宫',
    radius: 59,
    height: Math.ceil(solidBox.max.y),
  };
}
