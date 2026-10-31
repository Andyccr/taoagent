import { createGeo } from './geo.js';

const MARBLE = 0xeee9dd, FRIEZE = 0xd9d2c3, LIME = 0xd9d0bb, WHITE = 0xf4f1ea;
const TERRA = 0xb5562f, BLUE = 0x2f5f9e, DARK = 0x3a3733, STONE = 0xaaa293;
const SAND = 0xd9c391, WOOD = 0x7a5a3a, BRONZE = 0x8a6a32, GREEN = 0x4f7a3a;
const GLASS = 0x33455c;

const at = (list, i) => list[Math.max(0, Math.min(list.length - 1, i | 0))];
const idx = (variant) => Math.max(0, Math.min(2, variant | 0));

function column(g, x, y, z, h, r = 0.14, hex = MARBLE) {
  g.box(r * 2.6, 0.1, r * 2.6, x, y, z, hex);
  g.cyl(r * 0.86, r, h, x, y + 0.1, z, hex, 8);
  g.box(r * 2.5, 0.12, r * 2.5, x, y + 0.1 + h, z, hex);
}

function shutteredWindow(g, x, y, z, w = 0.5, h = 0.7, shutter = BLUE, ry = 0) {
  g.group({ x, y, z, ry }, (b) => {
    b.box(w + 0.16, h + 0.12, 0.06, 0, 0, 0, WHITE);
    b.box(w, h, 0.08, 0, 0.06, 0.02, GLASS);
    b.box(w * 0.32, h, 0.05, -w * 0.66, 0.06, 0.05, shutter);
    b.box(w * 0.32, h, 0.05, w * 0.66, 0.06, 0.05, shutter);
  });
}

function railing(g, x, y, z, w, ry = 0, hex = 0x3f4a55) {
  g.group({ x, y, z, ry }, (b) => {
    b.box(w, 0.06, 0.06, 0, 0.55, 0, hex);
    b.box(w, 0.04, 0.04, 0, 0.26, 0, hex);
    const n = Math.max(2, Math.round(w / 0.45));
    for (let i = 0; i <= n; i++) b.box(0.035, 0.58, 0.035, -w / 2 + (w * i) / n, 0, 0, hex);
  });
}

function lamp(g, x, z, y = 0.15, h = 1.7) {
  g.cyl(0.04, 0.07, h, x, y, z, DARK, 5);
  g.box(0.16, 0.2, 0.16, x, y + h - 0.06, z, 0xffe6a8);
  g.box(0.24, 0.05, 0.24, x, y + h + 0.14, z, DARK);
}

function amphora(g, x, y, z, s = 1, hex = TERRA) {
  g.sphere(0.17 * s, x, y + 0.2 * s, z, hex, 5);
  g.cyl(0.05 * s, 0.09 * s, 0.2 * s, x, y + 0.3 * s, z, hex, 5);
}

function plant(g, x, z, y = 0.12, s = 1, hex = GREEN) {
  g.cyl(0.13 * s, 0.17 * s, 0.22 * s, x, y, z, 0x9a6a45, 6);
  g.sphere(0.3 * s, x, y + 0.42 * s, z, hex, 6);
}

function pergola(g, x, z, w, d, y, hex = WOOD) {
  for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    g.box(0.1, 1.8, 0.1, x + px, y, z + pz, hex);
  }
  g.box(w + 0.25, 0.1, 0.1, x, y + 1.8, z - d / 2, hex);
  g.box(w + 0.25, 0.1, 0.1, x, y + 1.8, z + d / 2, hex);
  for (let i = 0; i < 3; i++) g.box(0.08, 0.07, d + 0.3, x - w / 2 + (i * w) / 2, y + 1.9, z, hex);
}

function stair(g, x, z0, z1, yTop, steps, hex) {
  const dz = (z1 - z0) / steps, dy = yTop / steps;
  for (let i = 0; i < steps; i++) g.box(0.7, dy, Math.abs(dz) + 0.02, x, i * dy, z0 + dz * i, hex);
}

