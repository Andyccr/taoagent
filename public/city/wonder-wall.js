import { createGeo } from './geo.js';

const BRICK = 0x8c8f93, BRICK_L = 0x9a9da1, PLINTH = 0x6e7175, PAVE = 0xa7a49c;
const RED = 0xa8322a, ROOF = 0x4f5d58, GOLD = 0xd4a73a, WOOD = 0x5a3a24;
const DARK = 0x2f2c2a, STONE = 0xc9b9a0;
const H = 17, T = 9, GAP = 8;

function merlons(g, x0, x1, z, y, step, hex = BRICK_L, w = 0.7, h = 0.9, d = 0.55) {
  for (let x = x0; x <= x1; x += step) g.box(w, h, d, x, y, z, hex);
}

function columns(g, w, d, h, y, step = 2.2) {
  const nx = Math.max(2, Math.round(w / step));
  for (let i = 0; i <= nx; i++) {
    for (const z of [-d / 2, d / 2]) g.cyl(0.2, 0.24, h, -w / 2 + (i * w) / nx, y, z, RED, 6);
  }
  const nz = Math.max(2, Math.round(d / step));
  for (let i = 1; i < nz; i++) {
    for (const x of [-w / 2, w / 2]) g.cyl(0.2, 0.24, h, x, y, -d / 2 + (i * d) / nz, RED, 6);
  }
}

function dougong(g, w, d, y) {
  const nx = Math.max(2, Math.round(w / 2));
  for (let i = 0; i <= nx; i++) {
    for (const z of [-d / 2, d / 2]) g.box(0.34, 0.45, 0.45, -w / 2 + (i * w) / nx, y, z, WOOD);
  }
  const nz = Math.max(2, Math.round(d / 2));
  for (let i = 1; i < nz; i++) {
    for (const x of [-w / 2, w / 2]) g.box(0.45, 0.45, 0.34, x, y, -d / 2 + (i * d) / nz, WOOD);
  }
}

function wallRun(g, x0, x1) {
  const len = x1 - x0, cx = (x0 + x1) / 2;
  if (len <= 0) return;
  g.box(len, 1.8, T + 0.8, cx, 0, 0, PLINTH);
  g.box(len, H - 1.8, T, cx, 1.8, 0, BRICK);
  g.box(len, 0.4, T - 1, cx, H, 0, PAVE);
  for (const y of [5.6, 11.2, 15.0]) g.box(len, 0.28, T + 0.45, cx, y, 0, BRICK_L);

  g.box(len, 0.8, 0.55, cx, H, T / 2 - 0.275, BRICK_L);
  merlons(g, x0 + 0.55, x1 - 0.55, T / 2 - 0.275, H + 0.8, 1.35);

  g.box(len, 1.0, 0.5, cx, H, -T / 2 + 0.25, BRICK_L);
  merlons(g, x0 + 0.8, x1 - 0.8, -T / 2 + 0.25, H + 1.0, 1.5, BRICK_L, 0.7, 0.75, 0.5);

  for (let x = x0 + 2.2; x < x1 - 1.2; x += 3.2) {
    g.box(0.22, 1.15, 0.1, x, 7.2, T / 2 + 0.03, DARK);
    g.box(0.22, 1.15, 0.1, x, 13.2, T / 2 + 0.03, DARK);
  }
}

function cornerTower(g, x) {
  g.box(15, 2.2, 15, x, 0, 0.5, PLINTH);
  g.box(13, 22, 13, x, 2.2, 0.5, BRICK);
  for (const y of [9, 17, 23.8]) g.box(13.7, 0.45, 13.7, x, y, 0.5, BRICK_L);

  for (const y of [5, 10.5, 16, 21.5]) {
    for (const dx of [-3.6, 0, 3.6]) {
      g.box(0.65, 1.15, 0.12, x + dx, y, 7.06, DARK);
      g.box(0.65, 1.15, 0.12, x + dx, y, -6.06, DARK);
    }
    for (const dz of [-3.6, 0, 3.6]) {
      g.box(0.12, 1.15, 0.65, x + 6.56, y, 0.5 + dz, DARK);
      g.box(0.12, 1.15, 0.65, x - 6.56, y, 0.5 + dz, DARK);
    }
  }

  const top = 24.2;
  for (let i = -6; i <= 6; i += 1.5) {
    g.box(0.7, 1.0, 0.5, x + i, top, 7.05, BRICK_L);
    g.box(0.7, 1.0, 0.5, x + i, top, -6.05, BRICK_L);
    g.box(0.5, 1.0, 0.7, x + 6.55, top, 0.5 + i, BRICK_L);
    g.box(0.5, 1.0, 0.7, x - 6.55, top, 0.5 + i, BRICK_L);
  }

  g.box(9.5, 0.5, 9.5, x, top, 0.5, BRICK_L);
  g.box(8, 3.6, 8, x, top + 0.5, 0.5, STONE);

  for (const dx of [-3.6, 0, 3.6]) {
    for (const dz of [-3.6, 3.6]) g.cyl(0.18, 0.22, 3.6, x + dx, top + 0.5, 0.5 + dz, RED, 6);
  }
  for (const dz of [-3.6, 0, 3.6]) {
    for (const dx of [-3.6, 3.6]) g.cyl(0.18, 0.22, 3.6, x + dx, top + 0.5, 0.5 + dz, RED, 6);
  }

  g.box(9, 0.35, 9, x, top + 4.1, 0.5, WOOD);
  g.hip(11.5, 11.5, 2.8, x, top + 4.45, 0.5, ROOF, 1.6);
  g.cyl(0.22, 0.3, 1.8, x, top + 7.25, 0.5, GOLD, 6);
  g.sphere(0.38, x, top + 9.05, 0.5, GOLD, 6);
  g.cone(0.2, 0.8, x, top + 9.4, 0.5, GOLD, 6);
}

