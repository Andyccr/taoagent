import { createGeo } from './geo.js';

const at = (list, i) => list[Math.max(0, Math.min(list.length - 1, i | 0))];
const idx = (variant) => Math.max(0, Math.min(2, variant | 0));

function slab(g, hex, h = 0.12) {
  g.box(7, h, 7, 0, 0, 0, hex);
}

function lamp(g, x, z, y = 0.12, h = 2.0, glow = 0xfff1c4) {
  g.cyl(0.045, 0.075, h, x, y, z, 0x3d3a36, 6);
  g.box(0.15, 0.2, 0.15, x, y + h - 0.08, z, glow);
  g.box(0.22, 0.06, 0.22, x, y + h + 0.12, z, 0x3d3a36);
}

function tree(g, x, z, h = 1.7, crown = 0x5d8a3c, r = 0.55, y = 0.12) {
  const trunk = h * 0.42;
  g.cyl(0.08, 0.12, trunk, x, y, z, 0x6b4a2f, 5);
  g.sphere(r, x, y + trunk + r * 0.55, z, crown, 6);
}

function cypress(g, x, z, h = 3.2, y = 0.1) {
  g.cyl(0.06, 0.1, h * 0.25, x, y, z, 0x5a4634, 5);
  g.cone(0.42, h, x, y + h * 0.15, z, 0x3f6b3a, 7);
}

function bench(g, x, z, ry = 0, hex = 0x8a6a48, y = 0.12) {
  g.group({ x, y, z, ry }, (b) => {
    b.box(1.05, 0.08, 0.34, 0, 0.4, 0, hex);
    b.box(1.05, 0.3, 0.06, 0, 0.52, -0.16, hex);
    for (const dx of [-0.42, 0.42]) b.box(0.08, 0.4, 0.3, dx, 0, 0, 0x5a5048);
  });
}

function fence(g, x, z, len, ry = 0, hex = 0x8c7256, y = 0.1) {
  g.group({ x, y, z, ry }, (b) => {
    const n = Math.max(2, Math.round(len / 0.85));
    for (let i = 0; i <= n; i++) b.box(0.07, 0.62, 0.07, -len / 2 + (len * i) / n, 0, 0, hex);
    b.box(len, 0.06, 0.05, 0, 0.36, 0, hex);
    b.box(len, 0.06, 0.05, 0, 0.16, 0, hex);
  });
}

function flowerBed(g, x, z, w, d, bloom, y = 0.12) {
  g.box(w, 0.18, d, x, y, z, 0x8f6f52);
  g.box(w - 0.1, 0.1, d - 0.1, x, y + 0.18, z, 0x4f7a3a);
  for (let i = 0; i < 3; i++) g.box(0.14, 0.12, 0.14, x - w / 3 + (i * w) / 3, y + 0.28, z + (i % 2 ? 0.08 : -0.08), bloom);
}

function marketStall(g, x, z, ry, awning, produce) {
  g.group({ x, z, ry }, (b) => {
    b.box(1.35, 0.7, 0.62, 0, 0.28, 0, 0x9c7a55);
    b.box(1.5, 0.08, 0.74, 0, 0.98, 0, 0x8a6a48);
    for (const px of [-0.62, 0.62]) for (const pz of [-0.26, 0.26]) b.box(0.08, 1.7, 0.08, px, 0.28, pz, 0x6e5238);
    b.box(1.62, 0.07, 1.05, 0, 1.96, 0.16, awning, { rx: -0.16 });
    b.box(0.34, 0.2, 0.32, -0.3, 1.06, 0, produce[0]);
    b.box(0.34, 0.2, 0.32, 0.12, 1.06, 0, produce[1]);
  });
}

function fountainSquare(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const pave = at([0xcfc6b2, 0xc7bda8, 0xd4ccba], v);
  const stone = at([0xbdb6a6, 0xc6bfb0, 0xb2aa98], v);
  const stone2 = at([0xaaa392, 0xb1aa99, 0x9f9888], v);
  const bloom = at([0xd9534f, 0xc77dd6, 0xf0ad4e], v);

  slab(g, pave, 0.14);
  g.box(6.2, 0.03, 6.2, 0, 0.14, 0, 0xc4b99f);

  if (v === 2) {
    g.box(3.6, 0.4, 3.6, 0, 0.17, 0, stone);
    g.box(3.0, 0.08, 3.0, 0, 0.56, 0, 0x8fc1d8);
  } else {
    g.cyl(1.7, 1.8, 0.42, 0, 0.17, 0, stone, 10 - v * 2);
    g.cyl(1.55, 1.55, 0.06, 0, 0.59, 0, 0x8fc1d8, 10 - v * 2);
    g.ring(1.66, 0.07, 0, 0.62, 0, stone2, 10 - v * 2);
  }

  g.cyl(0.38, 0.46, 0.5, 0, 0.62, 0, stone2, 8);
  g.cyl(0.92, 0.98, 0.16, 0, 1.05, 0, stone, 8);
  g.cyl(0.8, 0.8, 0.05, 0, 1.21, 0, 0x8fc1d8, 8);
  g.cyl(0.15, 0.19, 0.58, 0, 1.18, 0, stone2, 6);
  g.cyl(0.52, 0.58, 0.14, 0, 1.7, 0, stone, 8);
  g.cyl(0.44, 0.44, 0.04, 0, 1.84, 0, 0x8fc1d8, 8);
  g.cyl(0.06, 0.12, 0.42, 0, 1.84, 0, stone2, 6);
  g.sphere(0.16, 0, 2.33, 0, stone2, 6);

  for (const [x, z] of [[-2.95, -2.95], [2.95, -2.95], [-2.95, 2.95], [2.95, 2.95]]) lamp(g, x, z, 0.16, 2.1);
  bench(g, 0, -2.55, 0);
  bench(g, 0, 2.55, Math.PI);
  bench(g, -2.55, 0, Math.PI / 2);
  bench(g, 2.55, 0, -Math.PI / 2);

  for (const [x, z] of [[-1.95, -1.95], [1.95, -1.95], [-1.95, 1.95], [1.95, 1.95]]) {
    if (v === 1 && x < 0) flowerBed(g, x, z, 1.0, 0.8, bloom);
    else flowerBed(g, x, z, 0.8, 0.8, bloom);
  }

  if (v === 1) {
    for (const [x, z] of [[-1.9, 0.9], [1.9, -0.9]]) g.cyl(0.24, 0.3, 0.55, x, 0.17, z, stone, 8);
  }
  if (v === 2) {
    for (const [x, z] of [[-2.0, 0], [2.0, 0]]) g.box(1.0, 0.42, 0.42, x, 0.17, z, stone2);
  }

  return g.build();
}