function gymnasium(variant = 0) {
  const v = idx(variant);
  const wall = at([LIME, 0xe8e0cf, 0xd6c9ae], v);
  const roof = at([TERRA, 0xb85e36, 0xa84e2e], v);
  const g = createGeo();
  const base = 0.18;
  const h = 2.9 + v * 0.22;
  const colH = 2.6 + v * 0.18;
  g.box(7, base, 7, 0, 0, 0, STONE);
  g.box(3.9, 0.06, 2.8, 0, base, 0.25, SAND);
  g.box(3.5, 0.04, 2.4, 0, base + 0.06, 0.25, 0xcdb27c);
  const backZ = -2.25, backD = 1.6;
  g.box(6.4, h, backD, 0, base, backZ, wall);
  for (const x of [-2.1, -0.7, 0.7, 2.1]) g.box(0.52, 1.15, 0.08, x, base, backZ + backD / 2 + 0.03, DARK);
  for (const x of [-1.4, 0, 1.4]) g.box(0.36, 0.42, 0.08, x, base + 1.7, backZ + backD / 2 + 0.03, GLASS);
  if (v === 1) {
    g.box(6.8, 0.18, backD + 0.5, 0, base + h, backZ, 0xd8cbb0);
    for (const x of [-3.3, 3.3]) g.box(0.16, 0.34, backD + 0.5, x, base + h + 0.18, backZ, wall);
    g.box(6.8, 0.34, 0.16, 0, base + h + 0.18, backZ - backD / 2 - 0.2, wall);
    g.box(6.8, 0.34, 0.16, 0, base + h + 0.18, backZ + backD / 2 + 0.2, wall);
  } else {
    g.gable(6.8, 1.0, backD + 0.5, 0, base + h, backZ, roof);
    if (v === 2) g.gable(6.9, 0.16, backD + 0.9, 0, base + h - 0.02, backZ, 0x8f4528);
  }
  const zs = v === 1 ? [-0.9, 0.1, 1.1, 2.0] : [-0.9, 0.25, 1.4];
  for (const x of [-2.55, 2.55]) for (const z of zs) column(g, x, base, z, colH, 0.14, MARBLE);
  const top = base + colH + 0.22;
  for (const x of [-2.55, 2.55]) g.box(0.44, 0.26, 3.5, x, top, 0.45, 0xe0d8c6);
  for (const x of [-1.7, -0.55, 0.55, 1.7]) column(g, x, base, -1.25, colH, 0.13, MARBLE);
  g.box(4.3, 0.26, 0.44, 0, top, -1.25, 0xe0d8c6);
  for (const x of [-2.55, 2.55]) g.box(0.86, 0.12, 3.7, x, top + 0.26, 0.45, roof);
  g.box(4.5, 0.12, 0.86, 0, top + 0.26, -1.25, roof);
  const gateH = 2.85 + v * 0.15;
  const gateTop = base + gateH + 0.22;
  column(g, -0.95, base, 2.95, gateH, 0.15, MARBLE);
  column(g, 0.95, base, 2.95, gateH, 0.15, MARBLE);
  g.box(2.6, 0.32, 0.5, 0, gateTop, 2.95, 0xe0d8c6);
  if (v === 2) {
    column(g, -1.75, base, 2.95, gateH, 0.13, MARBLE);
    column(g, 1.75, base, 2.95, gateH, 0.13, MARBLE);
    g.box(4.0, 0.32, 0.5, 0, gateTop, 2.95, 0xe0d8c6);
    g.gable(0.7, 0.6, 4.2, 0, gateTop + 0.32, 2.95, roof, { ry: Math.PI / 2 });
  } else {
    g.box(2.8, 0.14, 0.65, 0, gateTop + 0.32, 2.95, roof);
  }
  for (const x of [-2.55, 2.55]) g.box(1.0, 0.8, 0.3, x, base, 2.95, wall);
  for (const [x, z] of [[-1.9, 1.7], [1.9, 1.7], [-1.2, -0.6]]) plant(g, x, z, base, 0.9);
  if (v === 1) {
    g.box(1.3, h + 0.4, 1.3, 2.55, base, -2.25, wall);
    g.hip(1.6, 1.6, 0.55, 2.55, base + h + 0.4, -2.25, roof, 0);
  }
  if (v === 2) {
    g.box(0.7, 0.9, 0.7, 0, base, 1.8, STONE);
    g.cyl(0.16, 0.2, 0.9, 0, base + 0.9, 1.8, MARBLE, 6);
    g.sphere(0.16, 0, base + 1.9, 1.8, MARBLE, 6);
  }
  return g.build();
}