export function buildCityWall(length = 100) {
  const g = createGeo();
  const half = length / 2;

  wallRun(g, -half, -GAP / 2);
  wallRun(g, GAP / 2, half);

  g.arch(GAP / 2, 0.95, T + 0.8, 0, 0, 0, PLINTH, 14);
  g.box(GAP + 1.2, H - GAP / 2, T, 0, GAP / 2, 0, BRICK);
  g.box(GAP, 0.4, T - 1, 0, H, 0, PAVE);
  g.box(GAP - 1.2, 0.08, T + 0.8, 0, 0, 0, 0x6b6459);

  for (const s of [-1, 1]) {
    g.box(0.5, GAP / 2 + 0.4, T + 0.2, s * (GAP / 2 - 0.25), 0, 0, WOOD);
    g.box(0.18, 1.2, 0.18, s * (GAP / 2 - 0.95), 4.2, T / 2 + 0.42, GOLD);
  }

  for (let x = -half + 7; x <= half - 7; x += 9) {
    if (Math.abs(x) < 9) continue;
    g.box(5.6, 2.4, 5.4, x, 0, T / 2 + 2.0, PLINTH);
    g.box(5.0, H + 0.5, 4.2, x, 2.4, T / 2 + 2.3, BRICK);
    g.box(5.4, 0.5, 4.6, x, H + 2.9, T / 2 + 2.3, BRICK_L);
    merlons(g, x - 1.8, x + 1.8, T / 2 + 2.3, H + 3.4, 1.2, BRICK_L, 0.75, 0.85, 0.5);
    for (const y of [6, 11.5, 16.5]) {
      g.box(0.24, 1.2, 0.12, x, y, 8.93, DARK);
      g.box(0.12, 1.2, 0.24, x - 2.53, y, T / 2 + 2.3, DARK);
      g.box(0.12, 1.2, 0.24, x + 2.53, y, T / 2 + 2.3, DARK);
    }
  }

  g.group({ y: H + 0.3 }, () => {
    g.box(32, 1.8, 8, 0, 0, 0, PLINTH);

    for (let x = -12; x <= 12; x += 2) {
      g.box(0.25, 1.0, 0.25, x, 1.8, 4.0, BRICK_L);
      g.box(0.25, 1.0, 0.25, x, 1.8, -4.0, BRICK_L);
    }
    for (const z of [-2, 0, 2]) {
      g.box(0.25, 1.0, 0.25, -15.8, 1.8, z, BRICK_L);
      g.box(0.25, 1.0, 0.25, 15.8, 1.8, z, BRICK_L);
    }

    g.box(22, 5.4, 7, 0, 1.8, 0, STONE);
    columns(g, 22, 7, 5.4, 1.8, 2.2);
    for (let i = -2; i <= 2; i++) g.box(1.5, 1.2, 0.08, i * 3.4, 4.8, 3.54, DARK);
    dougong(g, 22, 7, 7.2);
    g.box(22.8, 0.4, 7.8, 0, 7.2, 0, WOOD);
    g.hip(26, 14, 2.0, 0, 7.6, 0, ROOF, 1.8);
    g.hip(30, 16, 1.1, 0, 7.35, 0, ROOF, 2.2);

    g.box(16, 4.2, 5.8, 0, 8.2, 0, STONE);
    columns(g, 16, 5.8, 4.2, 8.2, 2.2);
    for (let i = -1; i <= 1; i++) g.box(1.3, 1.0, 0.08, i * 3.2, 9.8, 2.94, DARK);
    dougong(g, 16, 5.8, 12.4);
    g.box(16.8, 0.4, 6.6, 0, 12.4, 0, WOOD);
    g.hip(20, 11, 2.6, 0, 12.8, 0, ROOF, 1.8);
    g.box(7, 0.32, 0.34, 0, 15.4, 0, ROOF);

    for (const x of [-4.2, 4.2]) {
      g.cyl(0.16, 0.22, 1.4, x, 15.4, 0, GOLD, 6);
      g.sphere(0.32, x, 16.9, 0, GOLD, 6);
    }

    for (const x of [-13.4, 13.4]) {
      g.box(6.4, 0.5, 5.4, x, 0, 0, PLINTH);
      g.box(5.4, 3.8, 4.6, x, 0.5, 0, STONE);
      for (const dx of [-2.2, 2.2]) {
        for (const dz of [-1.8, 1.8]) g.cyl(0.16, 0.2, 3.8, x + dx, 0.5, dz, RED, 6);
      }
      g.box(6.2, 0.35, 5.2, x, 4.3, 0, WOOD);
      g.hip(7.4, 6.6, 1.8, x, 4.65, 0, ROOF, 1.2);
      g.cone(0.18, 0.9, x, 6.45, 0, GOLD, 6);
      g.sphere(0.24, x, 7.4, 0, GOLD, 6);
    }
  });

  const R = 19, N = 42, bz = T / 2 + R * 0.72;
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * (i + 0.5)) / N;
    if (Math.abs(i - N / 2) < 2.5) continue;
    const x = Math.cos(a) * R;
    const z = T / 2 + Math.sin(a) * R * 0.72;
    const seg = (Math.PI * R) / N + 0.35;
    const ry = -Math.atan2(Math.cos(a) * 0.72, -Math.sin(a));
    g.box(seg + 0.35, 1.2, 3.8, x, 0, z, PLINTH, { ry });
    g.box(seg, 9.8, 3.2, x, 1.2, z, BRICK, { ry });
    g.box(seg + 0.2, 0.45, 3.4, x, 11, z, BRICK_L, { ry });
    g.box(0.7, 0.9, 0.4, x, 11.45, z, BRICK_L, { ry });
    g.box(0.2, 1.2, 0.12, x + Math.cos(a) * 1.63, 6, z + Math.sin(a) * 1.63, DARK, { ry });
  }

  g.box(8, 11, 3.2, 0, 0, bz, BRICK);
  g.box(9.6, 0.6, 4, 0, 11, bz, BRICK_L);
  g.arch(2.6, 0.55, 3.6, 0, 0, bz + 1.65, PLINTH, 10);
  g.box(7, 0.5, 3, 0, 11.6, bz, PAVE);
  g.hip(10.5, 7.5, 2.2, 0, 11.6, bz, ROOF, 1.4);
  g.cyl(0.2, 0.28, 1.3, 0, 13.8, bz, GOLD, 6);
  g.sphere(0.3, 0, 15.1, bz, GOLD, 6);

  for (let x = -half + 7; x <= half - 7; x += 5.5) {
    if (Math.abs(x) < 18) continue;
    g.box(0.8, 0.5, 0.8, x, H + 0.4, 0.8, WOOD);
    g.cyl(0.1, 0.16, 6, x, H + 0.9, 0.8, WOOD, 6);
    g.box(1.8, 0.14, 0.14, x + 0.8, H + 6.0, 0.8, GOLD);
    g.box(1.4, 2.4, 0.06, x + 1.1, H + 3.5, 0.8, RED);
    g.cone(0.18, 0.7, x, H + 6.9, 0.8, GOLD, 6);
    g.sphere(0.16, x, H + 7.6, 0.8, GOLD, 5);
  }

  for (const x of [-half + 22, half - 22]) {
    for (let i = 0; i < 24; i++) {
      g.box(2.8, (i + 1) * (H / 24), 1.0, x, 0, -T / 2 - 0.5 - (23 - i), BRICK_L);
    }
    for (let i = 0; i < 24; i += 3) {
      for (const s of [-1, 1]) {
        g.box(0.2, 2.2, 0.2, x + s * 1.5, (i * H) / 24, -T / 2 - 0.5 - (23 - i), WOOD);
      }
    }
  }

  for (const s of [-1, 1]) cornerTower(g, s * (half + 1.5));

  return { solid: g.build(), glass: null, name: '万里城关', radius: length / 2 + 12, height: 34 };
}
