import { createGeo } from './geo.js';

const BRICK = 0x8c8f93, BRICK_L = 0x9a9da1, PLINTH = 0x6e7175, PAVE = 0xa7a49c;
const RED = 0xa8322a, RED_D = 0x7d241e, TILE = 0xb8a63c, TILE_D = 0x8e7d2c;
const GREEN = 0x7d8a44, GOLD = 0xd4a73a, WOOD = 0x5a3a24;
const DARK = 0x2f2c2a, STONE = 0xc9b9a0, STONE_D = 0x9a8f7c;
const GLASS = 0xffcf7a;

const WALL_H = 14, WALL_T = 9, WALL_Z = -4;
const FRONT = WALL_Z + WALL_T / 2, BACK = WALL_Z - WALL_T / 2;

function merlons(g, x0, x1, z, y, step, hex = BRICK_L, w = 0.7, h = 0.9, d = 0.55, slit = true) {
  for (let x = x0; x <= x1; x += step) {
    g.box(w, h, d, x, y, z, hex);
    if (slit) g.box(0.15, h * 0.42, 0.07, x, y + h * 0.28, z + d / 2 + 0.02, DARK);
  }
}

function railing(g, cx, cz, w, d, y, hex = RED, step = 1.8) {
  const nx = Math.max(2, Math.round(w / step));
  for (let i = 0; i <= nx; i++) {
    const x = cx - w / 2 + (i * w) / nx;
    g.box(0.16, 1.05, 0.16, x, y, cz - d / 2, hex);
    g.box(0.16, 1.05, 0.16, x, y, cz + d / 2, hex);
  }
  const nz = Math.max(2, Math.round(d / step));
  for (let i = 1; i < nz; i++) {
    const z = cz - d / 2 + (i * d) / nz;
    g.box(0.16, 1.05, 0.16, cx - w / 2, y, z, hex);
    g.box(0.16, 1.05, 0.16, cx + w / 2, y, z, hex);
  }
  g.box(w + 0.25, 0.12, 0.14, cx, y + 1.0, cz - d / 2, GOLD);
  g.box(w + 0.25, 0.12, 0.14, cx, y + 1.0, cz + d / 2, GOLD);
  g.box(0.14, 0.12, d + 0.25, cx - w / 2, y + 1.0, cz, GOLD);
  g.box(0.14, 0.12, d + 0.25, cx + w / 2, y + 1.0, cz, GOLD);
}

function columns(g, cx, cz, w, d, h, y, step = 2.2, hex = RED) {
  const nx = Math.max(2, Math.round(w / step));
  for (let i = 0; i <= nx; i++) {
    const x = cx - w / 2 + (i * w) / nx;
    for (const z of [cz - d / 2, cz + d / 2]) {
      g.box(0.6, 0.3, 0.6, x, y, z, STONE_D);
      g.cyl(0.2, 0.24, h, x, y + 0.3, z, hex, 6);
      g.box(0.58, 0.28, 0.58, x, y + h + 0.2, z, GOLD);
    }
  }
  const nz = Math.max(2, Math.round(d / step));
  for (let i = 1; i < nz; i++) {
    const z = cz - d / 2 + (i * d) / nz;
    for (const x of [cx - w / 2, cx + w / 2]) {
      g.box(0.6, 0.3, 0.6, x, y, z, STONE_D);
      g.cyl(0.2, 0.24, h, x, y + 0.3, z, hex, 6);
      g.box(0.58, 0.28, 0.58, x, y + h + 0.2, z, GOLD);
    }
  }
}