function bouleuterion(variant = 0) {
  const v = idx(variant);
  const wall = at([LIME, 0xe6ddca, 0xd7cbb4], v);
  const roof = at([TERRA, 0xb9603a, 0xa9502e], v);
  const g = createGeo();
  const base = 0.3 + v * 0.1;
  g.box(7, base, 7, 0, 0, 0, STONE);
  for (let i = 0; i < 3; i++) g.box(4.6 - i * 0.3, 0.15, 0.45, 0, i * 0.15, 2.95 - i * 0.32, MARBLE);
  const w = 5.2, d = 4.2, hallH = 4.0 + v * 0.3;
  g.box(w, hallH, 0.32, 0, base, -1.9, wall);
  g.box(0.32, hallH, d, -w / 2 + 0.16, base, -0.1, wall);
  g.box(0.32, hallH, d, w / 2 - 0.16, base, -0.1, wall);
  for (let i = 0; i < 5; i++) {
    const z = 0.95 - i * 0.42;
    g.box(w - 0.8, 0.24, 0.44, 0, base + i * 0.22, z, 0xd8cbb4);
    g.box(w - 0.8, 0.24, 0.08, 0, base + i * 0.22, z - 0.18, 0xc9bca4);
  }
  g.box(0.9, 1.6, 0.08, 0, base, -1.72, DARK);
  const porchH = hallH - 0.45;
  for (const x of [-1.85, -0.62, 0.62, 1.85]) column(g, x, base, 2.15, porchH, 0.16, MARBLE);
  g.box(5.4, 0.38, 0.55, 0, base + porchH + 0.22, 2.15, FRIEZE);
  g.box(5.2, 0.28, 0.3, 0, base + hallH - 0.3, 2.02, FRIEZE);
  const roofH = 1.45 + v * 0.1;
  g.gable(d + 0.6, roofH, w + 0.7, 0, base + hallH, -0.1, roof, { ry: Math.PI / 2 });
  g.gable(0.12, roofH - 0.06, w + 0.65, 0, base + hallH, 2.34, MARBLE, { ry: Math.PI / 2 });
  g.sphere(0.16, 0, base + hallH + roofH + 0.05, 2.34, MARBLE, 6);
  for (const x of [-w / 2 - 0.25, w / 2 + 0.25]) g.cone(0.14, 0.4, x, base + hallH + 0.05, 2.34, MARBLE, 6);
  for (const x of [-2.4, 2.4]) lamp(g, x, 2.7, base + 0.45, 1.5);
  if (v === 1) {
    for (const x of [-3.2, 3.2]) {
      g.box(0.5, hallH - 0.6, 3.2, x, base, -0.1, wall);
      g.gable(3.6, 0.6, 0.7, x, base + hallH - 0.6, -0.1, roof, { ry: Math.PI / 2 });
    }
  }
  if (v === 2) {
    g.box(5.6, 0.25, 0.7, 0, base + hallH + 0.02, 2.2, 0x8f4528);
    g.box(1.1, 0.9, 0.5, 0, base, 1.95, MARBLE);
  }
  return g.build();
}