function statueSquare(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const pave = at([0xcfc6b2, 0xd0c7b4, 0xc8bfaa], v);
  const stone = at([0xbdb6a6, 0xc5beac, 0xb0a896], v);
  const stone2 = at([0xa9a291, 0xb4ad9b, 0x9d9685], v);
  const bronze = at([0x6f6a4e, 0x7c7558, 0x5d6a5a], v);
  const leaf = at([0x5d8a3c, 0x4f7a3a, 0x6d9247], v);

  slab(g, pave, 0.14);
  g.cyl(3.1, 3.1, 0.02, 0, 0.14, 0, at([0xc4b99f, 0xc9bda3, 0xbfb49b], v), 24);
  g.cyl(2.55, 2.55, 0.02, 0, 0.16, 0, at([0xd3cbb8, 0xcdc2ab, 0xd6cdbb], v), 24);
  g.cyl(2.0, 2.0, 0.02, 0, 0.18, 0, at([0xc4b99f, 0xd0c4ad, 0xc9bda3], v), 24);
  g.ring(2.3, 0.04, 0, 0.2, 0, stone, 24);
  g.ring(1.5, 0.03, 0, 0.2, 0, stone2, 20);

  g.box(2.0, 0.28, 1.8, 0, 0.18, 0, stone);
  g.box(1.6, 0.3, 1.4, 0, 0.46, 0, stone2);
  const plinthH = 1.7 + v * 0.12;
  g.box(1.2, plinthH, 1.0, 0, 0.76, 0, stone);
  g.box(1.38, 0.14, 1.18, 0, 0.76 + plinthH, 0, stone2);

  const top = 0.76 + plinthH + 0.14;
  g.box(0.5, 0.52, 1.15, 0, top + 0.52, 0, bronze);
  for (const zz of [-0.42, 0.38]) for (const xx of [-0.17, 0.17]) g.box(0.12, 0.52, 0.12, xx, top, zz, bronze);
  g.box(0.3, 0.62, 0.32, 0, top + 0.92, 0.44, bronze, { rx: -0.55 });
  g.box(0.24, 0.28, 0.46, 0, top + 1.26, 0.72, bronze, { rx: 0.15 });
  g.box(0.07, 0.18, 0.07, -0.08, top + 1.4, 0.74, bronze);
  g.box(0.07, 0.18, 0.07, 0.08, top + 1.4, 0.74, bronze);
  g.box(0.1, 0.5, 0.12, 0, top + 0.62, -0.66, bronze, { rx: 0.5 });
  g.box(0.26, 0.55, 0.28, 0, top + 0.92, -0.05, bronze);
  g.sphere(0.13, 0, top + 1.55, -0.05, bronze, 6);

  const planter = 0.42 + v * 0.04;
  const spots = v === 0 ? [[-2.7, -2.7], [2.7, -2.7]] : [[-2.7, -2.7], [2.7, -2.7], [-2.7, 2.7], [2.7, 2.7]];
  for (const [x, z] of spots) {
    g.box(0.78, planter, 0.78, x, 0.16, z, stone2);
    tree(g, x, z, 1.45 + v * 0.15, leaf, 0.52, 0.16 + planter);
  }

  if (v === 1) {
    cypress(g, -2.8, 0.9, 2.6);
    cypress(g, 2.8, 0.9, 2.6);
  }
  if (v === 2) {
    for (const x of [-1.7, 1.7]) g.box(0.8, 0.35, 0.6, x, 0.2, 2.55, stone);
    bench(g, 0, 2.85, Math.PI, 0x7a6a4d);
  }
  if (v === 0) {
    bench(g, -1.7, 2.9, Math.PI);
    bench(g, 1.7, 2.9, Math.PI);
  }

  return g.build();
}

