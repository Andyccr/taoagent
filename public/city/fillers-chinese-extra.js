// Extra Chinese-quarter fillers: teahouse, shop row, drum tower, courtyard, paifang and water pavilion.
import { createGeo } from './geo.js';

const at = (list, i) => list[Math.max(0, Math.min(list.length - 1, i | 0))];
const idx = (variant) => Math.max(0, Math.min(2, variant | 0));

const BRICK = 0x8c8f93, ROOF = 0x55595e, RED = 0xa8322a, RED2 = 0x8f241c;
const WOOD = 0x5a3a24, TRIM = 0x6e4a30, GOLD = 0xd4a73a, STONE = 0xbdb6a6, STONE2 = 0xa9a291;
const DARK = 0x2e2a27, GLASS = 0x3a4148, GREEN = 0x3f6b5a, LEAF = 0x4f7a3a;

function lantern(g, x, y, z, hex = 0xb03024) {
  g.box(0.02, 0.18, 0.02, x, y + 0.1, z, 0x3a2a20);
  g.sphere(0.14, x, y, z, hex, 4);
  g.box(0.045, 0.08, 0.045, x, y - 0.24, z, GOLD);
}

function lattice(g, x, y, z, w, h, hex = GLASS, frame = WOOD) {
  g.box(w, h, 0.08, x, y, z, hex);
  g.box(w + 0.1, 0.06, 0.11, x, y - 0.06, z + 0.01, frame);
  g.box(0.05, h, 0.05, x, y, z + 0.03, frame);
}

function railing(g, w, x, y, z, hex = WOOD, ry = 0) {
  g.group({ x, y, z, ry }, (b) => {
    const n = Math.max(2, Math.round(w / 0.9));
    for (let i = 0; i <= n; i++) b.box(0.05, 0.55, 0.05, -w / 2 + (w * i) / n, 0, 0, hex);
    b.box(w, 0.06, 0.06, 0, 0.55, 0, hex);
    b.box(w, 0.05, 0.05, 0, 0.16, 0, hex);
  });
}

function tree(g, x, z, h = 2.6, r = 0.62, y = 0.12, crown = LEAF) {
  const trunk = h * 0.45;
  g.cyl(0.09, 0.14, trunk, x, y, z, 0x6b4a2f, 6);
  g.sphere(r, x, y + trunk + r * 0.6, z, crown, 6);
  g.sphere(r * 0.7, x - r * 0.5, y + trunk + r * 1.1, z + r * 0.25, crown, 5);
  g.sphere(r * 0.65, x + r * 0.5, y + trunk + r * 0.95, z - r * 0.3, crown, 5);
}

