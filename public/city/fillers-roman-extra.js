import { createGeo } from './geo.js';

const TRAV = 0xd9cdb0;
const MARBLE = 0xeee9dd;
const BRICK = 0xa65a3c;
const TERRA = 0xb5562f;
const DARK = 0x3a3330;
const WOOD = 0x6b4a2f;
const IRON = 0x2f2a26;
const GREEN = 0x4f7a3a;
const POOL = 0x4f86b0;
const OCHRE = [0xc99a5b, 0xd0a463, 0xbf8b4e];
const ROOF = [0xb5562f, 0xa94c2a, 0xbc5f36];
const SIGN = [0x8f3a2e, 0x3f6f7a, 0xc08a2e];
const AWNING = [0xd9c7a3, 0x9e3b2f, 0xc9b48e];

function variantIndex(variant) {
  const n = Number.isFinite(variant) ? Math.floor(variant) : 0;
  return ((n % 3) + 3) % 3;
}

function slab(g, hex) {
  g.box(7, 0.16, 7, 0, 0, 0, hex);
}

function win(g, x, y, z, w, h, glass, frame, rot) {
  g.box(w + 0.12, h + 0.12, 0.08, x, y, z, frame, rot);
  g.box(w, h, 0.1, x, y + 0.06, z, glass, rot);
}

function lamp(g, x, y, z, glow = 0xffe0a0) {
  g.cyl(0.04, 0.06, 1.5, x, y, z, IRON, 6);
  g.box(0.15, 0.18, 0.15, x, y + 1.35, z, glow);
  g.box(0.22, 0.05, 0.22, x, y + 1.53, z, IRON);
}

function balcony(g, w, d, x, y, z, wood, rail, posts) {
  g.box(w, 0.12, d, x, y, z, wood);
  g.box(w, 0.07, 0.07, x, y + 0.92, z + d / 2 - 0.04, rail);
  g.box(w, 0.06, 0.06, x, y + 0.5, z + d / 2 - 0.04, rail);
  for (let i = 0; i < posts; i++) {
    const px = x - w / 2 + (w * i) / (posts - 1);
    g.box(0.06, 0.95, 0.06, px, y + 0.12, z + d / 2 - 0.04, rail);
  }
  g.box(0.07, 0.95, d, x - w / 2 + 0.03, y + 0.12, z, rail);
  g.box(0.07, 0.95, d, x + w / 2 - 0.03, y + 0.12, z, rail);
}

function column(g, x, y, z, h, r, hex, seg = 8) {
  g.box(r * 2.6, 0.12, r * 2.6, x, y, z, hex);
  g.cyl(r * 0.82, r, h, x, y + 0.12, z, hex, seg);
  g.box(r * 2.6, 0.14, r * 2.6, x, y + 0.12 + h, z, hex);
}

function amphora(g, x, y, z, hex) {
  g.cyl(0.07, 0.13, 0.3, x, y, z, hex, 6);
  g.cyl(0.12, 0.07, 0.12, x, y + 0.3, z, hex, 6);
  g.box(0.14, 0.04, 0.05, x, y + 0.42, z, WOOD);
}

function jar(g, x, y, z, hex) {
  g.cyl(0.13, 0.17, 0.3, x, y, z, hex, 6);
  g.cyl(0.1, 0.13, 0.12, x, y + 0.3, z, hex, 6);
  g.box(0.2, 0.05, 0.2, x, y + 0.42, z, WOOD);
}

function cypress(g, x, y, z, h = 1.4, hex = GREEN) {
  g.cyl(0.05, 0.08, h * 0.3, x, y, z, 0x5a4634, 5);
  g.cone(0.24, h, x, y + h * 0.2, z, hex, 6);
}

function shrub(g, x, y, z, r = 0.25, hex = GREEN) {
  g.sphere(r, x, y + r * 0.8, z, hex, 6);
}