function playground(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const grass = at([0x86ad5f, 0x7fa65a, 0x90b56a], v);
  const wood = at([0x8a6a48, 0x7d5f3f, 0x94714c], v);
  const paint = at([0xb5452f, 0x2e6f8e, 0x5f8a3a], v);
  const leaf = at([0x5d8a3c, 0x4f7a3a, 0x6d9247], v);

  slab(g, grass, 0.1);
  g.box(0.9, 0.03, 6.6, -2.6, 0.1, 0, 0xd8cfb8);
  g.box(6.6, 0.03, 0.9, 0, 0.1, 2.6, 0xd8cfb8);

  const swingZ = -1.75;
  for (const x of [-2.75, -0.65]) {
    g.box(0.1, 2.3 + v * 0.08, 0.1, x, 0.1, swingZ - 0.42, wood);
    g.box(0.1, 2.3 + v * 0.08, 0.1, x, 0.1, swingZ + 0.42, wood);
  }
  g.box(2.25, 0.1, 0.1, -1.7, 2.3 + v * 0.08, swingZ - 0.42, paint);
  g.box(2.25, 0.1, 0.1, -1.7, 2.3 + v * 0.08, swingZ + 0.42, paint);
  for (const x of [-2.15, -1.25]) {
    for (const dz of [-0.16, 0.16]) g.box(0.035, 1.62, 0.035, x + dz, 0.72, swingZ, 0x5c5248);
    g.box(0.38, 0.07, 0.24, x, 0.72, swingZ, paint);
  }

  const tx = 1.65, tz = -1.35, towerH = 1.85 + v * 0.1;
  g.box(0.9, towerH, 0.9, tx, 0.1, tz, wood);
  g.box(1.05, 0.1, 1.05, tx, 0.1 + towerH, tz, 0x6f5a42);
  g.box(0.55, 0.55, 0.06, tx, 0.75, tz + 0.46, 0xb8b0a0);
  for (const dx of [-0.32, 0.32]) g.box(0.08, 0.75, 0.08, tx - 0.42, 0.1, tz + dx, wood);
  g.box(0.6, 0.08, 0.08, tx - 0.42, 0.5, tz, wood);

  const rampZ = tz + 1.6, rampY = towerH - 0.79;
  g.box(0.62, 0.08, 2.8, tx, rampY, rampZ, paint, { rx: 0.7 });
  for (const dx of [-0.28, 0.28]) g.box(0.06, 0.22, 2.8, tx + dx, rampY + 0.1, rampZ, 0x6f5a42, { rx: 0.7 });

  g.box(2.0, 0.2, 1.7, -1.7, 0.1, 1.75, 0x9c7a55);
  g.box(1.82, 0.06, 1.52, -1.7, 0.25, 1.75, 0xe6d8a8);

  if (v === 2) {
    g.box(1.0, 0.18, 0.5, 0.6, 0.1, 1.2, 0x8a6a48);
    g.cyl(0.08, 0.1, 0.5, 0.6, 0.28, 1.2, paint, 6);
    g.box(0.5, 0.08, 0.22, 0.6, 0.62, 1.2, paint);
  }
  if (v === 1) {
    g.box(1.5, 0.5, 0.5, 2.0, 0.1, 1.65, wood);
    g.box(1.3, 0.1, 0.36, 2.0, 0.6, 1.65, 0xe6d8a8);
  }

  tree(g, -2.6, -2.55, 4.0 + v * 0.1, leaf, 0.55);
  tree(g, 2.65, -2.55, 3.7 + v * 0.12, at([0x4f7a3a, 0x6d9247, 0x5d8a3c], v), 0.5);
  tree(g, 2.85, 2.1, 3.4 + v * 0.1, leaf, 0.48);

  if (v === 0) bench(g, 2.4, 2.55, Math.PI, 0x7a6a4d);
  if (v === 2) bench(g, -2.5, 2.4, Math.PI, 0x2e6f8e);

  fence(g, 0, -3.32, 6.5, 0, 0x8c7256);
  fence(g, -3.32, 0, 6.5, Math.PI / 2, 0x8c7256);
  fence(g, 3.32, 0, 6.5, Math.PI / 2, 0x8c7256);
  fence(g, -2.05, 3.32, 2.3, 0, 0x8c7256);
  fence(g, 2.05, 3.32, 2.3, 0, 0x8c7256);

  return g.build();
}