function teahouse(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const wall = at([0xe0d6bf, 0xd8c9a8, 0xcfc0a4], v);
  const roof = at([ROOF, GREEN, 0x46525c], v);
  const trim = at([0x8f241c, 0xa8322a, 0x7a2f26], v);
  const upperH = 2.0 + v * 0.1;
  const roofH = 1.15 + v * 0.1;

  g.box(6.6, 0.18, 5.8, 0, 0, 0, 0xb9b2a2);
  for (let i = 0; i < 3; i++) g.box(2.5 - i * 0.2, 0.09 + i * 0.05, 0.24, 0, 0, 2.82 + i * 0.22, STONE);

  g.box(5.4, 2.8, 4.2, 0, 0.18, -0.25, wall);
  g.box(4.8, 2.35, 0.1, 0, 0.3, 1.86, DARK);
  g.box(1.14, 2.0, 0.08, 0, 0.26, 1.89, trim);
  for (const dx of [-0.65, 0.65]) g.box(0.1, 2.1, 0.14, dx, 0.24, 1.92, GOLD);
  g.box(1.4, 0.12, 0.14, 0, 2.3, 1.92, GOLD);
  for (const x of [-1.75, 1.75]) lattice(g, x, 0.95, 1.9, 1.25, 1.15);

  g.box(1.45, 0.85, 0.42, 1.5, 0.18, 2.02, TRIM);
  g.box(1.6, 0.09, 0.52, 1.5, 1.03, 2.02, 0x7a5a3a);

  for (const x of [-2.3, -0.78, 0.78, 2.3]) {
    g.cyl(0.13, 0.15, 2.9, x, 0.18, 2.02, RED, 6);
    g.box(0.34, 0.08, 0.34, x, 0.18, 2.02, STONE2);
  }
  g.box(5.2, 0.25, 0.24, 0, 2.86, 2.02, trim);
  g.box(5.0, 0.05, 0.26, 0, 2.82, 2.02, GOLD);

  g.box(5.8, 0.24, 4.5, 0, 2.98, -0.25, TRIM);
  g.box(5.6, 0.12, 1.4, 0, 3.22, 2.0, WOOD);
  railing(g, 5.2, 0, 3.34, 2.64, RED2);
  railing(g, 1.4, -2.65, 3.34, 2.0, RED2, Math.PI / 2);
  railing(g, 1.4, 2.65, 3.34, 2.0, RED2, Math.PI / 2);

  g.box(5.0, upperH, 3.6, 0, 3.34, -0.45, wall);
  for (const x of [-2.45, 2.45]) g.box(0.16, upperH, 0.16, x, 3.34, 1.38, TRIM);
  for (const x of [-1.55, 0, 1.55]) lattice(g, x, 3.9, 1.39, 0.82, 1.0);

  for (const x of [-2.35, -0.8, 0.8, 2.35]) {
    g.cyl(0.11, 0.13, upperH + 0.2, x, 3.34, 2.5, RED, 6);
    g.box(0.3, 0.08, 0.3, x, 3.34, 2.5, GOLD);
  }

  const roofY = 3.34 + upperH;
  if (v === 2) g.hip(5.8, 4.6, 0.5, 0, roofY - 0.95, -0.25, roof, 0.8);
  g.hip(5.6 + v * 0.1, 5.0, roofH, 0, roofY, -0.25, roof, 0.7);
  const top = roofY + roofH;
  g.box(2.6, 0.2, 0.3, 0, top - 0.06, -0.25, at([0x3f4348, 0x2f5446, 0x353e47], v));
  for (const x of [-1.25, 1.25]) g.sphere(0.11, x, top + 0.12, -0.25, GOLD, 5);
  g.cone(0.11, 0.38, 0, top + 0.04, -0.25, GOLD, 6);

  const count = v === 0 ? 2 : v === 1 ? 3 : 4;
  for (let i = 0; i < count; i++) {
    const x = count === 2 ? (i ? 1.85 : -1.85) : -2.1 + i * (4.2 / (count - 1));
    lantern(g, x, 4.92, 2.35, i % 2 === 0 ? 0xb03024 : 0xc0432e);
  }

  g.box(0.5, 1.5, 0.09, 2.9, 3.6, 2.45, trim);
  g.box(0.6, 0.06, 0.06, 2.62, 5.12, 2.45, WOOD);
  for (let i = 0; i < 3; i++) g.box(0.2, 0.2, 0.02, 2.9, 3.75 + i * 0.42, 2.5, GOLD);

  if (v === 2) {
    for (const x of [-2.05, 2.05]) {
      g.box(0.45, 0.3, 0.35, x, 3.34, 2.2, 0x8a5a3a);
      g.sphere(0.2, x, 3.68, 2.2, 0x5d8a3c, 5);
    }
  }
  return g.build();
}

