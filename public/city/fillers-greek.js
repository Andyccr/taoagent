// Greek-quarter fillers: whitewashed houses, stoas, small temples, a tholos and agora stalls.
import { createGeo } from './geo.js';

const MARBLE = 0xeee9dd, FRIEZE = 0xd9d2c3, LIME = 0xd8cfb8, TERRA = 0xb5562f, BLUE = 0x2f5f9e, STONE = 0xa9a294, WHITE = 0xf4f1ea, DARK = 0x3a3733;

function columns(g, n, x0, x1, z, y, h, r = 0.16) {
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? x0 : x0 + (i * (x1 - x0)) / (n - 1);
    g.cyl(r * 0.85, r, h, x, y, z, MARBLE, 8);
    g.box(r * 2.6, 0.12, r * 2.6, x, y + h, z, MARBLE);
  }
}

function house(variant = 0) {
  const g = createGeo();
  const h1 = 3.0 + variant * 0.3, h2 = 2.0 + (variant % 2) * 0.5;
  g.box(6.4, 0.2, 6.4, 0, 0, 0, LIME);
  g.box(3.6, h1, 3.4, -1.2, 0.2, -0.9, WHITE);
  g.gable(3.9, 0.9, 3.8, -1.2, 0.2 + h1, -0.9, TERRA);
  g.box(2.8, h2, 3.0, 1.8, 0.2, 1.1, WHITE);
  g.box(3.0, 0.2, 3.2, 1.8, 0.2 + h2, 1.1, 0xe7e1d4);
  for (const x of [0.5, 3.1]) g.box(0.12, 0.45, 3.2, x - 0.05, 0.4 + h2, 1.1, WHITE);
  g.box(0.8, 1.5, 0.08, 1.8, 0.2, 2.62, BLUE);
  g.box(0.9, 1.6, 0.08, -1.6, 0.2, 0.82, variant === 1 ? 0x3d7a5a : BLUE);
  for (const [x, y, z] of [[-0.4, 1.6, 0.82], [-2.5, 1.8, 0.82], [1.0, 1.3, 2.62], [2.7, 1.3, 2.62]]) g.box(0.45, 0.5, 0.06, x, y, z, DARK);
  g.cyl(0.18, 0.12, 0.6, 2.9, 0.2, 2.9, TERRA, 6);
  return g.build();
}

function stoa(variant = 0) {
  const g = createGeo();
  for (let i = 0; i < 3; i++) g.box(6.9 - i * 0.2, 0.2, 3.4 - i * 0.2, 0, i * 0.2, 0, i ? MARBLE : STONE);
  const h = 2.6 + variant * 0.2;
  g.box(6.6, h + 0.3, 0.4, 0, 0.6, -1.3, LIME);
  columns(g, 8, -3.0, 3.0, 1.2, 0.6, h);
  g.box(6.8, 0.45, 3.0, 0, 0.6 + h + 0.1, 0, FRIEZE);
  g.gable(6.9, 0.7, 3.3, 0, 1.15 + h, 0, TERRA);
  for (let i = 0; i < 4; i++) g.box(0.5, 0.6, 0.5, -2.4 + i * 1.6, 0.6, -0.5, 0xb8a98a);
  return g.build();
}

function temple(variant = 0) {
  const g = createGeo();
  for (let i = 0; i < 3; i++) g.box(5.6 - i * 0.35, 0.22, 6.8 - i * 0.35, 0, i * 0.22, 0, i ? MARBLE : STONE);
  const h = 3.0 + variant * 0.25, top = 0.66 + h + 0.12;
  g.box(3.2, h, 4.4, 0, 0.66, -0.3, LIME);
  columns(g, 6, -2.2, 2.2, 2.75, 0.66, h);
  columns(g, 6, -2.2, 2.2, -2.75, 0.66, h);
  for (const x of [-2.2, 2.2]) for (const z of [-1.65, -0.55, 0.55, 1.65]) { g.cyl(0.14, 0.16, h, x, 0.66, z, MARBLE, 8); }
  g.box(5.0, 0.35, 6.1, 0, top, 0, MARBLE);
  g.box(5.0, 0.3, 6.1, 0, top + 0.35, 0, FRIEZE);
  g.gable(6.2, 1.0, 5.1, 0, top + 0.65, 0, MARBLE, { ry: Math.PI / 2 });
  return g.build();
}

function tholos(variant = 0) {
  const g = createGeo();
  for (let i = 0; i < 3; i++) g.cyl(3.2 - i * 0.3, 3.3 - i * 0.3, 0.22, 0, i * 0.22, 0, i ? MARBLE : STONE, 16);
  const h = 3.0 + variant * 0.2;
  g.cyl(1.6, 1.6, h, 0, 0.66, 0, LIME, 14);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.cyl(0.13, 0.15, h, Math.cos(a) * 2.45, 0.66, Math.sin(a) * 2.45, MARBLE, 6); }
  g.cyl(2.8, 2.8, 0.4, 0, 0.66 + h, 0, FRIEZE, 16);
  g.cone(3.0, 1.5, 0, 1.06 + h, 0, TERRA, 12);
  g.sphere(0.18, 0, 2.5 + h, 0, MARBLE, 6);
  return g.build();
}

function agora(variant = 0) {
  const g = createGeo();
  g.box(7, 0.12, 7, 0, 0, 0, LIME);
  const cols = [0xc0583a, 0x3d6b8c, 0xd9a520, 0x6b7c3a];
  [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]].forEach(([x, z], i) => {
    g.box(1.8, 0.9, 1.2, x, 0.12, z, 0x9c7a55);
    for (const dx of [-0.8, 0.8]) g.box(0.08, 1.8, 0.08, x + dx, 0.12, z, 0x5a4634);
    g.gable(2.0, 0.5, 1.6, x, 1.9, z, cols[(i + variant) % 4]);
    g.cyl(0.18, 0.12, 0.55, x + 1.15, 0.12, z + 0.6, TERRA, 6);
  });
  g.box(0.9, 1.0, 0.9, 0, 0.12, 0, MARBLE);
  g.box(0.35, 1.4, 0.35, 0, 1.12, 0, 0xe2dccd);
  g.sphere(0.24, 0, 2.7, 0, 0xe2dccd, 6);
  return g.build();
}

export const GREEK_FILLERS = { house, stoa, temple, tholos, agora };