function bandstand(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const lawn = at([0x7fa65a, 0x86ad5f, 0x769b52], v);
  const stone = at([0xbdb6a6, 0xc6bfb0, 0xb2aa98], v);
  const wood = at([0xe9e2d2, 0xd8c9a8, 0xc9d3d6], v);
  const roof = at([0x7a4a36, 0x4f5a63, 0x5f7a4a], v);
  const trim = at([0x8a6a48, 0x6b6258, 0x7a5a3a], v);

  slab(g, lawn, 0.1);
  g.box(6.7, 0.04, 0.9, 0, 0.1, 0, 0xd8cfb8);
  g.box(0.9, 0.04, 6.7, 0, 0.1, 0, 0xd8cfb8);
  g.cyl(2.05, 2.18, 0.3, 0, 0.14, 0, stone, 8);
  g.cyl(2.08, 2.08, 0.05, 0, 0.43, 0, trim, 8);

  for (let i = 0; i < 3; i++) g.box(1.25, 0.1, 0.38, 0, 0.1 + i * 0.1, 2.18 + i * 0.34, stone);
  g.box(1.1, 0.06, 0.5, 0, 0.44, 1.82, trim);

  const r = 1.72;
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    g.box(0.13, 2.1, 0.13, r * Math.sin(a), 0.44, r * Math.cos(a), wood);
  }
  for (let i = 0; i < 7; i++) {
    const a = Math.PI / 8 + (i + 0.5) * (Math.PI / 4);
    const rr = r * Math.cos(Math.PI / 8);
    g.box(1.26, 0.06, 0.05, rr * Math.sin(a), 0.9, rr * Math.cos(a), trim, { ry: a });
    g.box(1.26, 0.05, 0.05, rr * Math.sin(a), 0.62, rr * Math.cos(a), trim, { ry: a });
  }
  g.box(1.15, 0.34, 0.06, 0, 1.72, 1.64, at([0xb5452f, 0x2e6f8e, 0x5f8a3a], v));

  g.cyl(2.36, 2.46, 0.12, 0, 2.54, 0, trim, 8);
  g.cone(2.5, 1.02 + v * 0.04, 0, 2.66, 0, roof, 8);
  g.cyl(0.05, 0.07, 0.18, 0, 3.66 + v * 0.04, 0, trim, 6);
  g.sphere(0.1, 0, 3.86 + v * 0.04, 0, trim, 6);

  for (const [x, z, ry] of [[0, -2.95, 0], [-2.8, 0, Math.PI / 2], [2.8, 0, -Math.PI / 2]]) bench(g, x, z, ry, 0x7a6a4d);
  if (v !== 1) bench(g, 0, 2.95, Math.PI, 0x7a6a4d);

  for (const [x, z] of [[-2.9, 2.9], [2.9, 2.9]]) lamp(g, x, z, 0.14, 2.0);
  flowerBed(g, -2.6, -2.6, 0.9, 0.9, at([0xd9534f, 0xc77dd6, 0xf0ad4e], v));
  flowerBed(g, 2.6, -2.6, 0.9, 0.9, at([0xf0ad4e, 0xd9534f, 0xc77dd6], v));
  if (v === 2) {
    flowerBed(g, -2.6, 2.6, 0.8, 0.8, 0xf5f0e6);
    flowerBed(g, 2.6, 2.6, 0.8, 0.8, 0xf5f0e6);
    g.cyl(0.3, 0.36, 0.5, 0, 0.14, -2.9, stone, 8);
    cypress(g, 0, -2.9, 1.6, 0.62);
  }

  return g.build();
}

function marketHall(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const pave = at([0xcfc6b2, 0xc9bfa9, 0xd3cbb8], v);
  const wood = at([0x8a6a48, 0x7d5f3f, 0x94714c], v);
  const roof = at([0x7a4a36, 0x5c6b64, 0x8a5638], v);
  const awning = at([0xc0392b, 0x2e86c1, 0xe5b53a], v);
  const fruit = v === 0 ? [0xd9534f, 0xf0ad4e] : v === 1 ? [0xf0ad4e, 0x7fae4a] : [0xc77dd6, 0xd9534f];

  slab(g, pave, 0.12);
  const hw = 6.3, hd = 4.2, hz = -0.35;
  g.box(hw, 0.16, hd, 0, 0.12, hz, 0xcbbfa3);
  const postH = 2.85 + v * 0.08;
  const baseY = 0.28;
  for (const x of [-2.85, -1.42, 0, 1.42, 2.85]) {
    for (const z of [hz - hd / 2 + 0.12, hz + hd / 2 - 0.12]) g.box(0.16, postH, 0.16, x, baseY, z, wood);
  }
  for (const z of [hz - hd / 2 + 0.12, hz + hd / 2 - 0.12]) g.box(hw + 0.2, 0.16, 0.14, 0, baseY + postH - 0.16, z, wood);
  const roofY = baseY + postH;
  g.gable(hw + 0.6, 1.3, hd + 0.8, 0, roofY, hz, roof);

  for (const x of [-2.4, -1.2, 0, 1.2, 2.4]) {
    g.box(0.1, 0.12, hd - 0.2, x, roofY - 0.24, hz, wood);
    g.box(0.1, 0.64, 0.1, x, roofY - 0.12, hz, wood);
    for (const s of [-1, 1]) g.box(0.08, 0.08, 0.9, x, roofY + 0.02, hz + s * 0.44, wood, { rx: s * 0.62 });
  }
  for (const z of [-1.65, -0.8, 0, 0.8, 1.65]) {
    const y = roofY + 1.3 * (1 - Math.abs(z) / 2.5) - 0.08;
    g.box(hw + 0.4, 0.07, 0.08, 0, y, hz + z, roof);
  }

  marketStall(g, -1.9, hz - 1.15, 0, awning, [fruit[0], fruit[1]]);
  marketStall(g, 0, hz - 1.15, 0, at([0x27ae60, 0xe67e22, 0x8e44ad], v), [fruit[1], 0x7fae4a]);
  marketStall(g, 1.9, hz - 1.15, 0, at([0x8e44ad, 0xc0392b, 0x2e86c1], v), [0xe0b25a, fruit[0]]);
  marketStall(g, -1.2, hz + 1.05, 0, at([0xe5b53a, 0x27ae60, 0xc0392b], v), [fruit[0], 0x7fae4a]);
  marketStall(g, 1.25, hz + 1.05, 0, at([0x2e86c1, 0xe5b53a, 0x8e44ad], v), [0xd9534f, 0xe0b25a]);

  const frontZ = hz + hd / 2 + 0.04;
  g.box(2.7, 0.46, 0.08, 0, 2.45, frontZ, 0x5c4634);
  g.box(1.9, 0.28, 0.04, 0, 2.54, frontZ + 0.05, 0xe9e2d2);
  for (const x of [-0.66, -0.22, 0.22, 0.66]) g.box(0.12, 0.12, 0.03, x, 2.62, frontZ + 0.08, 0x5c4634);
  for (const x of [-1.6, 1.6]) {
    g.cyl(0.035, 0.035, 0.5, x, roofY - 0.72, frontZ - 0.08, 0x3b3b3b, 5);
    g.box(0.16, 0.2, 0.16, x, roofY - 0.28, frontZ - 0.08, 0xfff1c4);
  }
  if (v === 2) {
    g.box(1.5, 0.7, 0.7, -2.6, baseY, hz + hd / 2 + 0.55, 0x9c7a55);
    g.box(1.3, 0.1, 0.55, -2.6, baseY + 0.7, hz + hd / 2 + 0.55, 0xe0b25a);
    g.box(0.4, 0.4, 0.4, -2.6, baseY + 0.8, hz + hd / 2 + 0.55, fruit[0]);
  }

  return g.build();
}