function fountainHouse(variant = 0) {
  const v = idx(variant);
  const wall = at([LIME, 0xe7dfcf, 0xd9cdb6], v);
  const roof = at([TERRA, 0xb85e38, 0xa9502e], v);
  const water = at([0x6fa7c4, 0x5f9dbb, 0x7fb4cf], v);
  const g = createGeo();
  const base = 0.2 + v * 0.05;
  g.box(7, base, 7, 0, 0, 0, STONE);
  for (let i = 0; i < 3; i++) g.box(4.4 - i * 0.28, 0.14, 0.46, 0, i * 0.14, 2.95 - i * 0.33, MARBLE);
  const backZ = -2.2, wallH = 3.2 + v * 0.2;
  g.box(5.6, wallH, 0.45, 0, base, backZ, wall);
  for (const x of [-2.58, 2.58]) g.box(0.45, wallH, 2.5, x, base, -1.05, wall);
  g.box(5.8, 0.34, 0.6, 0, base + wallH, backZ, FRIEZE);
  g.gable(6.0, 0.8, 1.3, 0, base + wallH + 0.34, backZ, roof);
  const colH = 2.9 + v * 0.2;
  for (const x of [-2.0, -0.7, 0.7, 2.0]) column(g, x, base, 1.5, colH, 0.15, MARBLE);
  g.box(5.3, 0.34, 0.55, 0, base + colH + 0.22, 1.5, FRIEZE);
  g.gable(1.2, 0.75, 5.5, 0, base + colH + 0.56, 1.5, roof, { ry: Math.PI / 2 });
  g.box(3.4, 0.38, 1.3, 0, base, 0.45, MARBLE);
  g.box(3.1, 0.08, 1.05, 0, base + 0.38, 0.45, water);
  g.box(3.5, 0.1, 0.16, 0, base + 0.38, -0.18, MARBLE);
  g.box(3.5, 0.1, 0.16, 0, base + 0.38, 1.08, MARBLE);
  for (const x of [-1.1, -0.35, 0.35, 1.1]) {
    g.cyl(0.05, 0.08, 0.3, x, base + 1.25, backZ + 0.42, BRONZE, 5, { rx: Math.PI / 2 });
    g.box(0.05, 0.85, 0.04, x, base + 0.5, backZ + 0.62, water);
  }
  g.box(0.8, 0.35, 0.8, 0, base, -1.45, STONE);
  g.box(0.6, 0.18, 0.6, 0, base + 0.35, -1.45, MARBLE);
  g.cyl(0.14, 0.2, 1.05, 0, base + 0.53, -1.45, MARBLE, 6);
  g.sphere(0.17, 0, base + 1.75, -1.45, MARBLE, 6);
  g.box(0.5, 0.08, 0.12, 0, base + 1.45, -1.45, MARBLE);
  g.arch(0.62, 0.12, 0.18, 0, base + 0.9, backZ + 0.28, FRIEZE, 8);
  lamp(g, -2.35, 2.6, base + 0.42, 1.5);
  lamp(g, 2.35, 2.6, base + 0.42, 1.5);
  if (v === 1) {
    g.box(1.1, 0.5, 1.1, 2.2, base, -0.9, MARBLE);
    g.box(0.9, 0.08, 0.9, 2.2, base + 0.5, -0.9, water);
    g.cyl(0.06, 0.09, 0.7, 2.2, base + 0.5, -0.9, BRONZE, 5);
  }
  if (v === 2) {
    g.arch(0.8, 0.16, 0.25, 0, base, 2.0, FRIEZE, 8);
    for (const x of [-1.6, 1.6]) g.box(0.55, 1.4, 0.08, x, base + 1.2, 2.1, GLASS);
  }
  return g.build();
}