function dougong(g, cx, cz, w, d, y, step = 1.7, hex = WOOD) {
  const nx = Math.max(2, Math.round(w / step));
  for (let i = 0; i <= nx; i++) {
    const x = cx - w / 2 + (i * w) / nx;
    for (const z of [cz - d / 2, cz + d / 2]) {
      g.box(0.34, 0.32, 0.55, x, y, z, hex);
      g.box(0.68, 0.24, 0.38, x, y + 0.32, z, GOLD);
    }
  }
  const nz = Math.max(2, Math.round(d / step));
  for (let i = 1; i < nz; i++) {
    const z = cz - d / 2 + (i * d) / nz;
    for (const x of [cx - w / 2, cx + w / 2]) {
      g.box(0.55, 0.32, 0.34, x, y, z, hex);
      g.box(0.38, 0.24, 0.68, x, y + 0.32, z, GOLD);
    }
  }
}
function hipRoof(g, cx, cz, w, d, h, y, hex = TILE, flare = 2.0) {
  g.box(w * 1.02, 0.34, d * 1.02, cx, y - 0.34, cz, TILE_D);
  g.hip(w, d, h, cx, y, cz, hex, flare);
  const rl = Math.max(0.8, w * 0.12);
  g.box(rl * 1.5, 0.38, Math.max(0.5, d * 0.12), cx, y + h, cz, TILE_D);
  for (const sx of [-1, 1]) {
    g.box(0.3, 0.55, 0.3, cx + sx * rl * 0.65, y + h + 0.35, cz, GOLD);
    g.cone(0.16, 0.45, cx + sx * rl * 0.65, y + h + 0.9, cz, GOLD, 4);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const ex = cx + sx * (w * 0.49), ez = cz + sz * (d * 0.49);
      g.box(0.34, 0.5, 0.34, ex, y + 0.12, ez, GOLD);
      g.cone(0.16, 0.42, ex, y + 0.62, ez, GOLD, 4);
      g.box(0.07, 0.55, 0.07, ex, y - 0.85, ez, GOLD);
      g.cyl(0.05, 0.2, 0.32, ex, y - 1.17, ez, GOLD, 4);
      for (const t of [0.32, 0.58, 0.8]) {
        const bx = cx + sx * (w / 2) * (1 - t), bz = cz + sz * (d / 2) * (1 - t), by = y + h * t;
        g.box(0.26, 0.42, 0.26, bx, by, bz, GOLD);
        g.cone(0.13, 0.35, bx, by + 0.42, bz, GOLD, 4);
      }
    }
  }
}

function towerStorey(g, base, w, d, h, roofW, roofD, roofH, panels = 3) {
  g.group({ x: 0, y: base, z: WALL_Z }, (g) => {
    g.box(w + 4, 0.45, d + 3, 0, 0, 0, WOOD);
    g.box(w, h, d, 0, 0.45, 0, RED_D);
    columns(g, 0, 0, w + 2.6, d + 1.8, h, 0.45, 2.4);
    railing(g, 0, 0, w + 3.8, d + 2.6, 0.45, RED, 1.8);
    for (let i = 0; i < panels; i++) {
      const x = -w / 2 + (w * (i + 1)) / (panels + 1);
      for (const z of [-d / 2 - 0.06, d / 2 + 0.06]) {
        g.box(1.9, 2.5, 0.1, x, 1.2, z, DARK);
        g.box(0.14, 2.5, 0.14, x, 1.2, z + Math.sign(z) * 0.05, GOLD);
        g.box(1.9, 0.12, 0.14, x, 2.45, z + Math.sign(z) * 0.05, GOLD);
      }
    }
    for (const x of [-w * 0.33, w * 0.33]) {
      for (const z of [d / 2 + 1.1, -d / 2 - 1.1]) {
        g.box(1.25, 2.5, 0.08, x, 1.7, z, RED);
        g.box(1.25, 0.16, 0.1, x, 4.05, z, GOLD);
        g.box(0.12, 2.5, 0.1, x, 1.7, z + Math.sign(z) * 0.04, GOLD);
        g.cone(0.12, 0.42, x, 1.28, z, GOLD, 4);
      }
    }
    dougong(g, 0, 0, w + 2.6, d + 1.8, 0.45 + h + 0.05, 1.8);
    hipRoof(g, 0, 0, roofW, roofD, roofH, 0.45 + h + 0.35, TILE, 2.2);
  });
}