function windmill(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const grass = at([0x8aa45c, 0x86ad5f, 0x7f9e56], v);
  const stone = at([0xcfc4ad, 0xb9ac96, 0xc8b7a0], v);
  const cap = at([0x6b4a2f, 0x7a3f2f, 0x4f5a44], v);
  const sail = at([0xe9e2d2, 0xd8c9a8, 0xdfd6bd], v);
  const wood = 0x6e5238;
  const tx = -0.9, tz = -0.9;

  slab(g, grass, 0.12);
  g.cyl(0.85, 1.25, 6.4 + v * 0.06, tx, 0.12, tz, stone, 10);
  g.cyl(1.3, 1.3, 0.18, tx, 0.12, tz, 0x9f9584, 10);
  const towerTop = 0.12 + 6.4 + v * 0.06;

  g.box(0.72, 1.3, 0.1, tx, 0.12, tz + 1.18, wood);
  for (const dx of [-0.42, 0.42]) g.box(0.1, 1.34, 0.1, tx + dx, 0.12, tz + 1.2, 0x5a4634);
  g.box(0.94, 0.1, 0.12, tx, 1.38, tz + 1.2, 0x5a4634);
  g.box(0.36, 0.5, 0.08, tx, 2.25, tz + 1.1, 0x3d4b55);
  g.box(0.3, 0.4, 0.08, tx, 4.15, tz + 0.99, 0x3d4b55);
  g.box(0.08, 0.56, 0.1, tx - 0.25, 2.22, tz + 1.12, 0xd8c9a8);
  g.box(0.08, 0.56, 0.1, tx + 0.25, 2.22, tz + 1.12, 0xd8c9a8);

  g.cyl(1.06, 1.16, 0.16, tx, towerTop, tz, 0x8f8575, 10);
  if (v === 1) g.dome(1.12, tx, towerTop + 0.16, tz, cap, 10);
  else g.cone(1.12, 1.05, tx, towerTop + 0.16, tz, cap, 10);
  g.sphere(0.09, tx, towerTop + 1.28, tz, 0x3d3a36, 5);

  const hubY = towerTop + 0.32, hubZ = tz + 1.0, L = 3.25;
  g.cyl(0.12, 0.12, 0.5, tx, hubY - 0.25, hubZ - 0.18, wood, 6, { rx: Math.PI / 2 });
  g.sphere(0.17, tx, hubY, hubZ, 0x3d3a36, 6);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const dx = -Math.sin(a), dy = Math.cos(a);
    g.box(0.14, L, 0.07, tx + dx * L * 0.5, hubY + dy * L * 0.5 - L / 2, hubZ, sail, { rz: a });
    for (const [d, w] of [[1.2, 0.6], [1.9, 0.48], [2.55, 0.34]]) {
      g.box(w, 0.06, 0.07, tx + dx * d, hubY + dy * d - 0.03, hubZ + 0.02, sail, { rz: a });
    }
  }

  const sx = 2.15, sz = -1.6, sw = 1.45 + v * 0.1, sh = 1.3 + v * 0.08;
  g.box(sw, sh, 1.35, sx, 0.12, sz, at([0x8a6a48, 0x7d5f3f, 0x94714c], v));
  g.gable(sw + 0.25, 0.5, 1.6, sx, 0.12 + sh, sz, at([0x5a5a5a, 0x6b4a2f, 0x4f5a63], v));
  g.box(0.55, 0.9, 0.08, sx, 0.12, sz + 0.71, wood);
  g.box(0.4, 0.35, 0.07, sx, 1.02, sz + 0.72, 0x3d4b55);
  if (v !== 0) {
    g.box(0.9, 0.9, 0.9, sx + 0.2, 0.12, sz - 1.15, wood);
    g.box(1.0, 0.08, 1.0, sx + 0.2, 1.02, sz - 1.15, 0x6b5a42);
    g.box(0.5, 0.45, 0.5, sx + 0.95, 0.12, sz - 1.05, 0x9c7a55);
  }

  const gxc = v === 2 ? -1.7 : -1.4;
  const gw = v === 2 ? 2.2 : 2.6, gz = 2.25, gd = 1.9;
  fence(g, gxc, gz + gd / 2, gw, 0, wood);
  fence(g, gxc - gw / 2, gz, gd, Math.PI / 2, wood);
  fence(g, gxc + gw / 2, gz, gd, Math.PI / 2, wood);
  for (let r = 0; r < 3; r++) {
    g.box(gw - 0.25, 0.16, 0.28, gxc, 0.12, gz - 0.55 + r * 0.55, at([0x4f7a3a, 0x6d9247, 0x5d8a3c], (r + v) % 3));
    if (v !== 1) g.box(0.12, 0.08, 0.12, gxc - 0.5, 0.28, gz - 0.55 + r * 0.55, 0xd9822b);
  }
  if (v === 2) cypress(g, -2.9, 1.1, 2.4);
  if (v === 1) {
    g.cyl(0.38, 0.38, 0.14, 1.9, 0.55, 1.9, wood, 8, { rx: Math.PI / 2 });
    g.box(0.85, 0.08, 0.5, 1.9, 0.55, 1.9, wood);
  }

  return g.build();
}

