// Common fillers shared by every district (gardens, plazas, markets) plus street trees and canal bridges.
import { createGeo } from './geo.js';

const LAWN = 0x7fa65a, GRAVEL = 0xd8cfb8, PAVING = 0xcfc6b2, STONE = 0xbdb6a6, WATER = 0xa8d0e6, TRUNK = 0x6b4a2f;
const CANOPY = [0x5d8a3c, 0x4f7a3a, 0x7a9a48];
const FLOWERS = [0xd9534f, 0xf0ad4e, 0xc77dd6, 0xf5f0e6];
const AWNINGS = [0xc0392b, 0x2e86c1, 0xe5b53a, 0x27ae60, 0x8e44ad, 0xe67e22];

function smallTree(g, x, z, h = 1.6, c = CANOPY[0]) {
  g.cyl(0.1, 0.14, h * 0.5, x, 0, z, TRUNK, 5);
  g.sphere(h * 0.36, x, h * 0.42, z, c, 6);
}

function garden(variant = 0) {
  const g = createGeo();
  g.box(7, 0.12, 7, 0, 0, 0, LAWN);
  g.box(1, 0.14, 7, 0, 0.01, 0, GRAVEL);
  g.box(7, 0.14, 1, 0, 0.01, 0, GRAVEL);
  for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) smallTree(g, x, z, 1.6 + 0.2 * variant, CANOPY[(variant + (x > 0 ? 1 : 0)) % 3]);
  for (let i = 0; i < 4; i++) {
    const x = i < 2 ? -1.4 : 1.4, z = i % 2 ? 1.4 : -1.4;
    g.box(0.9, 0.3, 0.5, x, 0.12, z, FLOWERS[(i + variant) % FLOWERS.length]);
  }
  g.box(1.2, 0.08, 0.4, 0.9, 0.42, 0.9 + 0.3, 0x8a6a48);
  g.box(0.1, 0.42, 0.35, 0.4, 0, 1.2, 0x5a5048);
  g.box(0.1, 0.42, 0.35, 1.4, 0, 1.2, 0x5a5048);
  if (variant === 2) { g.cyl(0.5, 0.6, 0.35, 0, 0.14, 0, STONE, 10); g.cyl(0.42, 0.42, 0.05, 0, 0.45, 0, WATER, 10); }
  return g.build();
}

function plaza(variant = 0) {
  const g = createGeo();
  g.box(7, 0.14, 7, 0, 0, 0, PAVING);
  g.box(6.2, 0.02, 6.2, 0, 0.14, 0, 0xc4b99f);
  g.cyl(1.5, 1.6, 0.45, 0, 0.14, 0, STONE, 12);
  g.cyl(1.3, 1.3, 0.05, 0, 0.55, 0, WATER, 12);
  g.ring(1.5, 0.12, 0, 0.6, 0, 0xd8d1c1, 12);
  g.cyl(0.25, 0.35, 0.9 + 0.2 * variant, 0, 0.6, 0, STONE, 8);
  g.sphere(0.35, 0, 1.6 + 0.2 * variant, 0, WATER, 8);
  for (const [x, z] of [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]]) {
    g.cyl(0.06, 0.08, 2.2, x, 0.14, z, 0x3d3a36, 5);
    g.sphere(0.18, x, 2.35, z, 0xfff1c4, 6);
  }
  return g.build();
}

function stalls(variant = 0) {
  const g = createGeo();
  g.box(7, 0.12, 7, 0, 0, 0, PAVING);
  for (let i = 0; i < 6; i++) {
    const x = -2.3 + (i % 3) * 2.3, z = i < 3 ? -1.7 : 1.7, face = i < 3 ? 1 : -1;
    g.box(1.8, 0.9, 1.2, x, 0.12, z, 0x9c7a55);
    for (const dx of [-0.8, 0.8]) g.box(0.08, 1.9, 0.08, x + dx, 0.12, z + face * 0.55, 0x5a4634);
    g.box(2.0, 0.08, 1.6, x, 2.0, z + face * 0.15, AWNINGS[(i + variant) % AWNINGS.length], { rx: face * 0.18 });
    g.box(0.5, 0.4, 0.5, x + 0.5, 0.12, z + face * 1.0, 0xa47b4d);
  }
  return g.build();
}

export const COMMON_FILLERS = { garden, plaza, stalls };

// Street tree, ~3.5 high, under 80 triangles.
export function tree(variant = 0) {
  const g = createGeo();
  const c = CANOPY[variant % 3];
  g.cyl(0.14, 0.2, 1.4, 0, 0, 0, TRUNK, 5);
  if (variant === 1) g.cone(1.0, 2.6, 0, 1.0, 0, c, 6);
  else { g.sphere(1.0, 0, 2.3, 0, c, 6); if (variant === 2) g.sphere(0.7, 0.35, 3.0, 0.1, c, 5); }
  return g.build();
}

// Stone arch bridge along z crossing a canal (water at y=-0.3): deck 0.4 at the ends, ~1.2 in the middle.
export function bridge(span = 8, width = 5) {
  const g = createGeo();
  const len = span + 2, n = 6;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
    const z = -len / 2 + tm * len, y = 0.4 + 0.8 * Math.sin(Math.PI * tm);
    const pitch = Math.atan(0.8 * Math.PI * Math.cos(Math.PI * tm) / len);
    g.box(width, 0.35, len / n + 0.05, 0, y - 0.3, z, STONE, { rx: -pitch });
    for (const x of [-width / 2 + 0.15, width / 2 - 0.15]) g.box(0.3, 0.55, len / n + 0.05, x, y + 0.05, z, 0xaaa392, { rx: -pitch });
  }
  g.arch(span / 2 - 0.4, 0.5, width - 0.4, 0, 0.7 - (span / 2 - 0.4), 0, 0xa9a190, 8, { ry: Math.PI / 2 });
  return g.build();
}