function arrowTower(g, gg, cx, cz) {
  const w = 12, d = 6, bodyH = 20, baseY = 1.6;
  for (const s of [-1, 1]) {
    g.box(3.8, 1.6, 8, cx + s * 4.65, 0, cz, PLINTH);
    g.box(3.2, bodyH, d, cx + s * 4.4, baseY, cz, BRICK);
  }
  g.box(5.6, bodyH - 6.4, d, cx, 8.0, cz, BRICK);
  for (const y of [12.2, 18]) g.box(12.6, 0.3, d + 0.6, cx, y, cz, BRICK_L);
  g.arch(3.1, 0.6, 0.6, cx, 5.0, cz + d / 2 + 0.28, PLINTH, 12);
  g.arch(3.1, 0.6, 0.6, cx, 5.0, cz - d / 2 - 0.28, PLINTH, 12);
  for (const y of [11, 14, 17, 20]) {
    for (const x of [-4.6, -2.3, 0, 2.3, 4.6]) g.box(0.5, 1.15, 0.1, cx + x, y, cz + d / 2 + 0.06, DARK);
    for (const z of [-2.1, 0, 2.1]) {
      g.box(0.1, 1.15, 0.5, cx + w / 2 + 0.06, y, cz + z, DARK);
      g.box(0.1, 1.15, 0.5, cx - w / 2 - 0.06, y, cz + z, DARK);
    }
  }
  gg.box(0.36, 0.8, 0.08, cx, 14.2, cz + d / 2 + 0.09, GLASS);
  gg.box(0.36, 0.8, 0.08, cx, 17.2, cz + d / 2 + 0.09, GLASS);
  g.box(13, 0.5, 7, cx, 21.6, cz, PAVE);
  merlons(g, cx - 6, cx + 6, cz + 3.25, 22.1, 1.4, BRICK_L, 0.7, 0.5, 0.5, false);
  merlons(g, cx - 6, cx + 6, cz - 3.25, 22.1, 1.4, BRICK_L, 0.7, 0.5, 0.5, false);
  for (let z = cz - 2.6; z <= cz + 2.6; z += 1.3) {
    g.box(0.5, 0.5, 0.7, cx + 6.25, 22.1, z, BRICK_L);
    g.box(0.5, 0.5, 0.7, cx - 6.25, 22.1, z, BRICK_L);
  }
  hipRoof(g, cx, cz, 16, 9, 2.3, 23.0, TILE, 2.0);
  hipRoof(g, cx, cz, 10.5, 6, 2.1, 25.5, TILE, 1.6);
  g.cyl(0.3, 0.42, 1.2, cx, 27.6, cz, GOLD, 6);
  g.sphere(0.34, cx, 29.3, cz, GOLD, 6);
  g.cone(0.16, 0.5, cx, 29.7, cz, GOLD, 4);
}
function bastion(g, cx) {
  g.group({ x: cx, y: 0, z: WALL_Z }, (g) => {
    g.box(12, 1.8, 15, 0, 0, 0, PLINTH);
    g.box(11, 18.2, 13, 0, 1.8, 0, BRICK);
    for (const y of [7.5, 12.5, 17.5]) g.box(11.6, 0.3, 13.6, 0, y, 0, BRICK_L);
    for (const y of [5, 9.5, 14, 18]) {
      for (const dx of [-3.2, 0, 3.2]) {
        g.box(0.6, 1.1, 0.12, dx, y, 6.56, DARK);
        g.box(0.6, 1.1, 0.12, dx, y, -6.56, DARK);
      }
      for (const dz of [-3.2, 0, 3.2]) {
        g.box(0.12, 1.1, 0.6, 5.56, y, dz, DARK);
        g.box(0.12, 1.1, 0.6, -5.56, y, dz, DARK);
      }
    }
    g.box(12, 0.5, 14, 0, 20, 0, PAVE);
    merlons(g, -5.5, 5.5, 6.75, 20.5, 1.3, BRICK_L, 0.7, 0.85, 0.5, false);
    merlons(g, -5.5, 5.5, -6.75, 20.5, 1.3, BRICK_L, 0.7, 0.85, 0.5, false);
    for (let z = -5.5; z <= 5.5; z += 1.3) {
      g.box(0.5, 0.85, 0.7, 5.75, 20.5, z, BRICK_L);
      g.box(0.5, 0.85, 0.7, -5.75, 20.5, z, BRICK_L);
    }
    g.box(9, 0.5, 9, 0, 20.5, 0, PLINTH);
    g.box(7, 4.5, 7, 0, 21, 0, RED_D);
    columns(g, 0, 0, 8, 8, 4.5, 21, 2.0);
    railing(g, 0, 0, 9, 9, 21, RED, 1.8);
    dougong(g, 0, 0, 8, 8, 25.5, 1.7);
    hipRoof(g, 0, 0, 11, 11, 2.2, 26.0, TILE, 1.8);
    g.cyl(0.28, 0.38, 1.2, 0, 28.2, 0, GOLD, 6);
    g.sphere(0.34, 0, 29.4, 0, GOLD, 6);
    g.cone(0.16, 0.5, 0, 29.7, 0, GOLD, 4);
  });
}