function watermill(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const grass = at([0x86ad5f, 0x7f9e56, 0x8aa45c], v);
  const wall = at([0xe2d8c3, 0xd8c9a8, 0xc9d3d6], v);
  const roof = at([0x8b4a32, 0x7a4a36, 0x5c6b64], v);
  const wood = 0x6e5238;
  const hx = -0.95, hz = -0.95, hw = 3.4, hd = 2.8;

  slab(g, grass, 0.12);
  const hH = 2.6 + v * 0.12;
  g.box(hw, hH, hd, hx, 0.12, hz, wall);
  g.box(hw + 0.04, 0.46, hd + 0.04, hx, 0.12, hz, 0xa9a291);
  g.gable(hw + 0.4, 1.15, hd + 0.35, hx, 0.12 + hH, hz, roof);

  for (const y of [1.05, 1.4]) g.box(hw + 0.06, 0.08, 0.08, hx, y, hz + hd / 2 + 0.02, wood);
  for (const x of [hx - hw / 2 + 0.06, hx + hw / 2 - 0.06]) g.box(0.08, hH - 0.1, 0.08, x, 0.12, hz + hd / 2 + 0.02, wood);

  const fz = hz + hd / 2 + 0.04;
  g.box(0.62, 1.15, 0.08, hx, 0.12, fz, wood);
  g.box(0.74, 0.1, 0.1, hx, 1.27, fz, 0x5a4634);
  for (const x of [-1.75, -0.15]) {
    g.box(0.46, 0.52, 0.07, x, 1.55, fz + 0.01, 0x3d4b55);
    g.box(0.1, 0.56, 0.08, x - 0.28, 1.53, fz + 0.02, 0x5a4634);
    g.box(0.1, 0.56, 0.08, x + 0.28, 1.53, fz + 0.02, 0x5a4634);
  }
  g.box(0.28, 1.6, 0.28, hx + 0.95, 0.12 + hH - 0.15, hz + 0.2, 0x9b5a43);
  g.box(0.4, 0.18, 0.4, hx + 0.95, 0.12 + hH + 1.38, hz + 0.2, 0xd8c9b5);

  const waterZ = 1.65;
  g.box(6.4, 0.06, 0.85, 0, 0.1, waterZ, 0x8fc1d8);
  g.box(6.6, 0.16, 0.16, 0, 0.1, waterZ - 0.52, 0xa9a291);
  g.box(6.6, 0.16, 0.16, 0, 0.1, waterZ + 0.52, 0xa9a291);
  g.box(0.8, 0.08, 1.35, -1.9, 0.32, waterZ, wood);
  for (const dx of [-0.34, 0.34]) {
    g.box(0.07, 0.5, 1.3, -1.9 + dx, 0.4, waterZ, wood);
    for (const dz of [-0.55, 0.55]) g.box(0.07, 0.5, 0.07, -1.9 + dx, 0.12, waterZ + dz, wood);
  }

  const wx = 2.0, wy = 1.12, wz = waterZ, wr = 0.98;
  g.cyl(wr, wr, 0.2, wx, wy - 0.1, wz, at([0x8a6a48, 0x7d5f3f, 0x94714c], v), 10, { rx: Math.PI / 2 });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const cx = wx + Math.cos(a) * 0.49, cy = wy + Math.sin(a) * 0.49;
    g.box(0.06, wr, 0.06, cx, cy - wr / 2, wz, wood, { rz: a - Math.PI / 2 });
    g.box(0.22, 0.3, 0.28, wx + Math.cos(a) * 0.9, wy + Math.sin(a) * 0.9 - 0.15, wz, 0x9c7a55, { rz: a });
  }
  for (const dz of [-0.32, 0.32]) g.box(0.12, 1.05, 0.12, wx, 0.12, wz + dz, wood);
  g.box(0.12, 0.12, 0.78, wx, 1.0, wz, wood);
  g.box(0.12, 0.12, 0.75, wx, wy - 0.06, wz, 0x3d3a36);
  g.box(0.55, 0.4, 0.06, hx, 2.05, fz + 0.05, 0xe9e2d2);

  if (v > 0) {
    g.box(1.2, 0.08, 0.6, -1.6, 2.35, hz + hd / 2 + 0.3, wood);
    for (const dx of [-0.55, 0.55]) g.box(0.06, 1.0, 0.06, -1.6 + dx, 2.35, hz + hd / 2 + 0.55, wood);
    g.box(1.2, 0.06, 0.06, -1.6, 3.0, hz + hd / 2 + 0.55, wood);
  }
  if (v === 2) {
    g.box(1.1, 1.2, 1.1, 2.4, 0.12, -2.0, 0x8a6a48);
    g.gable(1.3, 0.45, 1.3, 2.4, 1.32, -2.0, roof);
  }

  return g.build();
}