function cart(g, x, y, z, wood, wheel) {
  g.box(1.0, 0.3, 0.55, x, y + 0.35, z, wood);
  g.box(1.0, 0.25, 0.08, x, y + 0.6, z - 0.24, wood);
  g.cyl(0.26, 0.26, 0.08, x - 0.36, y + 0.26, z + 0.3, wheel, 8, { rz: Math.PI / 2 });
  g.cyl(0.26, 0.26, 0.08, x + 0.36, y + 0.26, z + 0.3, wheel, 8, { rz: Math.PI / 2 });
  g.box(0.08, 0.08, 0.8, x + 0.5, y + 0.3, z + 0.5, wood);
}

function domus(variant = 0) {
  const v = variantIndex(variant);
  const g = createGeo();
  const wall = OCHRE[v];
  const roof = ROOF[v];
  const h = [3.7, 3.9, 4.0][v];
  const rise = [0.75, 0.9, 0.7][v];

  slab(g, 0xcfc2a6);

  g.box(6, h, 1.2, 0, 0.16, 1.9, wall);
  g.box(1.2, h, 2.8, -2.4, 0.16, 0.1, wall);
  g.box(1.2, h, 2.8, 2.4, 0.16, 0.1, wall);

  g.box(5.8, 0.85, 0.3, 0, 0.16, -2.65, wall);
  g.box(0.3, 0.85, 1.2, -2.85, 0.16, -2.0, wall);
  g.box(0.3, 0.85, 1.2, 2.85, 0.16, -2.0, wall);

  for (const x of [-2.1, -0.7, 0.7, 2.1]) column(g, x, 0.16, -1.45, h - 0.55, 0.13, MARBLE, 8);

  if (v === 0) {
    g.hip(6.2, 1.5, rise, 0, 0.16 + h, 1.9, roof, 0);
    g.hip(1.8, 3.0, rise * 0.9, -2.4, 0.16 + h, 0.1, roof, 0);
    g.hip(1.8, 3.0, rise * 0.9, 2.4, 0.16 + h, 0.1, roof, 0);
    g.hip(6.2, 1.5, rise * 0.8, 0, 0.16 + h - 0.55, -1.8, roof, 0);
  } else if (v === 1) {
    g.gable(6.2, rise, 1.5, 0, 0.16 + h, 1.9, roof);
    g.gable(3.0, rise * 0.9, 1.8, -2.4, 0.16 + h, 0.1, roof, { ry: Math.PI / 2 });
    g.gable(3.0, rise * 0.9, 1.8, 2.4, 0.16 + h, 0.1, roof, { ry: Math.PI / 2 });
    g.hip(6.2, 1.5, rise * 0.8, 0, 0.16 + h - 0.55, -1.8, roof, 0);
    g.box(1.3, h * 0.8, 1.3, 2.2, 0.16, -2.2, wall);
    g.hip(1.5, 1.5, rise * 0.7, 2.2, 0.16 + h * 0.8, -2.2, roof, 0);
  } else {
    g.hip(6.2, 1.5, rise, 0, 0.16 + h, 1.9, roof, 0.4);
    g.hip(1.8, 3.0, rise * 0.9, -2.4, 0.16 + h, 0.1, roof, 0.35);
    g.hip(1.8, 3.0, rise * 0.9, 2.4, 0.16 + h, 0.1, roof, 0.35);
    g.hip(6.2, 1.5, rise * 0.8, 0, 0.16 + h - 0.55, -1.8, roof, 0.35);
    column(g, -0.9, 0.16, 2.5, 2.2, 0.1, MARBLE, 8);
    column(g, 0.9, 0.16, 2.5, 2.2, 0.1, MARBLE, 8);
    g.gable(2.6, 0.5, 1.0, 0, 2.58, 2.6, roof);
  }

  g.box(1.0, 2.0, 0.12, 0, 0.16, 2.52, TRAV);
  g.box(0.78, 1.82, 0.14, 0, 0.24, 2.56, DARK);
  g.box(0.05, 1.82, 0.16, 0, 0.24, 2.57, WOOD);

  for (const x of [-1.9, 1.9]) win(g, x, 1.15, 2.52, 0.5, 0.75, DARK, TRAV);
  for (const z of [-0.8, 0.4]) {
    win(g, -3.02, 1.15, z, 0.5, 0.7, DARK, TRAV, { ry: Math.PI / 2 });
    win(g, 3.02, 1.15, z, 0.5, 0.7, DARK, TRAV, { ry: Math.PI / 2 });
  }

  g.box(1.5, 0.12, 0.42, 0, 0.16, 2.72, TRAV);
  g.box(1.7, 0.1, 0.32, 0, 0.16, 3.02, TRAV);

  g.box(1.7, 0.1, 1.2, 0, 0.16, 0.7, MARBLE);
  g.box(1.4, 0.06, 0.9, 0, 0.24, 0.7, POOL);

  cypress(g, -2.1, 0.16, -2.1, 1.3);
  cypress(g, 2.1, 0.16, -2.1, 1.3);
  shrub(g, -1.2, 0.16, -2.0, 0.3);
  shrub(g, 0, 0.16, -2.2, 0.35);
  shrub(g, 1.2, 0.16, -2.0, 0.3);

  for (const x of [-1.5, 1.5]) {
    g.cyl(0.14, 0.18, 0.3, x, 0.16, 1.15, TERRA, 8);
    shrub(g, x, 0.46, 1.15, 0.2);
  }

  g.box(0.32, 0.55, 0.32, 2.2, 0.16 + h + rise * 0.3, 1.9, BRICK);
  lamp(g, -1.15, 0.16, 2.6);
  g.box(0.8, 0.3, 0.08, -1.9, 2.2, 2.53, SIGN[v]);

  return g.build();
}