function treasury(variant = 0) {
  const v = idx(variant);
  const marble = at([MARBLE, 0xf1eee5, 0xe8e2d4], v);
  const wall = at([LIME, 0xe5ddca, 0xd8ccb5], v);
  const roof = at([0xb05a38, 0xa94e2c, 0xba6540], v);
  const g = createGeo();
  const stepH = 0.22;
  for (let i = 0; i < 3; i++) g.box(6.4 - i * 0.5, stepH, 5.8 - i * 0.5, 0, i * stepH, 0.1, i === 0 ? STONE : marble);
  const y0 = 3 * stepH;
  const w = 3.4 + v * 0.1, d = 3.2, h = 3.0 + v * 0.15;
  g.box(w, h, d, 0, y0, -0.6, wall);
  g.box(1.05, h, 0.28, -1.18, y0, 1.0, wall);
  g.box(1.05, h, 0.28, 1.18, y0, 1.0, wall);
  g.box(w, 0.4, 0.28, 0, y0 + h - 0.4, 1.0, wall);
  g.box(1.1, 2.1, 0.08, 0, y0, 1.02, DARK);
  const colH = h - 0.45;
  for (const x of [-0.75, 0.75]) column(g, x, y0, 1.0, colH, 0.15, marble);
  const entY = y0 + h;
  g.box(w + 0.6, 0.3, d + 0.6, 0, entY, -0.6, marble);
  g.box(w + 0.7, 0.32, d + 0.7, 0, entY + 0.3, -0.6, FRIEZE);
  for (let i = 0; i < 6; i++) g.box(0.16, 0.22, 0.08, -1.25 + i * 0.5, entY + 0.35, 1.12, 0xc9c1b0);
  const roofH = 1.1 + v * 0.08;
  g.gable(d + 0.7, roofH, w + 0.75, 0, entY + 0.62, -0.6, roof, { ry: Math.PI / 2 });
  g.gable(0.12, roofH - 0.05, w + 0.7, 0, entY + 0.62, 1.32, marble, { ry: Math.PI / 2 });
  g.cone(0.17, 0.46, 0, entY + 0.62 + roofH, 1.32, marble, 6);
  for (const x of [-w / 2 - 0.25, w / 2 + 0.25]) {
    g.sphere(0.15, x, entY + 0.7, 1.32, marble, 6);
    g.cone(0.1, 0.3, x, entY + 0.78, 1.32, marble, 5);
  }
  if (v === 1) {
    g.box(4.2, 0.12, 0.35, 0, entY + 0.32, 1.18, BLUE);
    g.box(1.2, 0.5, 0.9, -2.3, y0, -0.8, marble);
    g.box(1.0, 0.12, 0.7, -2.3, y0 + 0.5, -0.8, FRIEZE);
  }
  if (v === 2) {
    for (const x of [-2.1, 2.1]) {
      g.box(0.5, 0.8, 0.5, x, y0, 1.4, STONE);
      g.cyl(0.1, 0.14, 1.3, x, y0 + 0.8, 1.4, marble, 6);
      g.sphere(0.13, x, y0 + 2.1, 1.4, marble, 6);
    }
  }
  return g.build();
}