function vineyard(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const soil = at([0x9d8a63, 0x96825c, 0xa28f68], v);
  const wall = at([0xe9e2d2, 0xe2d8c3, 0xd8c9a8], v);
  const roof = at([0x8b4a32, 0x92513a, 0x7f432e], v);
  const vine = at([0x4f7a3a, 0x5d8a3c, 0x6d9247], v);

  slab(g, soil, 0.1);
  g.box(6.6, 0.03, 6.6, 0, 0.1, 0, 0x8aa45c);

  const hx = -1.3, hz = -2.15, hw = 3.0, hd = 1.8;
  const hH = 2.4 + v * 0.1;
  g.box(hw, hH, hd, hx, 0.13, hz, wall);
  g.gable(hw + 0.4, 1.05, hd + 0.35, hx, 0.13 + hH, hz, roof);

  const fz = hz + hd / 2 + 0.04;
  g.box(0.6, 1.15, 0.08, hx, 0.13, fz, 0x6b4a2f);
  g.box(0.72, 0.1, 0.1, hx, 1.28, fz, 0x5a4634);
  for (const x of [-2.15, -0.45]) {
    g.box(0.46, 0.5, 0.07, x, 1.45, fz, 0x3d4b55);
    for (const dx of [-0.3, 0.3]) g.box(0.12, 0.56, 0.08, x + dx, 1.42, fz + 0.01, 0x5a4634);
    g.box(0.4, 0.14, 0.16, x, 1.28, fz + 0.08, 0x4f7a3a);
  }
  g.box(0.28, 1.25, 0.28, hx - 0.95, 0.13 + hH - 0.1, hz + 0.25, 0x9b5a43);
  g.box(0.4, 0.16, 0.4, hx - 0.95, 0.13 + hH + 1.05, hz + 0.25, 0xd8c9b5);

  const rows = 3 + v;
  for (let r = 0; r < rows; r++) {
    const z = 0.15 + r * 0.62;
    g.box(5.7, 0.4, 0.32, 0, 0.62, z, at([0x4f7a3a, 0x5d8a3c, 0x6d9247, 0x4a7135, 0x648f42], (r + v) % 5));
    g.box(5.7, 0.16, 0.26, 0, 1.0, z, vine);
    g.box(5.8, 0.03, 0.03, 0, 1.02, z, 0x5a5048);
    for (const x of [-2.85, 0, 2.85]) g.box(0.08, 0.95, 0.08, x, 0.13, z, 0x6e5238);
  }

  cypress(g, 2.7, -2.3, 3.1 + v * 0.1);
  if (v === 1) cypress(g, -2.9, -0.3, 2.3);
  if (v === 2) {
    cypress(g, 3.0, -1.15, 2.6);
    g.box(0.6, 0.52, 0.6, 2.3, 0.13, -1.6, 0xd9c06a);
    g.box(0.6, 0.52, 0.6, 2.1, 0.13, -0.9, 0xc9b05a);
  }
  if (v !== 2) {
    g.cyl(0.25, 0.28, 0.52, 0.85, 0.13, -1.9, 0x8a6a48, 8);
    g.cyl(0.27, 0.27, 0.06, 0.85, 0.58, -1.9, 0x5a4634, 8);
  }
  if (v === 1) {
    g.box(1.4, 0.08, 0.7, 1.4, 0.13, -0.6, 0x8a6a48);
    for (const dx of [-0.6, 0.6]) for (const dz of [-0.25, 0.25]) g.box(0.07, 0.9, 0.07, 1.4 + dx, 0.13, -0.6 + dz, 0x6e5238);
    g.box(1.4, 0.07, 0.07, 1.4, 1.0, -0.85, 0x6e5238);
    g.box(1.4, 0.07, 0.07, 1.4, 1.0, -0.35, 0x6e5238);
  }

  return g.build();
}