function basilica(variant = 0) {
  const v = variantIndex(variant);
  const g = createGeo();
  const wall = [TRAV, MARBLE, 0xd6c8a8][v];
  const roof = ROOF[v];
  const naveH = [8.0, 8.6, 8.8][v];
  const aisleH = [4.4, 4.8, 5.2][v];
  const rise = [1.4, 1.5, 1.5][v];

  slab(g, 0xcfc2a6);

  for (let i = 0; i < 3; i++) g.box(5.6, 0.18 * (i + 1), 0.34, 0, 0.16, 3.02 - i * 0.34, TRAV);

  g.box(3.4, naveH, 4.6, 0, 0.16, -0.5, wall);
  g.box(1.5, aisleH, 4.6, -2.4, 0.16, -0.5, wall);
  g.box(1.5, aisleH, 4.6, 2.4, 0.16, -0.5, wall);

  g.box(3.7, 0.25, 4.8, 0, naveH + 0.16, -0.5, TRAV);
  g.box(1.7, 0.22, 4.8, -2.4, aisleH + 0.16, -0.5, TRAV);
  g.box(1.7, 0.22, 4.8, 2.4, aisleH + 0.16, -0.5, TRAV);

  g.gable(4.8, rise, 3.8, 0, naveH + 0.41, -0.5, roof, { ry: Math.PI / 2 });
  g.hip(1.8, 4.8, 0.5, -2.4, aisleH + 0.38, -0.5, roof, 0);
  g.hip(1.8, 4.8, 0.5, 2.4, aisleH + 0.38, -0.5, roof, 0);

  for (const x of [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]) {
    column(g, x, 0.7, 2.1, aisleH + 0.5, 0.16, wall, 8);
  }
  g.box(5.9, 0.54, 0.9, 0, 0.16, 2.1, TRAV);
  g.box(5.9, 0.45, 0.8, 0, aisleH + 1.2, 2.1, TRAV);
  g.gable(5.9, 1.1, 0.7, 0, aisleH + 1.65, 2.1, roof);
  g.cyl(0.28, 0.28, 0.06, 0, aisleH + 2.1, 2.47, 0x9e3b2f, 10, { rx: Math.PI / 2 });

  g.box(1.7, 2.6, 0.14, 0, 0.7, 1.83, TRAV);
  g.box(1.4, 2.4, 0.16, 0, 0.78, 1.87, DARK);
  g.box(0.06, 2.4, 0.18, 0, 0.78, 1.88, WOOD);

  for (const x of [-1.0, 0, 1.0]) {
    win(g, x, aisleH + 0.9, 1.82, 0.55, 1.5, DARK, TRAV);
    g.arch(0.34, 0.08, 0.14, x, aisleH + 2.06, 1.82, TRAV, 6);
  }

  for (const z of [-1.8, -0.4, 1.0]) {
    for (const s of [-1, 1]) {
      win(g, s * 1.72, aisleH + 0.9, z, 0.5, 1.3, DARK, TRAV, { ry: Math.PI / 2 });
      win(g, s * 3.16, 1.6, z, 0.5, 1.1, DARK, TRAV, { ry: Math.PI / 2 });
    }
  }

  if (v === 1) {
    win(g, 3.16, 0.9, 0.2, 0.8, 1.8, DARK, TRAV, { ry: Math.PI / 2 });
  } else if (v === 2) {
    for (const x of [-2.4, 0, 2.4]) {
      g.box(0.24, 0.3, 0.24, x, aisleH + 1.65, 2.1, TRAV);
      g.cone(0.13, 0.5, x, aisleH + 1.95, 2.1, TRAV, 6);
    }
  }

  return g.build();
}