function villa(variant = 0) {
  const v = idx(variant);
  const wall = at([WHITE, 0xf0eadb, 0xe8dfca], v);
  const roof = at([TERRA, 0xb85e36, 0xa9502e], v);
  const shutter = at([BLUE, 0x2c6fa0, 0x285a8c], v);
  const g = createGeo();
  const base = 0.12;
  g.box(7, base, 7, 0, 0, 0, STONE);
  g.box(6.8, 0.04, 6.8, 0, base, 0, 0xcbbfa6);
  const gh = 3.0 + v * 0.15;
  const gw = 4.8, gd = 3.6, gx = -0.4, gz = -1.0;
  g.box(gw, gh, gd, gx, base, gz, wall);
  const gt = base + gh;
  g.box(gw + 0.3, 0.18, gd + 0.3, gx, gt, gz, 0xe7dfcd);
  for (const x of [gx - gw / 2 - 0.1, gx + gw / 2 + 0.1]) g.box(0.16, 0.3, gd + 0.3, x, gt + 0.18, gz, wall);
  for (const z of [gz - gd / 2 - 0.1, gz + gd / 2 + 0.1]) g.box(gw + 0.3, 0.3, 0.16, gx, gt + 0.18, z, wall);
  const uh = 2.3 + v * 0.2;
  const uw = 3.2, ud = 2.8, ux = -1.0, uz = -1.35;
  g.box(uw, uh, ud, ux, gt, uz, wall);
  g.box(uw + 0.25, 0.16, ud + 0.25, ux, gt + uh, uz, 0xe7dfcd);
  for (const x of [ux - 0.75, ux + 0.75]) shutteredWindow(g, x, gt + 0.7, uz + ud / 2 + 0.03, 0.5, 0.75, shutter);
  g.box(0.06, 0.7, 0.45, ux - uw / 2 - 0.03, gt + 0.7, uz + 0.5, GLASS);
  g.box(0.06, 0.7, 0.45, ux + uw / 2 + 0.03, gt + 0.7, uz - 0.4, GLASS);
  g.box(1.0, 1.9, 0.06, gx + 0.8, base, gz + gd / 2 + 0.02, 0xe7dfcd);
  g.box(0.84, 1.78, 0.08, gx + 0.8, base, gz + gd / 2 + 0.05, WOOD);
  g.box(0.12, 0.12, 0.1, gx + 1.05, base + 0.95, gz + gd / 2 + 0.09, BRONZE);
  shutteredWindow(g, gx - 1.5, base + 1.0, gz + gd / 2 + 0.03, 0.55, 0.8, shutter);
  shutteredWindow(g, gx - 0.4, base + 1.0, gz + gd / 2 + 0.03, 0.55, 0.8, shutter);
  shutteredWindow(g, gx + 1.7, base + 1.0, gz + gd / 2 + 0.03, 0.5, 0.75, shutter);
  g.box(1.8, 0.14, 0.7, ux, gt + 1.2, uz + ud / 2 + 0.35, 0xe7dfcd);
  railing(g, ux, gt + 1.34, uz + ud / 2 + 0.68, 1.8, 0, 0x3f4a55);
  for (const x of [ux - 0.75, ux + 0.75]) g.box(0.08, 0.6, 0.08, x, gt + 0.6, uz + ud / 2 + 0.35, WOOD);
  stair(g, 2.55, 2.7, 0.6, gt, 9, 0xd8ccb4);
  const perY = gt + 0.18;
  pergola(g, 1.35, -1.0, 1.1, 2.7, perY);
  for (const [x, z] of [[1.5, 0.2], [0.9, -2.3], [-1.9, 0.3]]) plant(g, x, z, perY, 0.7);
  for (const x of [-2.2, 2.2]) g.box(2.2, 0.8, 0.3, x, base, 3.1, wall);
  for (const x of [-1.1, 1.1]) g.box(0.24, 1.1, 0.24, x, base, 3.1, WOOD);
  g.box(2.0, 0.2, 0.5, 0, base + 1.1, 3.1, roof);
  g.cyl(0.1, 0.14, 0.9, -2.2, base, 2.0, WOOD, 5);
  g.sphere(0.55, -2.2, base + 1.2, 2.0, GREEN, 6);
  for (const [x, z] of [[-2.4, 2.6], [2.4, 2.6]]) plant(g, x, z, base, 0.8);
  lamp(g, 0.0, 2.9, base, 1.5);
  if (v === 1) {
    g.gable(ud + 0.5, 1.0, uw + 0.5, ux, gt + uh + 0.16, uz, roof, { ry: Math.PI / 2 });
    g.gable(0.1, 0.95, uw + 0.45, ux, gt + uh + 0.16, uz + ud / 2 + 0.27, wall, { ry: Math.PI / 2 });
    for (const x of [-2.5, 2.5]) g.box(0.5, 1.2, 0.5, x, gt, gz + 0.4, 0x9c7a55);
  }
  if (v === 2) {
    g.box(1.6, 2.2, 1.6, -2.5, base, 1.8, wall);
    g.hip(1.9, 1.9, 0.6, -2.5, base + 2.2, 1.8, roof, 0);
    g.arch(0.75, 0.15, 0.25, 0, base, 3.05, FRIEZE, 8);
  }
  return g.build();
}