function flag(g, x, z) {
  const y = 14.4;
  g.box(0.9, 0.5, 0.9, x, y, z, STONE);
  g.cyl(0.09, 0.14, 11.5, x, y + 0.5, z, WOOD, 6);
  g.box(1.9, 0.12, 0.12, x + 0.95, y + 11.6, z, GOLD);
  g.box(1.6, 2.6, 0.06, x + 1.0, y + 9.2, z, RED);
  g.box(0.5, 2.6, 0.07, x + 1.3, y + 9.2, z, GOLD);
  g.cone(0.18, 0.6, x, y + 12.0, z, GOLD, 6);
  g.sphere(0.15, x, y + 12.7, z, GOLD, 5);
}

function lion(g, x, z) {
  g.group({ x, y: 0, z }, (g) => {
    g.box(1.8, 1.1, 1.8, 0, 0, 0, STONE_D);
    g.box(1.5, 0.25, 1.5, 0, 1.1, 0, STONE);
    g.box(1.0, 1.0, 1.4, 0, 1.35, 0, STONE);
    g.box(0.9, 0.9, 0.7, 0, 1.9, 0.45, STONE);
    g.sphere(0.55, 0, 2.45, 0.35, STONE_D, 6);
    g.sphere(0.48, 0, 2.6, 0.5, STONE, 6);
    for (const sx of [-1, 1]) g.box(0.3, 0.7, 0.3, sx * 0.35, 1.2, 0.5, STONE);
    g.box(0.2, 0.9, 0.2, 0, 1.8, -0.65, STONE);
  });
}

function guardian(g, x, z) {
  g.group({ x, y: 0, z }, (g) => {
    g.box(1.6, 1.2, 1.6, 0, 0, 0, STONE_D);
    g.box(1.2, 0.3, 1.2, 0, 1.2, 0, STONE);
    g.box(0.8, 1.6, 0.6, 0, 1.5, 0, RED_D);
    g.sphere(0.38, 0, 3.3, 0, STONE, 6);
    g.box(0.9, 0.2, 0.9, 0, 3.6, 0, GOLD);
    g.box(0.16, 1.6, 0.16, -0.65, 1.6, 0, WOOD);
    g.cone(0.18, 0.5, -0.65, 3.2, 0, GOLD, 4);
  });
}

function lantern(g, gg, x, z) {
  g.box(0.8, 0.3, 0.8, x, 0, z, STONE_D);
  g.cyl(0.12, 0.18, 1.6, x, 0.3, z, STONE, 6);
  g.box(0.8, 0.7, 0.8, x, 1.9, z, STONE);
  gg.box(0.84, 0.34, 0.84, x, 2.05, z, GLASS);
  g.box(0.9, 0.2, 0.9, x, 3.0, z, STONE_D);
  g.cone(0.35, 0.6, x, 3.2, z, STONE_D, 4);
}

function tree(g, x, z, s = 1) {
  g.cyl(0.18 * s, 0.28 * s, 2.2 * s, x, 0, z, WOOD, 6);
  g.cone(1.6 * s, 2.4 * s, x, 2.0 * s, z, 0x4f6b3a, 7);
  g.cone(1.25 * s, 2.0 * s, x, 3.2 * s, z, 0x5b7a42, 7);
  g.cone(0.9 * s, 1.6 * s, x, 4.3 * s, z, 0x6a8a4c, 7);
}
function barbican(g, cx, cz, rx, rz, y, h, thick, N) {
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * (i + 0.5)) / N;
    const x = cx + Math.cos(a) * rx;
    const z = cz + Math.sin(a) * rz;
    if (Math.abs(x - cx) < 6.3) continue;
    const a0 = (Math.PI * i) / N, a1 = (Math.PI * (i + 1)) / N;
    const x0 = cx + Math.cos(a0) * rx, z0 = cz + Math.sin(a0) * rz;
    const x1 = cx + Math.cos(a1) * rx, z1 = cz + Math.sin(a1) * rz;
    const seg = Math.hypot(x1 - x0, z1 - z0) + 0.35;
    const tx = x1 - x0, tz = z1 - z0;
    const ry = Math.atan2(-tz, tx);
    g.box(seg, 1.2, thick + 0.7, x, y, z, PLINTH, { ry });
    g.box(seg, h - 1.2, thick, x, y + 1.2, z, BRICK, { ry });
    g.box(seg + 0.1, 0.4, thick + 0.3, x, y + h, z, BRICK_L, { ry });
    const da = Math.PI / N;
    for (const f of [0.2, 0.5, 0.8]) {
      const af = a0 + da * f;
      g.box(0.75, 0.9, 0.5, cx + Math.cos(af) * rx, y + h + 0.4, cz + Math.sin(af) * rz, BRICK_L, { ry });
    }
    const gl = Math.hypot(Math.cos(a) / rx, Math.sin(a) / rz);
    const nx = Math.cos(a) / rx / gl, nz = Math.sin(a) / rz / gl;
    g.box(0.16, 1.2, 0.1, x + nx * (thick / 2 + 0.02), y + h * 0.55, z + nz * (thick / 2 + 0.02), DARK, { ry });
  }
}