function tabernae(variant = 0) {
  const v = variantIndex(variant);
  const g = createGeo();
  const wall = [0xc98f54, 0xd0a463, 0xb9784a][v];
  const roof = ROOF[v];
  const bodyH = [5.3, 5.8, 6.2][v];
  const rise = [1.1, 1.2, 1.4][v];
  const n = v === 1 ? 3 : 4;
  const zc = -0.45;
  const front = 1.65;

  slab(g, 0xc9b48e);
  g.box(6.2, bodyH, 4.2, 0, 0.16, zc, wall);
  g.box(6.35, 0.25, 4.35, 0, 0.16 + bodyH - 0.25, zc, TRAV);

  const xs = n === 3 ? [-1.8, 0, 1.8] : [-2.25, -0.75, 0.75, 2.25];

  for (const x of xs) {
    g.box(1.05, 1.35, 0.14, x, 0.16, front + 0.02, DARK);
    g.box(0.12, 1.4, 0.18, x - 0.56, 0.16, front + 0.03, TRAV);
    g.box(0.12, 1.4, 0.18, x + 0.56, 0.16, front + 0.03, TRAV);
    g.arch(0.56, 0.12, 0.32, x, 1.5, front + 0.02, TRAV, 6);
    g.box(1.15, 0.3, 0.08, x, 2.15, front + 0.05, SIGN[v]);
    g.box(1.3, 0.08, 0.8, x, 2.5, front + 0.35, AWNING[v], { rx: -0.16 });
  }

  for (const x of xs) {
    if (x === 0) {
      g.box(0.85, 1.7, 0.14, 0, 3.15, front + 0.02, DARK);
      g.box(1.02, 0.12, 0.2, 0, 4.85, front + 0.06, TRAV);
    } else {
      win(g, x, 3.65, front + 0.02, 0.5, 0.8, DARK, TRAV);
    }
  }

  balcony(g, v === 1 ? 4.4 : 5.9, 0.7, 0, 3.1, front + 0.35, WOOD, 0x4a3828, 7);

  if (v === 0) {
    g.gable(6.4, rise, 4.4, 0, 0.16 + bodyH, zc, roof);
  } else if (v === 1) {
    g.hip(6.4, 4.4, rise, 0, 0.16 + bodyH, zc, roof, 0);
  } else {
    g.box(6.4, 0.45, 4.4, 0, 0.16 + bodyH, zc, wall);
    g.box(6.5, 0.12, 4.5, 0, 0.16 + bodyH + 0.45, zc, TRAV);
    for (const x of [-1.4, 1.0]) {
      g.cyl(0.2, 0.24, 0.4, x, 0.16 + bodyH + 0.57, zc, TERRA, 8);
      g.cone(0.2, 0.5, x, 0.16 + bodyH + 0.97, zc, GREEN, 6);
    }
  }

  g.box(0.35, 0.8, 0.35, 2.4, 0.16 + bodyH + 0.3, zc - 0.8, BRICK);

  for (const x of xs.slice(0, 2)) amphora(g, x - 0.72, 0.16, front + 0.4, TERRA);

  g.box(0.55, 0.28, 0.06, -2.9, 2.35, front + 0.25, SIGN[(v + 1) % 3], { ry: Math.PI / 2 });
  lamp(g, -2.9, 0.16, front + 0.5);
  lamp(g, 2.9, 0.16, front + 0.5);

  return g.build();
}