function workshop(variant = 0) {
  const v = idx(variant);
  const wall = at([LIME, 0xd9cdb5, 0xe2d6bf], v);
  const roof = at([TERRA, 0xb85e36, 0xa9502e], v);
  const clay = at([TERRA, 0xa9502e, 0xc06a3d], v);
  const g = createGeo();
  const base = 0.15;
  g.box(7, base, 7, 0, 0, 0, STONE);
  const backZ = -2.4, wallH = 3.0 + v * 0.12;
  g.box(6.2, wallH, 0.35, 0, base, backZ, wall);
  for (const x of [-2.95, 2.95]) g.box(0.35, wallH, 3.2, x, base, -0.8, wall);
  g.box(6.2, 0.3, 0.4, 0, base + wallH, backZ, FRIEZE);
  if (v === 1) {
    g.box(6.4, 0.18, 3.6, 0, base + wallH, -0.8, 0xd8ccb4);
    g.box(6.4, 0.3, 0.16, 0, base + wallH + 0.18, -2.5, wall);
    g.box(6.4, 0.3, 0.16, 0, base + wallH + 0.18, 0.9, wall);
  } else {
    g.gable(6.5, 0.9, 3.6, 0, base + wallH, -0.8, roof);
  }
  for (const x of [-2.2, 0, 2.2]) g.box(0.16, 2.5, 0.16, x, base, 0.9, WOOD);
  g.box(6.2, 0.16, 0.2, 0, base + 2.5, 0.9, WOOD);
  g.box(6.4, 0.08, 1.7, 0, base + 2.35, 1.7, 0xd8b26a, { rx: -0.16 });
  g.box(6.4, 0.06, 0.18, 0, base + 2.18, 2.5, TERRA);
  g.box(5.8, 0.9, 0.7, 0, base, -0.1, 0x9c7a55);
  g.box(6.0, 0.08, 0.8, 0, base + 0.9, -0.1, 0x8a6a48);
  g.box(0.7, 0.5, 0.6, -1.4, base + 0.98, -0.1, 0x6b5a3a);
  g.box(0.55, 0.4, 0.5, 0.8, base + 0.98, -0.1, clay);
  g.box(0.4, 0.28, 0.4, 1.5, base + 0.98, -0.1, clay);
  const kx = -1.8, kz = -1.55;
  g.cyl(0.95, 1.05, 1.5, kx, base, kz, 0xa26a4a, 8);
  g.dome(0.95, kx, base + 1.5, kz, clay, 8);
  g.cyl(0.18, 0.24, 1.1, kx + 0.5, base + 2.2, kz, 0x8f5a3e, 6);
  g.cyl(0.3, 0.34, 0.16, kx + 0.5, base + 3.3, kz, STONE, 6);
  g.arch(0.45, 0.12, 0.2, kx, base + 0.35, kz + 1.02, DARK, 6);
  for (const [x, z, s] of [[2.1, -1.4, 1], [2.45, -0.9, 0.85], [1.8, -0.7, 0.9], [2.2, -1.9, 0.8], [2.5, 0.0, 0.9], [1.7, 0.1, 0.8]]) {
    amphora(g, x, base, z, s, clay);
  }
  g.box(1.2, 0.08, 0.5, 2.15, base + 0.9, -1.4, WOOD);
  g.box(0.08, 0.9, 0.5, 1.6, base, -1.4, WOOD);
  g.box(0.08, 0.9, 0.5, 2.7, base, -1.4, WOOD);
  g.box(1.0, 0.55, 0.08, -0.2, base + 1.6, 0.84, DARK);
  g.box(1.1, 0.06, 0.1, -0.2, base + 2.15, 0.84, WOOD);
  g.cyl(0.2, 0.26, 0.4, 0.9, base + 0.98, 0.0, clay, 6);
  g.sphere(0.32, -2.7, base + 0.3, 2.3, 0x8f8a80, 5);
  g.box(0.2, 0.3, 0.2, -2.7, base + 0.55, 2.3, 0x8f8a80);
  lamp(g, 2.8, 2.6, base, 1.5);
  if (v === 1) {
    g.box(1.1, 0.6, 0.9, 1.9, base, 1.6, 0x6b5a3a);
    g.box(0.5, 0.25, 0.7, 1.9, base + 0.6, 1.6, 0x3a3733);
    g.cyl(0.32, 0.42, 0.55, 2.2, base, 2.3, 0x5a4634, 6);
    g.box(0.5, 0.5, 0.08, 1.9, base + 0.85, 2.06, 0x3a3733);
    g.box(0.4, 0.5, 0.4, -1.2, base + wallH + 0.48, -1.8, 0x8f5a3e);
    g.box(0.5, 0.08, 0.5, -1.2, base + wallH + 0.98, -1.8, STONE);
  }
  if (v === 2) {
    g.cyl(0.55, 0.62, 1.1, 1.9, base, -2.1, 0xa26a4a, 7);
    g.dome(0.55, 1.9, base + 1.1, -2.1, clay, 7);
    g.box(1.8, 0.4, 0.4, 0, base + 2.0, 2.35, 0x8f6a3a);
    for (const x of [-0.8, 0, 0.8]) g.box(0.08, 0.6, 0.08, x, base + 1.4, 2.35, WOOD);
    for (const [x, z] of [[-2.6, 2.4], [-2.0, 2.7], [2.6, 2.4]]) amphora(g, x, base, z, 0.8, clay);
  }
  return g.build();
}

export const GREEK_EXTRA = { gymnasium, bouleuterion, fountainHouse, treasury, villa, workshop };