function shophouse(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const wall = at([0xe2d8c3, 0xd8d2c4, 0xd6c3a2], v);
  const roof = at([ROOF, 0x4e565c, 0x4a5560], v);
  const banner = at([0x9e2b1e, 0x2e5f8a, 0x9a6a20], v);
  const units = v === 0
    ? [{ x: -1.6, w: 3.0, gh: 2.2, uh: 2.2, rh: 0.95 }, { x: 1.6, w: 3.0, gh: 2.3, uh: 2.1, rh: 0.9 }]
    : v === 1
      ? [{ x: -2.2, w: 2.06, gh: 2.1, uh: 2.0, rh: 0.85 }, { x: 0, w: 2.06, gh: 2.35, uh: 2.3, rh: 0.95 }, { x: 2.2, w: 2.06, gh: 2.2, uh: 2.1, rh: 0.9 }]
      : [{ x: -1.75, w: 3.25, gh: 2.25, uh: 2.3, rh: 1.0 }, { x: 1.75, w: 3.25, gh: 2.4, uh: 2.6, rh: 1.05 }];
  const d = 3.6, zc = -0.3, front = zc + d / 2;

  g.box(6.9, 0.12, 6.2, 0, 0, 0, 0xc4b99f);
  g.box(6.6, 0.03, 0.5, 0, 0.12, 2.6, 0xbfb49b);

  for (let u = 0; u < units.length; u++) {
    const { x, w, gh, uh, rh } = units[u];
    const wallTop = 0.12 + gh + uh;
    g.box(w, gh + uh, d, x, 0.12, zc, wall);
    g.box(w - 0.16, gh - 0.3, 0.09, x, 0.24, front + 0.01, DARK);

    for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) g.box(0.16, gh, 0.16, x + dx, 0.12, front + 0.06, TRIM);
    g.box(w, 0.18, 0.16, x, 0.12 + gh - 0.18, front + 0.06, WOOD);
    g.box(w - 0.2, 0.32, 0.12, x, 1.98, front + 0.12, 0x3a2a20);
    g.box(w - 0.36, 0.05, 0.15, x, 2.02, front + 0.13, GOLD);

    g.box(w * 0.58, 0.82, 0.5, x - w * 0.1, 0.12, front + 0.28, TRIM);
    g.box(w * 0.64, 0.07, 0.58, x - w * 0.1, 0.94, front + 0.28, 0x7a5a3a);
    g.box(0.3, 0.18, 0.26, x - w * 0.24, 1.01, front + 0.26, at([0xb5452f, 0xd9a520, 0x5f8a3a], (u + v) % 3));
    g.box(0.26, 0.15, 0.24, x + w * 0.02, 1.01, front + 0.26, at([0xe0b25a, 0x8e44ad, 0xc0392b], (u + v) % 3));

    lattice(g, x - w / 4, 0.12 + gh + 0.4, front + 0.03, 0.68, 0.9);
    lattice(g, x + w / 4, 0.12 + gh + 0.4, front + 0.03, 0.68, 0.9);
    g.box(w + 0.04, 0.1, 0.1, x, 0.12 + gh + 0.28, front + 0.04, TRIM);

    g.box(0.36, 1.18, 0.06, x + w / 2 - 0.42, 0.95, front + 0.36, banner);
    for (let i = 0; i < 2; i++) g.box(0.16, 0.16, 0.02, x + w / 2 - 0.42, 1.05 + i * 0.4, front + 0.4, 0xe8dcc0);
    g.box(0.5, 0.05, 0.05, x + w / 2 - 0.42, 2.17, front + 0.36, WOOD);

    g.gable(w + 0.24, rh, d + 0.5, x, wallTop, zc, roof);
    g.box(w + 0.2, 0.09, 0.18, x, wallTop + rh - 0.04, zc, 0x3f4348);
    g.box(w + 0.2, 0.13, 0.14, x, wallTop + 0.02, front + 0.24, WOOD);
    lantern(g, x - w / 2 + 0.42, 2.55, front + 0.35, 0xb03024);
    if (u === 1) g.box(0.24, 0.9, 0.28, x + w / 4, wallTop + rh - 0.18, zc - 0.2, 0x9b5a43);

    if (v === 2) {
      g.box(w - 0.2, 0.12, 0.72, x, 0.12 + gh + 0.28, front + 0.4, WOOD);
      railing(g, w - 0.3, x, 0.12 + gh + 0.4, front + 0.72, RED2);
      g.box(w - 0.4, 0.07, 0.9, x, 2.32, front + 0.46, at([0x9e2b1e, 0x2e5f8a], u), { rx: -0.18 });
      lantern(g, x + w / 2 - 0.42, 2.75, front + 0.5, 0xc0432e);
    }
  }
  return g.build();
}