function theatre(variant = 0) {
  const v = variantIndex(variant);
  const g = createGeo();
  const stone = [TRAV, MARBLE, 0xd8cbb0][v];
  const seat = [0xd9cdb0, 0xcfc0a0, 0xe3d8bf][v];
  const roof = ROOF[v];

  slab(g, 0xc9b48e);

  const segs = 8;
  for (let t = 0; t < 3; t++) {
    const r = 1.5 + t * 0.5;
    const y = 0.16 + t * 0.3;
    const w = (r * Math.PI) / segs + 0.18;
    for (let i = 0; i < segs; i++) {
      const a = -Math.PI / 2 + (i + 0.5) * (Math.PI / segs);
      g.box(w, 0.3, 0.55, r * Math.sin(a), y, -r * Math.cos(a) - 0.35, seat, { ry: -a });
    }
  }

  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i + 0.5) * (Math.PI / 4);
    g.box(1.3, 1.4, 0.26, 2.95 * Math.sin(a), 0.16, -2.95 * Math.cos(a) - 0.35, stone, { ry: -a });
  }

  g.box(3.2, 0.08, 1.7, 0, 0.16, -0.2, MARBLE);
  g.box(4.8, 0.45, 1.0, 0, 0.16, 1.55, seat);
  g.box(4.9, 0.1, 1.1, 0, 0.61, 1.55, stone);

  const wallH = [4.6, 4.8, 5.0][v];
  const rise = [0.8, 0.9, 1.0][v];
  g.box(5.6, wallH, 0.6, 0, 0.16, 2.7, stone);
  g.box(5.7, 0.3, 0.75, 0, 0.16 + wallH, 2.7, stone);

  for (const x of [-1.5, 0, 1.5]) {
    g.box(0.8, 1.8, 0.14, x, 0.3, 3.02, DARK);
    g.arch(0.45, 0.1, 0.16, x, 2.0, 3.02, stone, 6);
  }

  const nc = v === 0 ? 4 : 6;
  const colH = wallH - 0.5;
  for (let i = 0; i < nc; i++) {
    column(g, -2.1 + (4.2 / (nc - 1)) * i, 0.66, 2.25, colH, 0.14, stone, 6);
  }

  const ent = 0.66 + colH + 0.26;
  g.box(5.7, 0.4, 0.75, 0, ent, 2.25, stone);
  g.gable(5.7, rise, 0.7, 0, ent + 0.4, 2.25, roof);
  g.cyl(0.26, 0.26, 0.06, 0, ent + 0.4 + rise * 0.35, 2.62, 0x9e3b2f, 8, { rx: Math.PI / 2 });

  g.box(0.5, wallH * 0.85, 0.5, -2.85, 0.16, 2.55, stone);
  g.box(0.5, wallH * 0.85, 0.5, 2.85, 0.16, 2.55, stone);

  for (const x of [-2.2, 2.2]) {
    g.box(0.24, 0.3, 0.24, x, ent + 0.4, 2.25, stone);
    g.cone(0.13, 0.5, x, ent + 0.7, 2.25, stone, 6);
  }

  lamp(g, -2.9, 0.16, 2.9);
  lamp(g, 2.9, 0.16, 2.9);

  return g.build();
}