function boathouse(variant = 0) {
  const v = idx(variant);
  const g = createGeo();
  const water = at([0x6f9fb8, 0x7499ae, 0x6a9ab2], v);
  const deck = at([0x8a6a48, 0x7d5f3f, 0x94714c], v);
  const wall = at([0xd9c7a5, 0xc9d3d6, 0xd8c9a8], v);
  const roof = at([0x5a5a5a, 0x7a4a36, 0x4f5a63], v);
  const boat = at([0x2f5f9e, 0xb5452f, 0x2e6f8e], v);

  g.box(7, 0.06, 7, 0, 0, 0, water);
  for (const x of [-2.55, -0.9, 0.75, 2.4]) {
    for (const z of [-2.15, 0.95]) g.cyl(0.1, 0.12, 0.55, x, 0, z, 0x5a4634, 6);
  }
  g.box(5.7, 0.14, 3.5, 0, 0.55, -0.6, deck);
  for (const x of [-2.2, 2.2]) g.box(0.08, 0.05, 3.3, x, 0.69, -0.6, 0x6e5238);

  const hx = -0.45, hz = -0.85, hw = 3.6, hd = 2.3;
  const floor = 0.69;
  const hH = 2.05 + v * 0.08;
  g.box(hw, hH, hd, hx, floor, hz, wall);
  g.box(hw + 0.05, 0.12, hd + 0.05, hx, floor + 0.5, hz, 0x8f8270);
  g.gable(hw + 0.35, 0.95, hd + 0.35, hx, floor + hH, hz, roof);

  const fz = hz + hd / 2;
  g.box(1.5, 1.6, 0.08, hx, floor, fz + 0.04, 0x3b3630);
  for (const dx of [-0.82, 0.82]) g.box(0.1, 1.68, 0.1, hx + dx, floor, fz + 0.05, 0x5a4634);
  g.box(1.82, 0.1, 0.1, hx, floor + 1.6, fz + 0.05, 0x5a4634);
  g.box(1.9, 0.36, 0.07, hx, floor + 1.85, fz + 0.06, 0xe9e2d2);
  for (const x of [hx - 0.6, hx, hx + 0.6]) g.box(0.14, 0.14, 0.04, x, floor + 1.96, fz + 0.1, 0x5c4634);
  g.box(0.46, 0.5, 0.07, hx - 1.2, floor + 0.7, fz + 0.04, 0x3d4b55);
  g.box(0.46, 0.5, 0.07, hx + 1.2, floor + 0.7, fz + 0.04, 0x3d4b55);
  g.box(0.6, 0.6, 0.07, hx - 1.2, floor + 0.7, hz - hd / 2 - 0.03, 0x3d4b55);

  const rampX = hx, rampZ = 1.7, pitch = 0.21;
  g.box(1.7, 0.1, 2.75, rampX, 0.4, rampZ, deck, { rx: pitch });
  for (const dx of [-0.8, 0.8]) {
    g.box(0.07, 0.07, 2.7, rampX + dx, 0.68, rampZ, 0x6e5238, { rx: pitch });
    for (const dz of [-1.1, 0, 1.1]) g.box(0.07, 0.3, 0.07, rampX + dx, 0.51 - dz * Math.sin(pitch), rampZ + dz, 0x6e5238);
  }

  const bx = v === 1 ? -2.25 : 2.25, bz = 1.75;
  g.group({ x: bx, z: bz }, (b) => {
    b.prism([[-0.42, -0.8], [0.42, -0.8], [0.42, 0.45], [0, 0.95], [-0.42, 0.45]], 0.35, 0.08, boat);
    b.box(0.62, 0.08, 1.1, 0, 0.36, 0, 0xe6dcc8);
    for (const z of [-0.35, 0.3]) b.box(0.7, 0.06, 0.16, 0, 0.48, z, 0x8a6a48);
    b.box(0.06, 0.06, 1.3, -0.18, 0.52, -0.1, 0x6e5238, { ry: 0.2 });
    b.box(0.06, 0.06, 1.3, 0.18, 0.52, -0.1, 0x6e5238, { ry: -0.2 });
  });
  for (const z of [0.85, 2.55]) g.cyl(0.09, 0.11, 0.95, bx > 0 ? 2.95 : -2.95, 0, z, 0x5a4634, 6);

  g.cyl(0.03, 0.04, 3.1, -2.55, floor, -2.2, 0x3d3a36, 5);
  g.box(0.7, 0.4, 0.04, -2.25, floor + 2.62, -2.2, at([0xb5452f, 0x2e6f8e, 0x5f8a3a], v));
  g.box(0.55, 0.45, 0.55, 2.3, floor, -1.85, 0x9c7a55);
  g.box(0.5, 0.4, 0.5, 2.1, floor, -1.2, 0x8a6a48);
  g.sphere(0.16, 2.75, 0.2, 0.35, 0xd9534f, 5);
  g.sphere(0.15, -2.7, 0.2, 1.6, 0xf0ad4e, 5);
  if (v === 2) {
    g.box(0.9, 0.9, 0.9, -2.1, floor, 0.65, 0x8a6a48);
    g.box(1.0, 0.08, 1.0, -2.1, floor + 0.9, 0.65, 0x5a4634);
    g.box(0.4, 0.45, 0.4, 2.55, floor, 0.65, 0x9c7a55);
  }

  return g.build();
}

export const COMMON_EXTRA = {
  fountainSquare,
  statueSquare,
  playground,
  bandstand,
  marketHall,
  windmill,
  watermill,
  vineyard,
  boathouse,
};