function drumTower(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const roof = at([ROOF, GREEN, 0x46525c], v);
  const ph = 2.5 + v * 0.3;
  const py = 0.16;
  const top = py + ph;

  g.box(6.4, 0.16, 6.4, 0, 0, 0, STONE);
  g.box(6.0, 0.03, 6.0, 0, 0.16, 0, 0xc6bfaf);
  for (let i = 0; i < 3; i++) g.box(2.4 - i * 0.25, 0.08 + i * 0.06, 0.3, 0, 0.16, 2.35 + i * 0.24, STONE2);

  for (const x of [-1.55, 1.55]) g.box(1.5, ph, 4.4, x, py, -0.2, BRICK);
  g.box(1.7, ph - 0.55, 4.4, 0, py + 0.55, -0.2, 0x2a2723);
  g.box(1.7, 0.62, 4.4, 0, top - 0.62, -0.2, BRICK);
  for (const z of [2.02, -2.42]) g.arch(1.02, 0.26, 0.3, 0, 0.86, z, STONE2, 8);
  g.box(5.0, 0.22, 4.8, 0, top, -0.2, 0xc6bfaf);
  for (const x of [-2.2, 2.2]) for (const z of [1.9, -2.2]) g.box(0.28, 0.5, 0.28, x, top + 0.22, z, STONE2);

  const deckY = top + 0.22;
  g.box(3.7, 0.16, 3.7, 0, deckY, -0.2, WOOD);
  const hallH = 2.45 + v * 0.1;
  g.box(2.7, hallH - 0.2, 2.7, 0, deckY + 0.16, -0.4, DARK);
  for (const x of [-1.25, 0, 1.25]) g.cyl(0.12, 0.14, hallH, x, deckY + 0.16, 1.45, RED, 6);
  for (const x of [-1.3, 1.3]) g.cyl(0.12, 0.14, hallH, x, deckY + 0.16, -1.65, RED, 6);
  for (const z of [-1.65, 1.45]) for (const x of [-1.3, 1.3]) g.box(0.3, 0.08, 0.3, x, deckY + 0.16, z, GOLD);

  railing(g, 3.2, 0, deckY + 0.16, 1.45, RED2);

  g.cyl(0.46, 0.5, 0.95, 0, deckY + 0.3, -0.35, 0x8f2a22, 10);
  g.cyl(0.41, 0.41, 0.06, 0, deckY + 1.25, -0.35, 0xd8c39a, 10);
  g.ring(0.3, 0.035, 0, deckY + 1.31, -0.35, GOLD, 10);
  for (const x of [-0.6, 0.6]) g.box(0.12, 0.7, 0.5, x, deckY + 0.16, -0.35, WOOD);

  const colTop = deckY + 0.16 + hallH;
  g.box(3.4, 0.24, 3.4, 0, colTop - 0.24, -0.2, TRIM);
  g.box(0.5, 0.34, 0.06, 0, colTop - 0.15, 1.32, 0x2c3e50);
  g.box(0.62, 0.05, 0.09, 0, colTop + 0.18, 1.32, GOLD);
  g.hip(4.8, 4.8, 0.85, 0, colTop, -0.2, roof, 1.35);

  const drumY = colTop + 0.6;
  const drumH = 1.35 + v * 0.05;
  g.box(2.8, drumH, 2.8, 0, drumY, -0.2, RED);
  g.box(2.86, 0.12, 2.86, 0, drumY + 0.55, -0.2, GOLD);
  for (const z of [1.21, -1.61]) g.box(0.7, 0.6, 0.06, 0, drumY + 0.25, z, GLASS);
  for (const x of [-1.41, 1.41]) g.box(0.06, 0.6, 0.7, x, drumY + 0.25, -0.2, GLASS);

  const upperY = drumY + drumH;
  g.box(3.1, 0.12, 3.1, 0, upperY - 0.06, -0.2, TRIM);
  g.hip(4.1, 4.1, 1.3 + v * 0.05, 0, upperY, -0.2, roof, 1.3);
  const peak = upperY + 1.3 + v * 0.05;
  g.box(1.6, 0.14, 0.2, 0, peak - 0.08, -0.2, 0x3f4348);
  g.cyl(0.07, 0.1, 0.3, 0, peak, -0.2, GOLD, 6);
  g.sphere(0.14, 0, peak + 0.34, -0.2, GOLD, 6);

  for (const x of [-1.0, 1.0]) lantern(g, x, colTop - 0.15, 1.62, 0xb03024);
  return g.build();
}