function granary(variant = 0) {
  const v = variantIndex(variant);
  const g = createGeo();
  const brick = [0xa65a3c, 0x9d5236, 0xb26544][v];
  const roof = ROOF[v];
  const bodyH = [4.4, 4.6, 4.8][v];
  const rise = [1.2, 1.3, 1.2][v];
  const zc = -0.5;
  const front = 1.4;

  slab(g, 0xbfb199);
  g.box(6.6, 0.25, 4.0, 0, 0.16, zc, TRAV);
  g.box(6.4, bodyH, 3.8, 0, 0.16, zc, brick);
  g.box(6.55, 0.2, 3.95, 0, 0.16 + bodyH - 0.2, zc, TRAV);

  for (const x of [-2.85, -1.9, -0.95, 0.95, 1.9, 2.85]) {
    g.box(0.32, bodyH * 0.9, 0.4, x, 0.16, front - 0.02, brick);
  }
  for (const z of [-2.1, -0.6, 0.9]) {
    g.box(0.4, bodyH * 0.85, 0.32, -3.2, 0.16, z, brick);
    g.box(0.4, bodyH * 0.85, 0.32, 3.2, 0.16, z, brick);
  }

  g.box(1.8, 2.1, 0.14, 0, 0.16, front + 0.02, DARK);
  g.box(0.16, 2.2, 0.2, -0.98, 0.16, front + 0.03, TRAV);
  g.box(0.16, 2.2, 0.2, 0.98, 0.16, front + 0.03, TRAV);
  g.arch(0.9, 0.16, 0.4, 0, 2.1, front + 0.02, TRAV, 8);
  g.box(0.85, 2.0, 0.16, -0.45, 0.24, front + 0.04, WOOD);
  g.box(0.85, 2.0, 0.16, 0.45, 0.24, front + 0.04, WOOD);

  for (const x of [-2.35, -1.15, 1.15, 2.35]) {
    g.box(0.22, 0.5, 0.1, x, bodyH - 0.7, front + 0.02, DARK);
  }
  for (const z of [-1.8, -0.4, 1.0]) {
    g.box(0.1, 0.45, 0.2, -3.22, bodyH - 0.7, z, DARK);
    g.box(0.1, 0.45, 0.2, 3.22, bodyH - 0.7, z, DARK);
  }

  g.gable(6.8, rise, 4.2, 0, 0.16 + bodyH, zc, roof);
  g.box(0.6, 0.35, 0.6, -1.6, 0.16 + bodyH + rise * 0.5, zc, brick);
  g.box(0.6, 0.35, 0.6, 1.6, 0.16 + bodyH + rise * 0.5, zc, brick);

  if (v === 1) {
    for (const x of [-2.2, 0, 2.2]) {
      g.box(0.5, 0.45, 0.5, x, 0.16 + bodyH + rise * 0.45, zc - 0.4, brick);
      g.box(0.55, 0.1, 0.55, x, 0.16 + bodyH + rise * 0.45 + 0.45, zc - 0.4, TRAV);
    }
  } else if (v === 2) {
    g.box(1.6, 2.6, 0.9, 2.2, 0.16, 0.95, brick);
    g.hip(1.7, 1.0, 0.45, 2.2, 2.76, 0.95, roof, 0);
  }

  cart(g, -2.0, 0.16, 2.1, WOOD, 0x4a3828);
  cart(g, 1.9, 0.16, 2.05, WOOD, 0x4a3828);

  for (const [x, z] of [[-0.7, 2.1], [0.7, 2.1], [-1.5, 2.3], [1.45, 2.25]]) {
    amphora(g, x, 0.16, z, TERRA);
  }

  g.box(1.2, 0.35, 0.08, 0, 3.0, front + 0.05, SIGN[v]);
  lamp(g, -2.7, 0.16, front + 0.55);
  lamp(g, 2.7, 0.16, front + 0.55);

  return g.build();
}

