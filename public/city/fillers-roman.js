import { createGeo } from './geo.js';

const TRAVERTINE = 0xd9cdb0;
const OCHRE = 0xc9964f;
const BRICK = 0xa65a3c;
const RED = 0x9e3b2f;
const TERRACOTTA = 0xb5562f;
const MARBLE = 0xeee9dd;
const WINDOW = 0x3a3330;
const CYPRESS = 0x2f4a2c;
const POOL = 0x4f86b0;

function insula(variant = 0) {
  const g = createGeo();
  const wall = variant === 1 ? BRICK : OCHRE;
  const h = 9 + variant;
  const rows = 2 + (variant === 2 ? 1 : 0);

  g.box(6, h, 6, 0, 0, 0, wall);

  for (let i = -1; i <= 1; i++) {
    g.arch(0.62, 0.14, 0.35, i * 1.5, 0.45, 3.02, TRAVERTINE, 8);
  }

  const xs = [-1.8, -0.6, 0.6, 1.8];
  for (let r = 0; r < rows; r++) {
    const y = 2.7 + r * 2.3;
    for (const x of xs) {
      g.box(0.45, 0.72, 0.12, x, y, 3.03, WINDOW);
      g.box(0.45, 0.72, 0.12, x, y, -3.03, WINDOW);
    }
  }

  g.box(5.4, 0.14, 0.5, 0, 2.7, 3.15, TERRACOTTA);
  g.hip(6.2, 6.2, 1.1, 0, h, 0, TERRACOTTA, 0);

  return g.build();
}

function villa(variant = 0) {
  const g = createGeo();
  const h = 3 + variant * 0.3;
  const rh = 1 + variant * 0.15;
  const wall = variant === 2 ? OCHRE : RED;

  g.box(7, h, 2, 0, 0, -2.5, wall);
  g.box(2, h, 3, -2.5, 0, 0, wall);
  g.box(2, h, 3, 2.5, 0, 0, wall);

  g.gable(7, rh, 2, 0, h, -2.5, TERRACOTTA);
  g.gable(3, rh, 2, -2.5, h, 0, TERRACOTTA, { ry: Math.PI / 2 });
  g.gable(3, rh, 2, 2.5, h, 0, TERRACOTTA, { ry: Math.PI / 2 });

  g.box(1.7, 0.16, 2.4, 0, 0.05, 0.6, POOL);

  g.cone(0.42, 4.6, -3.0, 0, 3.0, CYPRESS, 8);
  g.cone(0.42, 4.6, 3.0, 0, 3.0, CYPRESS, 8);

  return g.build();
}

function baths(variant = 0) {
  const g = createGeo();
  const hh = 4.2 + variant * 0.3;
  const wall = variant === 1 ? MARBLE : BRICK;

  g.box(6.4, hh, 4.4, 0, 0, 0, wall);
  g.cyl(1.1, 1.1, hh, 0, 0, -2.3, wall, 12);

  g.cyl(1.8, 1.8, 0.9, 0, hh, 0, BRICK, 12);
  g.dome(1.8, 0, hh + 0.9, 0, variant === 2 ? TRAVERTINE : MARBLE, 12);

  for (let i = -1; i <= 1; i++) {
    g.arch(0.85, 0.16, 0.3, i * 1.8, 0.5, 2.22, TRAVERTINE, 8);
  }
  g.arch(0.85, 0.16, 0.3, -3.22, 0.5, 0, TRAVERTINE, 8, { ry: Math.PI / 2 });
  g.arch(0.85, 0.16, 0.3, 3.22, 0.5, 0, TRAVERTINE, 8, { ry: Math.PI / 2 });

  return g.build();
}

function market(variant = 0) {
  const g = createGeo();
  const h = 2.8 + variant * 0.2;
  const stone = variant === 2 ? MARBLE : TRAVERTINE;

  g.box(7, h, 1.7, 0, 0, -2.65, stone);
  g.box(7, h, 1.7, 0, 0, 2.65, stone);
  g.box(1.7, h, 3.5, -2.65, 0, 0, stone);
  g.box(1.7, h, 3.5, 2.65, 0, 0, stone);

  const az = [-1.2, 0, 1.2];
  for (const x of az) {
    g.arch(0.6, 0.12, 0.3, x, 0.4, -1.82, stone, 6);
    g.arch(0.6, 0.12, 0.3, x, 0.4, 1.82, stone, 6);
  }

  g.cyl(1.5, 1.5, 0.25, 0, 0, 0, MARBLE, 10);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.cyl(0.11, 0.13, 2.0, Math.cos(a) * 0.95, 0.25, Math.sin(a) * 0.95, MARBLE, 6);
  }
  g.cone(1.55, 1.3, 0, 2.25, 0, TERRACOTTA, 10);

  return g.build();
}

function temple(variant = 0) {
  const g = createGeo();
  const ph = 1.2 + variant * 0.2;
  const stone = variant === 2 ? TRAVERTINE : MARBLE;
  const sh = ph / 3;

  g.box(6, ph, 4.5, 0, 0, 0, TRAVERTINE);

  g.box(2.5, sh, 0.5, 0, sh * 2, 2.15);
  g.box(2.5, sh, 0.5, 0, sh, 2.6);
  g.box(2.5, sh, 0.5, 0, 0, 3.05);

  for (const x of [-1.5, -0.5, 0.5, 1.5]) {
    g.cyl(0.26, 0.32, 3.0, x, ph, 1.15, stone, 8);
    g.cyl(0.5, 0.32, 0.5, x, ph + 3.0, 1.15, stone, 8);
  }

  g.box(4, 3.5, 2.2, 0, ph, -0.8, BRICK);
  g.gable(4.6, 1.3, 2.4, 0, ph + 3.5, -0.8, TERRACOTTA);
  g.gable(4.6, 1.3, 0.45, 0, ph + 3.5, 1.15, TERRACOTTA);

  return g.build();
}

export const ROMAN_FILLERS = { insula, villa, baths, market, temple };