function courtyardLarge(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const brick = at([0x8c8f93, 0x84888c, 0x93958f], v);
  const wall = at([0xd8d2c4, 0xd4cbb8, 0xcfc2a8], v);
  const roof = at([ROOF, 0x4e565c, GREEN], v);
  const pave = at([0xc9c0ac, 0xc3b9a4, 0xcfc6b2], v);

  g.box(6.9, 0.12, 6.9, 0, 0, 0, 0xb9b2a2);
  g.box(6.4, 0.03, 6.4, 0, 0.12, 0, pave);
  for (const z of [-1.9, 0.4, 2.2]) g.box(4.2, 0.03, 0.08, 0, 0.15, z, 0xb8af9a);
  for (const x of [-1.8, 0, 1.8]) g.box(0.08, 0.03, 5.6, x, 0.15, -0.4, 0xb8af9a);
  g.box(1.3, 0.04, 4.6, 0, 0.15, -0.5, 0xd0c7b4);

  g.box(6.7, 2.4, 0.3, 0, 0.12, -3.25, brick);
  for (const x of [-3.2, 3.2]) g.box(0.3, 2.4, 6.5, x, 0.12, 0, brick);
  for (const x of [-2.2, 2.2]) g.box(2.2, 2.4, 0.3, x, 0.12, 3.25, brick);
  for (const [w, d, x, z] of [[6.9, 0.38, 0, -3.25], [0.38, 6.7, -3.2, 0], [0.38, 6.7, 3.2, 0], [2.3, 0.38, -2.2, 3.25], [2.3, 0.38, 2.2, 3.25]]) {
    g.box(w, 0.12, d, x, 2.52, z, 0x4a4e52);
  }

  g.box(2.7, 2.9, 1.0, 0, 0.12, 2.6, brick);
  g.box(1.5, 2.0, 0.14, 0, 0.24, 3.12, DARK);
  for (const x of [-0.62, 0.62]) g.box(0.2, 2.05, 0.16, x, 0.24, 3.15, RED2);
  g.box(1.6, 0.16, 0.26, 0, 2.24, 3.15, GOLD);
  g.box(1.4, 0.9, 0.06, 0, 0.24, 3.17, RED);
  for (const x of [-0.32, 0.32]) g.box(0.05, 0.9, 0.02, x, 0.24, 3.21, GOLD);
  g.gable(3.0, 0.65, 1.3, 0, 3.02, 2.6, roof);
  g.box(3.2, 0.09, 0.16, 0, 3.62, 2.6, 0x3f4348);
  for (let i = 0; i < 3; i++) g.box(1.7 - i * 0.2, 0.06 + i * 0.04, 0.2, 0, 0.12, 3.1 + i * 0.12, STONE2);
  lantern(g, -0.85, 2.45, 2.83, 0xb03024);
  lantern(g, 0.85, 2.45, 2.83, 0xb03024);

  const hallH = 2.5 + v * 0.15;
  g.box(4.9, 0.35, 2.3, 0, 0.12, -1.95, STONE2);
  g.box(4.4, hallH, 1.8, 0, 0.47, -1.95, wall);
  for (const x of [-1.75, -0.55, 0.55, 1.75]) g.cyl(0.12, 0.14, hallH, x, 0.47, -0.95, RED, 6);
  g.box(1.0, 1.85, 0.1, 0, 0.47, -0.98, DARK);
  g.box(1.2, 0.1, 0.16, 0, 2.32, -0.98, GOLD);
  for (const x of [-1.55, 1.55]) lattice(g, x, 1.15, -0.98, 1.2, 0.9);
  g.box(4.6, 0.18, 2.0, 0, 0.47 + hallH - 0.18, -1.95, TRIM);
  g.hip(4.8, 2.4, 1.2 + v * 0.12, 0, 0.47 + hallH, -1.95, roof, 0.8);
  const hallPeak = 0.47 + hallH + 1.2 + v * 0.12;
  g.box(2.2, 0.16, 0.24, 0, hallPeak - 0.08, -1.95, 0x3f4348);
  for (const x of [-1.05, 1.05]) g.sphere(0.1, x, hallPeak + 0.1, -1.95, GOLD, 5);

  for (const x of [-2.55, 2.55]) {
    g.box(1.5, 1.9, 2.4, x, 0.12, -0.2, wall);
    g.box(0.9, 1.6, 0.08, x, 0.2, 1.02, DARK);
    g.gable(2.7, 0.75, 1.7, x, 2.02, -0.2, roof, { ry: Math.PI / 2 });
    g.box(0.14, 0.66, 0.14, x - 0.5, 0.12, 0.92, TRIM);
    g.box(0.14, 0.66, 0.14, x + 0.5, 0.12, 0.92, TRIM);
  }

  tree(g, -1.55, 0.75, 3.0 + v * 0.1, 0.7, 0.16, at([LEAF, 0x5d8a3c, 0x6d9247], v));
  if (v > 0) tree(g, 1.55, 0.85, 2.6, 0.58, 0.16, 0x5d8a3c);
  g.cyl(0.34, 0.38, 0.5, 1.2, 0.16, 1.5, STONE2, 8);
  g.ring(0.36, 0.05, 1.2, 0.68, 1.5, STONE, 8);
  if (v === 2) {
    g.box(1.2, 0.8, 0.9, -2.35, 0.12, 1.9, wall);
    g.gable(1.5, 0.5, 1.2, -2.35, 0.92, 1.9, roof);
  }
  return g.build();
}