function thermopolium(variant = 0) {
  const v = variantIndex(variant);
  const g = createGeo();
  const wall = [0xb5533f, 0xc9964f, 0xd8c8a4][v];
  const trim = [TRAV, MARBLE, 0xcbbf9e][v];
  const roof = ROOF[v];
  const groundH = [3.0, 3.1, 3.0][v];
  const upperH = [1.9, 2.0, 1.8][v];

  slab(g, 0xc9b48e);

  g.box(4.4, groundH, 4.2, -0.8, 0.16, -0.4, wall);
  g.box(1.4, groundH, 3.0, 2.1, 0.16, -1.0, wall);
  g.box(5.7, 0.18, 4.3, -0.6, 0.16 + groundH - 0.18, -0.4, trim);
  g.box(1.5, 0.18, 3.1, 2.1, 0.16 + groundH - 0.18, -1.0, trim);

  for (const x of [-2.4, -1.2, 0]) {
    g.box(0.9, 1.5, 0.06, x, 0.8, 1.72, 0x7f2f25);
    g.box(1.0, 0.08, 0.08, x, 2.32, 1.74, trim);
    g.box(1.0, 0.08, 0.08, x, 0.74, 1.74, trim);
  }

  g.box(2.8, 0.9, 0.6, -1.2, 0.16, 1.95, trim);
  g.box(2.9, 0.12, 0.7, -1.2, 1.06, 1.95, MARBLE);
  for (const x of [-2.3, -1.65, -1.0]) jar(g, x, 1.18, 1.95, TERRA);

  g.box(0.6, 0.9, 1.6, 2.55, 0.16, 0, trim);
  g.box(0.7, 0.12, 1.7, 2.55, 1.06, 0, MARBLE);
  jar(g, 2.55, 1.18, 0, TERRA);

  g.box(0.9, 2.0, 0.14, 1.0, 0.16, 1.72, WOOD);
  g.box(1.06, 0.12, 0.2, 1.0, 2.16, 1.76, trim);

  g.box(4.6, upperH, 4.4, -0.7, 0.16 + groundH, -0.5, wall);
  g.box(1.4, upperH, 2.8, 2.1, 0.16 + groundH, -1.1, wall);
  g.box(4.75, 0.18, 4.55, -0.7, 0.16 + groundH + upperH - 0.18, -0.5, trim);

  balcony(g, 4.4, 0.7, -0.7, 0.16 + groundH + 0.15, 1.85, WOOD, 0x4a3828, 6);

  for (const x of [-2.0, -0.7, 0.6]) win(g, x, 0.16 + groundH + 0.6, 1.72, 0.55, 0.9, DARK, trim);
  win(g, 2.82, 0.16 + groundH + 0.6, 0.2, 0.5, 0.8, DARK, trim, { ry: Math.PI / 2 });

  const bodyTop = 0.16 + groundH + upperH;
  if (v === 0) {
    g.gable(4.9, 0.95, 4.6, -0.7, bodyTop, -0.5, roof);
  } else if (v === 1) {
    g.hip(4.9, 4.6, 0.95, -0.7, bodyTop, -0.5, roof, 0);
  } else {
    g.box(4.8, 0.5, 4.4, -0.7, bodyTop, -0.5, wall);
    g.box(4.9, 0.12, 4.5, -0.7, bodyTop + 0.5, -0.5, trim);
    for (const x of [-2.2, -0.7, 0.8]) {
      g.cyl(0.18, 0.22, 0.35, x, bodyTop + 0.62, -0.5, TERRA, 8);
      g.cone(0.2, 0.35, x, bodyTop + 0.97, -0.5, GREEN, 6);
    }
  }

  if (v === 2) {
    g.box(1.5, 0.5, 2.9, 2.1, bodyTop - 0.2, -1.1, wall);
  } else {
    g.hip(1.6, 3.1, 0.6, 2.1, bodyTop - 0.2, -1.1, roof, 0);
  }

  for (const x of [-2.7, 1.6]) {
    for (const z of [2.15, 3.05]) g.box(0.1, 2.5, 0.1, x, 0.16, z, WOOD);
  }
  g.box(4.5, 0.1, 0.12, -0.55, 2.66, 2.15, WOOD);
  g.box(4.5, 0.1, 0.12, -0.55, 2.66, 3.05, WOOD);
  for (let i = 0; i < 4; i++) g.box(0.07, 0.06, 1.1, -2.3 + i * 1.15, 2.72, 2.6, WOOD);

  for (const x of [-2.4, -0.5, 1.3]) g.cone(0.18, 0.38, x, 2.45, 2.55, GREEN, 6);

  g.box(1.6, 0.4, 0.1, -1.2, 2.55, 2.3, SIGN[v]);
  g.box(0.5, 0.26, 0.06, -2.95, 2.3, 1.85, SIGN[(v + 1) % 3], { ry: Math.PI / 2 });

  lamp(g, -2.9, 0.16, 2.25);
  lamp(g, 1.75, 0.16, 2.25);

  amphora(g, 1.9, 0.16, 1.1, TERRA);
  g.cone(0.2, 0.5, -2.75, 0.16, 1.3, GREEN, 6);

  return g.build();
}

export const ROMAN_EXTRA = {
  domus,
  basilica,
  tabernae,
  theatre,
  granary,
  thermopolium,
};