export function buildCityWall(length = 100) {
  const g = createGeo();
  const gg = createGeo();
  const half = Math.max(length / 2, 55);

  const fullSegs = [[-half, -12.1], [-6.9, -4.5], [4.5, 6.9], [12.1, half]];
  for (const [x0, x1] of fullSegs) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    if (w <= 0) continue;
    g.box(w, 1.8, WALL_T + 1, cx, 0, WALL_Z, PLINTH);
    g.box(w, WALL_H - 1.8, WALL_T, cx, 1.8, WALL_Z, BRICK);
    g.box(w + 0.05, 0.28, WALL_T + 0.4, cx, 5.6, WALL_Z, BRICK_L);
  }
  g.box(9, WALL_H - 9.5, WALL_T, 0, 9.5, WALL_Z, BRICK);
  g.box(5.2, WALL_H - 6.6, WALL_T, -9.5, 6.6, WALL_Z, BRICK);
  g.box(5.2, WALL_H - 6.6, WALL_T, 9.5, 6.6, WALL_Z, BRICK);

  g.box(2 * half, 0.28, WALL_T + 0.4, 0, 11.2, WALL_Z, BRICK_L);
  g.box(2 * half, 0.22, WALL_T + 0.3, 0, 13.5, WALL_Z, BRICK_L);
  g.box(2 * half, 0.4, WALL_T - 1.2, 0, WALL_H, WALL_Z, PAVE);

  g.box(2 * half, 0.8, 0.55, 0, WALL_H, FRONT - 0.275, BRICK_L);
  merlons(g, -half + 0.6, half - 0.6, FRONT - 0.275, WALL_H + 0.8, 1.5);
  g.box(2 * half, 0.75, 0.5, 0, WALL_H, BACK + 0.25, BRICK_L);
  merlons(g, -half + 0.8, half - 0.8, BACK + 0.25, WALL_H + 0.75, 1.6, BRICK_L, 0.7, 0.75, 0.5, false);

  for (let x = -half + 2.2; x < half - 1.2; x += 3.1) {
    if (Math.abs(x) < 13.5) continue;
    for (const y of [6.0, 9.4, 12.6]) g.box(0.2, 1.15, 0.1, x, y, FRONT + 0.03, DARK);
    g.box(0.2, 1.15, 0.1, x, 9.4, BACK - 0.03, DARK);
  }
  for (let x = -half + 4; x <= half - 4; x += 7) {
    if (Math.abs(x) < 14) continue;
    g.box(1.1, WALL_H - 2.0, 0.5, x, 1.8, FRONT + 0.25, BRICK_L);
    g.box(1.4, 0.5, 0.7, x, WALL_H - 0.6, FRONT + 0.3, BRICK_L);
    g.box(1.4, 0.4, 0.7, x, 1.8, FRONT + 0.3, PLINTH);
  }
  g.arch(4.8, 0.6, 0.6, 0, 5.0, FRONT + 0.1, PLINTH, 14);
  g.arch(4.8, 0.6, 0.6, 0, 5.0, BACK - 0.1, PLINTH, 14);
  for (const s of [-1, 1]) {
    g.arch(2.9, 0.5, 0.5, s * 9.5, 4.0, FRONT + 0.1, PLINTH, 10);
    g.arch(2.9, 0.5, 0.5, s * 9.5, 4.0, BACK - 0.1, PLINTH, 10);
  }
  g.box(9, 0.12, WALL_T, 0, 0, WALL_Z, 0x6b6459);
  g.box(5.2, 0.12, WALL_T, -9.5, 0, WALL_Z, 0x6b6459);
  g.box(5.2, 0.12, WALL_T, 9.5, 0, WALL_Z, 0x6b6459);
  g.box(5.6, 2.2, 0.3, 0, 11.5, FRONT + 0.2, GOLD);
  g.box(5.0, 1.6, 0.36, 0, 11.8, FRONT + 0.35, 0x2a3f6b);

  g.box(38, 0.7, 13, 0, 14.4, WALL_Z, PLINTH);
  g.box(35, 0.7, 12, 0, 15.1, WALL_Z, BRICK_L);
  for (const z of [1.5, -9.5]) {
    for (let x = -18; x <= 18; x += 2.4) g.box(0.5, 0.7, 2.0, x, 13.7, z, WOOD);
  }
  towerStorey(g, 15.8, 26, 9, 6.5, 34, 16, 2.6, 3);
  towerStorey(g, 25.4, 20, 8, 5.5, 27, 13, 2.6, 2);
  towerStorey(g, 34.0, 14, 7, 4.5, 21, 11, 3.0, 2);

  g.cyl(1.0, 1.5, 1.2, 0, 42.3, WALL_Z, GOLD, 8);
  g.ring(0.8, 0.18, 0, 43.7, WALL_Z, GOLD, 12);
  g.cyl(0.55, 0.8, 1.1, 0, 44.1, WALL_Z, GOLD, 8);
  g.sphere(0.72, 0, 45.7, WALL_Z, GOLD, 8);
  g.cone(0.42, 1.7, 0, 46.4, WALL_Z, GOLD, 8);
  g.sphere(0.16, 0, 48.1, WALL_Z, GOLD, 5);
  gg.ring(1.45, 0.12, 0, 42.6, WALL_Z, GLASS, 16);

  for (const s of [-1, 1]) bastion(g, s * 47);
  for (const x of [-38, -22, 22, 38]) flag(g, x, FRONT - 0.4);
  barbican(g, 0, 0.8, 26, 10.7, 0, 10.5, 3.4, 38);
  arrowTower(g, gg, 0, 11.5);

  for (const s of [-1, 1]) {
    lion(g, s * 5.6, 17.0);
    guardian(g, s * 6.0, 3.2);
    lantern(g, gg, s * 7.4, 8.6);
    lantern(g, gg, s * 9.5, 15.5);
    lantern(g, gg, s * 12.5, 17.5);
    lantern(g, gg, s * 14, 2.0);
    g.box(6, 0.5, 2.4, s * 15, 0, 5.5, STONE_D);
    g.box(5.6, 0.25, 2.0, s * 15, 0.5, 5.5, GREEN);
    tree(g, s * 15, 5.5, 0.9);
  }
  for (const x of [-40, -34, -28, -24, -12, 12, 24, 28, 34, 40]) tree(g, x, -15, 0.85);

  for (let i = 0; i < 6; i++) {
    const z = 14.9 + i * 0.92;
    const h = (0.18 * (6 - i)) / 6 + 0.03;
    g.box(9, h, 0.96, 0, 0, z, i % 2 ? STONE_D : STONE);
  }
  for (const s of [-1, 1]) {
    g.box(0.4, 0.9, 5.6, s * 4.9, 0, 17.2, STONE_D);
    g.box(0.55, 0.18, 5.6, s * 4.9, 0.9, 17.2, GOLD);
  }
  g.box(18, 0.15, 5.5, -12, 0, 17.2, PAVE);
  g.box(18, 0.15, 5.5, 12, 0, 17.2, PAVE);
  g.box(20, 0.15, 7, 0, 0, 4.6, PAVE);
  g.box(8, 0.16, 7, 0, 0, 4.6, STONE);

  for (const s of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const z = -9.3 - i * 0.9;
      const h = (WALL_H * (11 - i)) / 11;
      g.box(4.2, h, 0.95, s * 20, 0, z, i % 2 ? BRICK : BRICK_L);
    }
  }

  return { solid: g.build(), glass: gg.triangles() ? gg.build() : null, name: '万里城关', radius: half, height: 48.3 };
}