function gatehouse(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const roof = at([0x4f5a63, GREEN, 0x46525c], v);
  const column = at([RED, 0x9e2b1e, 0xb23a2c], v);
  const plaza = at([0xcfc6b2, 0xc9bfa9, 0xd2cab6], v);

  g.box(6.9, 0.14, 6.9, 0, 0, 0, plaza);
  for (const z of [1.9, -1.6]) g.box(6.4, 0.03, 0.1, 0, 0.14, z, 0xb8af9a);
  for (const x of [-1.8, 1.8]) g.box(0.1, 0.03, 6.4, x, 0.14, 0, 0xb8af9a);

  const z = -0.4;
  const cols = [[-2.8, 4.55], [-1.0, 5.6], [1.0, 5.6], [2.8, 4.55]];
  for (const [x, h] of cols) {
    g.box(0.55, 0.55, 0.55, x, 0.14, z, STONE2);
    g.box(0.68, 0.1, 0.68, x, 0.69, z, STONE);
    g.cyl(0.14, 0.17, h - 0.8, x, 0.79, z, column, 6);
    g.box(0.32, 0.14, 0.32, x, h * 0.55, z, GOLD);
  }

  g.box(6.1, 0.3, 0.42, 0, 4.45, z, column);
  g.box(2.3, 0.3, 0.42, 0, 4.95, z, column);
  g.box(2.5, 0.22, 0.46, 0, 5.3, z, GOLD);
  g.box(1.35, 0.9, 0.12, 0, 4.85, z + 0.32, 0x2c3e50);
  g.box(1.45, 0.06, 0.16, 0, 5.72, z + 0.32, GOLD);
  g.box(1.45, 0.06, 0.16, 0, 4.8, z + 0.32, GOLD);
  for (const dx of [-0.95, 0.95]) g.box(0.18, 0.18, 0.5, dx, 4.15, z, GOLD);

  g.hip(3.5, 2.2, 0.95 + v * 0.05, 0, 5.6, z, roof, 1.3);
  const cTop = 6.55 + v * 0.05;
  g.box(2.0, 0.14, 0.2, 0, cTop - 0.06, z, 0x3f4348);
  for (const x of [-0.95, 0.95]) g.sphere(0.1, x, cTop + 0.12, z, GOLD, 5);
  for (const x of [-1.9, 1.9]) {
    g.hip(2.4, 1.9, 0.75 + v * 0.05, x, 4.55, z, roof, 1.1);
    g.box(1.4, 0.1, 0.16, x, 5.26 + v * 0.05, z, 0x3f4348);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.box(0.5, 0.09, 0.14, sx * 1.4, 5.72, z + sz * 0.9, roof, { rz: sx * 0.3, ry: sz * 0.3 });
    }
  }

  for (const sx of [-1, 1]) {
    const lx = sx * 2.3, lz = 1.55;
    g.box(0.78, 0.5, 0.86, lx, 0.14, lz, STONE2);
    g.box(0.62, 0.14, 0.7, lx, 0.64, lz, STONE);
    g.box(0.32, 0.42, 0.5, lx, 0.78, lz - 0.05, 0xb0a68f);
    g.sphere(0.2, lx, 1.28, lz + 0.12, 0xb0a68f, 6);
    g.sphere(0.23, lx - sx * 0.04, 1.26, lz - 0.12, 0x9c937d, 6);
    for (const dx of [-0.12, 0.12]) g.box(0.09, 0.34, 0.12, lx + dx, 0.78, lz + 0.2, 0x9c937d);
    g.box(0.08, 0.32, 0.08, lx + sx * 0.2, 1.0, lz - 0.18, 0x9c937d);
    g.sphere(0.09, lx - sx * 0.18, 0.85, lz + 0.34, 0x9c937d, 5);
  }

  for (const x of [-0.65, 0.65]) lantern(g, x, 4.45, z + 0.38, 0xb03024);
  if (v === 2) {
    for (const x of [-2.9, 2.9]) {
      g.box(0.6, 0.7, 0.6, x, 0.14, -2.6, STONE2);
      g.cone(0.45, 1.2, x, 0.84, -2.6, 0x3f6b3a, 6);
    }
  }
  return g.build();
}

function waterPavilion(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const roof = at([ROOF, GREEN, 0x46525c], v);
  const water = at([0x6f9fb8, 0x7499ae, 0x6a9ab2], v);
  const px = 0, pz = -1.2;

  g.box(6.9, 0.1, 6.9, 0, 0, 0, 0x86a45c);
  g.box(6.4, 0.06, 5.4, 0, 0.1, 0.35, water);
  for (const [w, d, x, z] of [[6.6, 0.24, 0, 3.12], [6.6, 0.24, 0, -2.42], [0.24, 5.4, -3.22, 0.35], [0.24, 5.4, 3.22, 0.35]]) {
    g.box(w, 0.22, d, x, 0.1, z, STONE);
  }
  g.box(3.6, 0.42, 2.8, 0, 0.1, pz, STONE2);
  g.box(3.2, 0.1, 2.4, 0, 0.52, pz, 0xb0a895);

  const py = 0.62;
  const ph = 2.3 + v * 0.12;
  if (v === 1) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      g.cyl(0.1, 0.12, ph, px + Math.sin(a) * 1.15, py, pz + Math.cos(a) * 1.15, RED, 6);
    }
    g.cyl(1.32, 1.32, 0.12, px, py + ph, pz, WOOD, 6);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 6 + (i + 1) * (Math.PI / 3);
      railing(g, 1.1, px + Math.sin(a) * 1.02, py, pz + Math.cos(a) * 1.02, RED2, a + Math.PI / 2);
    }
    g.cone(1.9, 1.25, px, py + ph + 0.12, pz, roof, 6);
    g.sphere(0.13, px, py + ph + 1.52, pz, GOLD, 6);
  } else {
    for (const x of [-1.0, 1.0]) for (const z of [pz - 1.0, pz + 1.0]) {
      g.cyl(0.11, 0.13, ph, x, py, z, RED, 6);
      g.box(0.3, 0.08, 0.3, x, py, z, STONE2);
    }
    g.box(1.7, 1.7, 1.7, px, py, pz - 0.1, DARK);
    railing(g, 0.9, -0.78, py, pz + 1.15, RED2);
    railing(g, 0.9, 0.78, py, pz + 1.15, RED2);
    railing(g, 2.1, -1.15, py, pz, RED2, Math.PI / 2);
    railing(g, 2.1, 1.15, py, pz, RED2, Math.PI / 2);
    if (v === 2) {
      g.hip(3.6, 3.6, 0.55, px, py + ph - 0.6, pz, roof, 0.7);
      g.box(1.7, 0.8, 1.7, px, py + ph, pz, RED);
      g.box(1.78, 0.1, 1.78, px, py + ph + 0.45, pz, GOLD);
      g.hip(2.5, 2.5, 0.75, px, py + ph + 0.8, pz, roof, 0.6);
      g.box(1.1, 0.1, 0.16, px, py + ph + 1.5, pz, 0x3f4348);
      g.sphere(0.11, px, py + ph + 1.62, pz, GOLD, 6);
    } else {
      g.hip(3.5, 3.5, 1.05, px, py + ph, pz, roof, 0.8);
      g.box(1.6, 0.14, 0.22, px, py + ph + 0.98, pz, 0x3f4348);
      g.sphere(0.11, px, py + ph + 1.12, pz, GOLD, 6);
    }
  }

  const segs = v === 0
    ? [[1.0, 2.2, 0.05, 1.6], [0.3, 0.95, 0.5, 1.1], [0.0, 0.35, 0.0, 1.0]]
    : v === 1
      ? [[1.15, 2.25, 0.28, 1.5], [0.35, 1.05, -0.45, 1.0], [0.0, 0.35, 0.27, 1.0]]
      : [[0.85, 2.25, -0.2, 1.5], [0.15, 1.05, 0.5, 1.0], [0.0, 0.35, -0.15, 1.0]];
  for (const [x, z, ry, len] of segs) {
    g.box(1.0, 0.08, len, x, 0.24, z, WOOD, { ry });
    for (const s of [-1, 1]) {
      const ox = Math.cos(ry) * s * 0.44, oz = -Math.sin(ry) * s * 0.44;
      g.box(0.06, 0.5, 0.06, x + ox, 0.32, z + oz - len * 0.38, WOOD);
      g.box(0.06, 0.5, 0.06, x + ox, 0.32, z + oz + len * 0.38, WOOD);
      g.box(0.05, 0.05, len * 0.9, x + ox, 0.72, z + oz, WOOD, { ry });
    }
  }

  willow(g, -2.1, 0.9, 2.4);
  for (const [x, z, r] of [[-1.8, 1.9, 0.32], [-1.5, 2.25, 0.2], [2.0, 1.7, 0.28], [2.5, 2.1, 0.2], [-2.0, -1.8, 0.26], [1.8, -2.0, 0.3]]) {
    if (r > 0.25 || v > 0) g.sphere(r, x, 0.1 + r * 0.8, z, at([0x8f8a80, 0x9b9589, 0x7f7a70], v), 4);
  }
  for (let i = 0; i < 3 + v; i++) {
    const lx = -1.3 + i * 0.82, lz = 1.65 - (i % 2) * 0.7;
    g.cyl(0.22, 0.22, 0.03, lx, 0.16, lz, 0x4f7a3a, 6);
    if (i % 2 === 0) g.box(0.1, 0.1, 0.1, lx, 0.22, lz, 0xd77f8f);
  }
  return g.build();
}

function willow(g, x, z, h, crown = 0.95) {
  g.cyl(0.1, 0.16, h * 0.7, x, 0.1, z, 0x6b4a2f, 6);
  g.sphere(crown * 0.62, x, 0.1 + h * 0.7 + 0.2, z, 0x5d8a3c, 6);
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2) / 3 + 0.4;
    const bx = x + Math.cos(a) * 0.55, bz = z + Math.sin(a) * 0.55;
    g.cyl(0.03, 0.03, 1.0, bx, 1.55, bz, 0x5d8a3c, 4, { rx: Math.sin(a) * 0.55, rz: -Math.cos(a) * 0.55 });
    g.sphere(0.24, x + Math.cos(a) * 0.9, 1.5, z + Math.sin(a) * 0.9, 0x6d9247, 4);
  }
}

export const CHINESE_EXTRA = {
  teahouse,
  shophouse,
  drumTower,
  courtyardLarge,
  gatehouse,
  waterPavilion,
};
