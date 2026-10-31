// Small facade, roof and waterfront dressing props.
import { createGeo } from './geo.js';

const WOOD = 0x7a5232, DARK = 0x3a2a22, IRON = 0x4a4a48, STONE = 0x9d9686;
const GOLD = 0xc9a24a, GLASS = 0x2e4a5e, LEAF = 0x5d8a3c, RED = 0xb83b30;

function v4(variant) { return ((Math.round(variant) % 4) + 4) % 4; }

function hash(n) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function pick(seed, list) { return list[Math.floor(hash(seed) * list.length) % list.length]; }

function door(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const frame = [0x5a3a24, 0x7a2a22, 0x24402e, 0x6a6a68][v];
  const leaf = [0x7a4a2a, RED, 0x2f5a3f, 0x3f6a7a][v];
  g.box(0.13, 2.16, 0.18, -0.55, 0, 0.09, frame);
  g.box(0.13, 2.16, 0.18, 0.55, 0, 0.09, frame);
  g.box(1.23, 0.16, 0.2, 0, 2.1, 0.1, frame);
  g.box(1.34, 0.12, 0.36, 0, 0, 0.18, 0x8a8070);
  if (v === 1) {
    g.box(0.48, 2.0, 0.07, -0.245, 0.12, 0.07, leaf);
    g.box(0.48, 2.0, 0.07, 0.245, 0.12, 0.07, leaf);
    for (const sx of [-1, 1]) for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      g.box(0.05, 0.05, 0.05, sx * 0.245 + (c - 0.5) * 0.2, 0.5 + r * 0.62, 0.11, GOLD);
    }
    g.sphere(0.045, -0.05, 1.05, 0.12, GOLD, 4);
    g.sphere(0.045, 0.05, 1.05, 0.12, GOLD, 4);
  } else if (v === 3) {
    g.box(1.0, 2.0, 0.05, 0, 0.12, 0.06, leaf);
    g.box(0.78, 1.68, 0.03, 0, 0.28, 0.1, 0x5f8ea0);
    g.box(0.78, 0.06, 0.05, 0, 0.9, 0.11, frame);
    g.box(0.06, 1.68, 0.05, 0, 0.28, 0.11, frame);
    g.box(0.06, 0.22, 0.06, 0.38, 0.95, 0.13, IRON);
  } else {
    g.box(1.0, 2.0, 0.07, 0, 0.12, 0.06, leaf);
    for (const y of [0.36, 1.2]) for (const x of [-0.25, 0.25]) {
      g.box(0.34, 0.58, 0.03, x, y, 0.1, v === 0 ? 0x8f5c34 : 0x3f7454);
    }
    g.sphere(0.05, 0.38, 1.02, 0.12, v === 0 ? GOLD : 0xb08a4a, 4);
  }
  return g.build();
}

function doorSteps(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const n = 2 + (v % 2);
  const c = [0xa8a090, 0x928a7c, 0xb2aa98][v % 3];
  for (let i = 0; i < n; i++) {
    const d = 0.9 - i * 0.28;
    g.box(1.6, 0.16, d, 0, i * 0.16, d / 2, i % 2 ? c : 0x8a8274);
  }
  g.box(1.7, 0.07, 0.12, 0, 0, 0.08, 0xb8b0a0);
  return g.build();
}

function shutterWindow(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const shutter = [0x3f6f4a, 0x2f5a7a, 0x6f4a2f, 0xd8d2c4][v];
  const trim = [0x6f9a74, 0x5a86a6, 0x9a7250, 0xb8b0a0][v];
  g.box(1.3, 0.1, 0.18, 0, 0, 0.09, STONE);
  g.box(0.09, 1.34, 0.12, -0.455, 0.1, 0.06, trim);
  g.box(0.09, 1.34, 0.12, 0.455, 0.1, 0.06, trim);
  g.box(1.0, 0.1, 0.12, 0, 1.34, 0.06, trim);
  g.box(0.82, 1.24, 0.04, 0, 0.15, 0.045, GLASS);
  g.box(0.05, 1.24, 0.05, 0, 0.15, 0.08, trim);
  g.box(0.82, 0.05, 0.05, 0, 0.74, 0.08, trim);
  for (const sx of [-1, 1]) {
    g.raw(new g.THREE.BoxGeometry(0.42, 1.22, 0.06), shutter, sx * 0.69, 0.78, 0.15, { ry: -sx * 0.55 });
    for (const y of [0.4, 0.78, 1.16]) {
      g.raw(new g.THREE.BoxGeometry(0.34, 0.045, 0.045), trim, sx * 0.72, y, 0.16, { ry: -sx * 0.55 });
    }
  }
  return g.build();
}

function flowerBox(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const planter = [0x8a5a38, 0x6f4a2f, 0x9c6a44, 0x5a4a3a][v];
  const bloom = [[0xc0392b, 0xe07a8a], [0xd94f6a, 0xf0b0c0], [0xd8b040, 0xe8c860], [0xc0392b, 0xd8b040]][v];
  g.box(1.0, 0.26, 0.28, 0, 0, 0.14, planter);
  g.box(0.92, 0.05, 0.2, 0, 0.24, 0.14, 0x4a3a2a);
  for (const x of [-0.3, 0.3]) g.box(0.06, 0.18, 0.18, x, -0.06, 0.09, planter);
  for (const x of [-0.34, 0, 0.34]) g.sphere(0.13, x, 0.32, 0.13, LEAF, 4);
  for (let i = 0; i < 6; i++) g.sphere(0.07, -0.38 + i * 0.15, 0.4 + (i % 2) * 0.06, 0.12 + (i % 3) * 0.03, bloom[i % 2], 4);
  return g.build();
}

function awning(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const pair = [[0xb5452f, 0xf0e6d2], [0x3f7a4a, 0xf0e6d2], [0x2f5a8a, 0xf0e6d2], [0xc9a24a, 0xb8862f]][v];
  const n = 8, w = 2.6 / n;
  for (let i = 0; i < n; i++) {
    const x = -1.3 + w / 2 + i * w, c = i % 2 ? pair[1] : pair[0];
    g.raw(new g.THREE.BoxGeometry(w, 0.055, 1.24), c, x, 2.08, 0.6, { rx: 0.42 });
    g.box(w, 0.2, 0.05, x, 1.6, 1.19, c);
  }
  for (const sx of [-1, 1]) {
    g.raw(new g.THREE.BoxGeometry(0.06, 0.055, 1.24), pair[0], sx * 1.28, 2.08, 0.6, { rx: 0.42 });
    g.box(0.06, 0.2, 0.05, sx * 1.28, 1.6, 1.19, pair[0]);
  }
  g.box(2.62, 0.09, 0.09, 0, 2.28, 0.045, IRON);
  return g.build();
}

function shopSign(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const board = [RED, 0x2f6f4f, 0x2f5a8a, 0xb8862f][v];
  if (v === 3) {
    g.box(0.1, 0.1, 0.62, 0, 2.2, 0.28, DARK);
    g.box(0.07, 0.5, 0.07, 0, 1.72, 0.38, DARK, { rx: 0.4 });
    g.box(0.5, 1.85, 0.06, 0, 0.2, 0.55, RED);
    g.box(0.58, 0.08, 0.1, 0, 2.05, 0.55, GOLD);
    g.box(0.58, 0.08, 0.1, 0, 0.2, 0.55, GOLD);
    for (let i = 0; i < 3; i++) g.box(0.12, 0.16, 0.02, 0, 1.62 - i * 0.42, 0.59, 0xe8c860);
    g.box(0.06, 0.25, 0.06, 0, -0.05, 0.55, GOLD);
  } else {
    g.box(2.4, 0.5, 0.1, 0, 0.22, 0.06, board);
    g.box(1.9, 0.15, 0.03, 0, 0.4, 0.12, 0xf0e6d2);
    g.box(2.46, 0.06, 0.14, 0, 0.72, 0.08, DARK);
    for (const x of [-0.9, 0.9]) g.box(0.06, 0.24, 0.12, x, 0, 0.06, DARK);
  }
  return g.build();
}

function lanternString(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const body = [0xc0392b, 0xd44a35, 0xa93226, RED][v];
  const pts = [[-1.5, 0], [-0.75, -0.09], [0, -0.14], [0.75, -0.09], [1.5, 0]];
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    g.raw(new g.THREE.BoxGeometry(len, 0.025, 0.025), DARK, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0, { rz: Math.atan2(dy, dx) });
  }
  for (let i = 0; i < 5; i++) {
    const x = pts[i][0], y = pts[i][1];
    g.box(0.025, 0.11, 0.025, x, y - 0.11, 0, DARK);
    g.raw(new g.THREE.SphereGeometry(0.14, 3, 4), body, x, y - 0.28, 0, { sy: 1.25 });
    g.box(0.09, 0.05, 0.09, x, y - 0.43, 0, GOLD);
    g.box(0.035, 0.14, 0.035, x, y - 0.53, 0, GOLD);
  }
  return g.build();
}

function laundryLine(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const cloth = [[0xb5452f, 0x2e6f8e, 0xd8c250, 0xf0e6d2], [0x5f8a3a, 0xd94f6a, 0x3f6a8a, 0xe0d8c8], [0x8a5a9a, 0xc9a24a, 0x4a7a7a, 0xf0e6d2], [0xb5452f, 0x2f5a8a, 0x8a8a84, 0xe8c860]][v];
  const n = 5 + (v % 2);
  for (const x of [-2, 2]) g.box(0.09, 2.35, 0.09, x, 0, 0, WOOD);
  g.box(3.95, 0.025, 0.025, 0, 2.2, 0, 0x4a4038);
  for (let i = 0; i < n; i++) {
    const x = -1.65 + i * (3.3 / (n - 1)), h = 0.5 + (i % 3) * 0.08;
    const c = cloth[(i + v) % 4];
    g.box(0.42, h, 0.04, x, 2.18 - h, 0, c, { rz: (i % 2 ? 1 : -1) * 0.04 });
    g.box(0.05, 0.06, 0.05, x - 0.14, 2.14, 0.02, DARK);
    g.box(0.05, 0.06, 0.05, x + 0.14, 2.14, 0.02, DARK);
  }
  return g.build();
}

function balcony(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const rail = [0x3a3a38, 0x8a6a48, 0x9d9686, 0x8a8a84][v];
  g.box(1.6, 0.12, 0.8, 0, 0, 0.4, v === 1 ? 0x8a6a48 : 0xb0a894);
  for (const x of [-0.42, 0, 0.42]) g.box(0.05, 0.42, 0.05, x, 0.6, 0.78, rail);
  g.box(1.6, 0.06, 0.06, 0, 0.72, 0.78, rail);
  g.box(1.6, 0.05, 0.05, 0, 0.26, 0.78, rail);
  for (const sx of [-1, 1]) {
    g.box(0.06, 0.06, 0.8, sx * 0.77, 0.72, 0.4, rail);
    g.box(0.06, 0.28, 0.06, sx * 0.77, 0.12, 0.06, rail);
  }
  for (const x of [-0.6, 0.6]) g.box(0.08, 0.34, 0.55, x, -0.34, 0.3, 0x8a8274, { rx: 0.35 });
  return g.build();
}

function acUnit(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const shell = [0xd8d4ca, 0xb8b4aa, 0x9aa0a0, 0xd0c8b8][v];
  g.box(0.8, 0.5, 0.36, 0, 0.06, 0.18, shell);
  for (let i = 0; i < 4; i++) g.box(0.7, 0.018, 0.02, 0, 0.1 + i * 0.08, 0.36, 0x8a8a84);
  g.cyl(0.17, 0.17, 0.03, 0.12, 0.28, 0.36, 0x4a4a48, 8, { rx: Math.PI / 2 });
  g.sphere(0.05, 0.12, 0.32, 0.4, 0x8a8a84, 4);
  for (const sx of [-1, 1]) g.box(0.06, 0.07, 0.44, sx * 0.33, 0, 0.22, 0x6a6a68);
  if (v === 2) {
    g.box(0.9, 0.06, 0.5, 0, -0.06, 0.22, 0x6a6a68);
    g.box(0.06, 0.3, 0.06, 0, -0.36, 0.03, 0x6a6a68);
  } else {
    for (const sx of [-1, 1]) g.box(0.06, 0.3, 0.06, sx * 0.3, -0.3, 0.03, 0x6a6a68);
  }
  return g.build();
}

function waterTank(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const wood = v === 0 || v === 2;
  const shell = wood ? 0x7a5638 : 0x8a8f92;
  const band = wood ? 0x4a3a2a : 0x5a5f62;
  const r = 0.62 + (v % 2) * 0.08;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(0.09, 0.65, 0.09, sx * 0.48, 0, sz * 0.48, wood ? WOOD : IRON);
  g.box(1.24, 0.1, 1.24, 0, 0.65, 0, 0x6a5a44);
  g.cyl(r, r, 1.35, 0, 0.72, 0, shell, 8);
  g.cyl(r + 0.015, r + 0.015, 0.07, 0, 0.94, 0, band, 8);
  g.cyl(r + 0.015, r + 0.015, 0.07, 0, 1.62, 0, band, 8);
  g.cone(r + 0.08, 0.38, 0, 2.07, 0, wood ? 0x5a4634 : 0x6a6f72, 8);
  g.cyl(0.15, 0.15, 0.12, 0, 2.44, 0, band, 6);
  if (wood) {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      g.box(0.05, 1.3, 0.05, Math.cos(a) * (r - 0.02), 0.75, Math.sin(a) * (r - 0.02), 0x6a4a30);
    }
  }
  for (const y of [0.9, 1.7]) g.box(0.05, 0.05, 0.4, 0, y, r + 0.2, band, { rx: 0.4 });
  return g.build();
}

function roofGarden(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const deck = [0x9c7a55, 0x8a6a48, 0xb09070, 0x7a6a52][v];
  const parasol = [0xb5452f, 0x2f7a5a, 0x2f5a8a, 0xd8b040][v];
  g.box(3, 0.08, 3, 0, 0, 0, deck);
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
    g.box(0.72, 0.28, 0.72, x, 0.08, z, 0x8a5a38);
    g.box(0.64, 0.05, 0.64, x, 0.33, z, 0x4a3a2a);
    g.sphere(0.22, x, 0.48, z, v % 2 ? 0x5d8a3c : 0x6f9a46, 4);
    if ((x + z) > 0) g.sphere(0.12, x + 0.16, 0.6, z - 0.1, 0xd9534f, 3);
  }
  g.cyl(0.035, 0.045, 2.1, 0, 0.05, 0, WOOD, 4);
  g.cone(1.15, 0.42, 0, 1.95, 0, parasol, 6);
  g.cyl(0.34, 0.34, 0.06, 0, 0.7, 0, 0x9c7a55, 6);
  g.cyl(0.05, 0.05, 0.7, 0, 0, 0, IRON, 4);
  return g.build();
}

function solarPanels(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const panel = [0x2a3f5e, 0x354a66, 0x22364f, 0x3f4f6a][v];
  for (const z of [-0.34, 0.34]) {
    g.box(2.1, 0.08, 0.07, 0, 0.42, z, IRON);
    for (const x of [-0.9, 0.9]) g.box(0.07, 0.52, 0.07, x, 0, z, IRON);
  }
  for (const z of [-0.34, 0.34]) for (const x of [-0.92, 0, 0.92]) {
    g.raw(new g.THREE.BoxGeometry(0.84, 0.05, 0.6), panel, x, 0.55, z, { rx: -0.36 });
    g.raw(new g.THREE.BoxGeometry(0.72, 0.012, 0.48), 0x5f86b0, x, 0.58, z, { rx: -0.36 });
  }
  return g.build();
}

function satelliteDish(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const dish = [0xd8d4ca, 0xc8c4ba, 0xb8b8b0, 0xe0dcd0][v];
  g.cyl(0.32, 0.4, 0.12, 0, 0, 0, 0x8a8a84, 6);
  g.cyl(0.06, 0.08, 1.0, 0, 0.12, 0, 0x6a6a68, 4);
  g.raw(new g.THREE.SphereGeometry(0.55, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), dish, 0, 1.28, 0, { rx: -0.95, sy: 0.35 });
  g.box(0.04, 0.04, 0.55, 0, 1.28, 0.32, 0x6a6a68, { rx: -0.35 });
  g.sphere(0.06, 0, 1.48, 0.7, 0x4a4a48, 4);
  g.box(0.16, 0.16, 0.1, 0.12, 0.4, 0, 0x5a5a58);
  return g.build();
}

function chimneyStack(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const brick = [0x8a4a3a, 0x7a4438, 0x9a5a44, 0x6a4a40][v];
  g.box(0.66, 1.55, 0.66, 0, 0, 0, brick);
  g.box(0.8, 0.08, 0.8, 0, 1.55, 0, 0x6a6a64);
  g.box(0.74, 0.12, 0.74, 0, 1.4, 0, 0x5a5a54);
  for (const x of [-0.17, 0.17]) {
    g.cyl(0.09, 0.12, 0.42, x, 1.63, 0, 0x6a4538, 6);
    g.cyl(0.13, 0.13, 0.06, x, 2.05, 0, 0x4a3a32, 6);
  }
  return g.build();
}

function skylight(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const frame = [0x4a4a48, 0x6a6a68, 0x3a3a38, 0x8a8a84][v];
  const wide = v % 2 ? 1.2 : 0.9;
  g.box(wide, 0.16, 1.0, 0, 0, 0, frame);
  g.raw(new g.THREE.BoxGeometry(wide - 0.16, 0.06, 0.88), 0x4f7d94, 0, 0.3, 0, { rx: -0.35 });
  g.box(wide - 0.12, 0.06, 0.08, 0, 0.18, 0.46, frame);
  g.box(wide - 0.12, 0.06, 0.08, 0, 0.18, -0.46, frame);
  for (const x of [-wide / 2 + 0.05, wide / 2 - 0.05]) g.box(0.07, 0.3, 0.9, x, 0.08, 0, frame);
  return g.build();
}

function clutterCrates(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const crate = [0x9c7a55, 0x8a6a48, 0xa8835a, 0x7a5a3a][v];
  const spots = [[-0.42, 0, 0.12, 0], [0.4, 0, -0.06, 0.06], [-0.05, 0, -0.42, -0.04], [0.02, 0.62, 0.02, 0.1]];
  spots.forEach(([x, y, z, ry], i) => {
    g.box(0.62, 0.58, 0.62, x, y, z, i % 2 ? crate : 0x8a6a48, { ry });
    g.box(0.66, 0.06, 0.66, x, y + 0.52, z, 0x6f5236, { ry });
  });
  for (const [x, z] of [[0.55, 0.42], [-0.52, 0.48]]) {
    g.cyl(0.24, 0.28, 0.62, x, 0, z, 0x7a5a3a, 6);
    g.box(0.58, 0.05, 0.58, x, 0.18, z, 0x4a4038);
    g.box(0.58, 0.05, 0.58, x, 0.46, z, 0x4a4038);
  }
  for (const [x, z] of [[-0.55, -0.35], [0.28, 0.55]]) {
    g.sphere(0.26, x, 0.28, z, 0xb8a882, 4);
  }
  return g.build();
}

function bicycle(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const frame = [0x2f4f6f, 0x8a2f2f, 0x2f5a3f, 0x3a3a38][v];
  for (const x of [-0.55, 0.55]) g.raw(new g.THREE.TorusGeometry(0.34, 0.035, 4, 10), 0x2a2a28, x, 0.34, 0);
  g.box(0.8, 0.05, 0.05, -0.08, 0.6, 0, frame, { rz: 0.12 });
  g.box(0.62, 0.05, 0.05, 0.08, 0.42, 0, frame, { rz: -0.35 });
  g.box(0.05, 0.05, 0.4, -0.55, 0.34, 0, frame, { rz: 1.1 });
  g.box(0.05, 0.42, 0.05, 0.5, 0.42, 0, frame, { rz: -0.2 });
  g.box(0.42, 0.04, 0.04, 0.6, 0.86, 0, frame);
  g.box(0.24, 0.05, 0.12, -0.42, 0.82, 0, 0x2a2a28);
  g.box(0.05, 0.22, 0.05, -0.1, 0.24, 0.13, 0x6a6a68);
  g.box(0.16, 0.04, 0.28, -0.1, 0.2, 0.13, 0x2a2a28);
  return g.build();
}

function streetVendorCart(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const cart = [0x2f6f5f, 0x8a2f2f, 0x2f4f6f, 0xb8862f][v];
  const top = [0xe8e2d2, 0xb5452f, 0xd8b040, 0x3f7a4a][v];
  g.box(1.5, 0.75, 0.9, 0, 0.42, 0, cart);
  g.box(1.66, 0.1, 1.0, 0, 1.17, 0, 0x9c7a55);
  for (const x of [-0.55, 0.55]) g.raw(new g.THREE.CylinderGeometry(0.28, 0.28, 0.08, 6, 1, true), 0x2a2a28, x, 0.28, 0.48, { rx: Math.PI / 2 });
  g.box(0.09, 2.4, 0.09, 0.55, 1.27, 0, WOOD);
  g.cone(1.15, 0.45, 0.55, 3.55, 0, top, 8);
  for (let i = 0; i < 3; i++) g.box(0.28, 0.16, 0.34, -0.4 + i * 0.4, 1.27, 0.12, [0xd8b040, 0xb5452f, 0x5f8a3a][i]);
  g.box(0.62, 0.28, 0.04, 0, 0.75, 0.47, 0xf0e6d2);
  return g.build();
}

function personGroup(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const n = 3 + (v % 3);
  const shirts = [0xb5452f, 0x2e6f8e, 0xd8c250, 0x5f8a3a, 0x8a5a9a, 0xe0d8c8];
  const pants = [0x3f4a5e, 0x5a4a3a, 0x2f3a2f, 0x3a3a3a, 0x6a5a42];
  const skins = [0xc9986a, 0x9a6a44, 0xe0b088, 0x8a5a3a];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    const rad = 0.55 + hash(v * 17 + i * 7) * 0.45;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const sc = 0.94 + hash(v * 31 + i * 13) * 0.1;
    const shirt = pick(v * 101 + i * 11, shirts);
    const pant = pick(v * 211 + i * 17, pants);
    const skin = pick(v * 307 + i * 19, skins);
    g.group({ x, z, ry: -a, s: sc }, (b) => {
      b.box(0.24, 0.78, 0.2, 0, 0, 0, pant);
      b.box(0.4, 0.66, 0.24, 0, 0.78, 0, shirt);
      b.raw(new b.THREE.SphereGeometry(0.14, 4, 4), skin, 0, 1.57, 0);
      b.box(0.1, 0.56, 0.12, -0.25, 0.84, 0, shirt, { rz: 0.09 });
      b.box(0.1, 0.56, 0.12, 0.25, 0.84, 0, shirt, { rz: -0.09 });
    });
  }
  return g.build();
}

function rock(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const size = 0.9 + v * 0.22;
  const geo = new g.THREE.DodecahedronGeometry(size, 0);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = Math.round(x * 997) * 73856093 ^ Math.round(y * 997) * 19349663 ^ Math.round(z * 997) * 83492791 ^ (v * 977);
    const f = 0.82 + hash(k) * 0.36;
    pos.setXYZ(i, x * f * 1.12, y * f * 0.78, z * f);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.translate(0, -geo.boundingBox.min.y, 0);
  g.raw(geo, [0x8a8a84, 0x7a7a74, 0x9a948a, 0x6f6f6a][v], 0, 0, 0);
  return g.build();
}

function dock(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const deck = [0x9c7a55, 0x8a6a48, 0xa8835a, 0x7a5a3a][v];
  g.box(3, 0.12, 14, 0, 0.5, 0, deck);
  for (const x of [-1.25, 1.25]) for (const z of [-5, 0, 5]) g.cyl(0.11, 0.13, 0.55, x, 0, z, 0x5a4030, 5);
  for (const z of [-5, 0, 5]) g.box(3.2, 0.1, 0.16, 0, 0.42, z, 0x6f5236);
  for (const x of [-1.25, 1.25]) for (const z of [-6.2, 6.2]) {
    g.cyl(0.11, 0.13, 0.38, x, 0.62, z, 0x5a4030, 5);
    g.box(0.26, 0.07, 0.26, x, 1, z, 0x4a3a2a);
  }
  return g.build();
}

function crane(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const steel = [0xd2691e, 0x2f5a8a, 0xc9a24a, 0x3f6a5a][v];
  const dark = 0x3a3a38;
  for (const x of [-3, 3]) for (const z of [-2, 2]) g.box(0.45, 10, 0.45, x, 0, z, steel);
  for (const x of [-3, 3]) g.box(0.55, 0.3, 6, x, 0, 0, dark);
  for (const z of [-2, 2]) g.box(6.5, 0.35, 0.4, 0, 10, z, steel);
  for (const x of [-3, 3]) g.box(0.35, 0.35, 5, x, 10, 0, steel);
  g.box(0.5, 0.5, 14, 0, 10.4, 0.4, steel);
  g.box(0.7, 0.5, 1.6, 0, 10.5, -5.5, dark);
  g.box(1.5, 0.9, 0.9, 0, 11, 1.5, steel);
  g.box(1.7, 0.12, 1.0, 0, 11.9, 1.5, dark);
  for (const z of [-2.5, 2.5]) g.box(0.08, 0.08, 3.4, 0, 12.4, z + 0.4, dark, { rx: 0.5 });
  g.box(0.12, 0.12, 2.2, 0, 9.6, 4.2, dark);
  g.box(0.28, 0.28, 0.28, 0, 8.4, 4.2, 0xc9a24a);
  return g.build();
}

function merchantShip(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const hull = [[-2.4, -10.5], [-1.5, -10], [1.5, -10], [2.4, -10.5], [2.8, -7], [2.8, 7], [2.3, 10.2], [1.2, 11.2], [-1.2, 11.2], [-2.3, 10.2], [-2.8, 7], [-2.8, -7]];
  const hullColor = [0x5a3a2a, 0x3a4a5a, 0x4a3a2a, 0x2f4a3f][v];
  g.prism(hull, 1.6, -0.8, hullColor);
  g.box(4.8, 0.12, 18, 0, 0.72, 0, 0x9c7a55);
  for (const sx of [-1, 1]) g.box(0.12, 0.5, 16, sx * 2.62, 0.8, 0, hullColor);
  g.box(3.4, 1.0, 3.6, 0, 0.84, -6.4, 0xc9b89a);
  g.box(3.0, 0.7, 2.6, 0, 1.84, -6.4, 0xd8c8aa);
  g.box(0.08, 1.2, 0.08, 0, 2.5, -8.2, DARK);
  const zs = [5.6, 0.4, -4.4];
  for (const z of zs) g.cyl(0.07, 0.1, 10, 0, 0.8, z, 0x5a4030, 4);
  for (const z of zs) g.box(5.4, 0.08, 0.08, 0, 8.2, z, 0x5a4030);
  for (const z of zs) g.box(4.8, 0.22, 0.3, 0, 7.9, z, 0xe8ddc4);
  g.box(0.3, 0.22, 3.2, 0, 0.95, 12, 0x5a4030, { rx: 0.3 });
  g.box(1.0, 0.5, 0.04, 0, 9.4, 5.6, [RED, 0x2f5a8a, 0x2f6f5f, 0xc9a24a][v]);
  return g.build();
}

function junk(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const hull = [[-2.1, -7.6], [-1.3, -7], [1.3, -7], [2.1, -7.6], [2.4, -4], [2.4, 4], [1.9, 7], [0.8, 8], [-0.8, 8], [-1.9, 7], [-2.4, 4], [-2.4, -4]];
  const hullColor = [0x6a3a2a, 0x4a3a2a, 0x7a4a30, 0x3a3a32][v];
  const sail = [0xe0cfa8, 0xd8c090, 0xc9a878, 0xe8dcc0][v];
  g.prism(hull, 1.4, -0.7, hullColor);
  g.box(3.9, 0.1, 13, 0, 0.64, 0, 0x9c7a55);
  g.box(2.4, 0.7, 2.8, 0, 0.72, -4.2, 0xc9b89a);
  g.box(2.8, 0.1, 3.2, 0, 1.42, -4.2, 0x8a5a38);
  for (const z of [2.2, -1.2]) {
    g.cyl(0.08, 0.12, 7.4, 0, 0.7, z, 0x4a3a2a, 4);
    g.box(0.06, 3.2, 2.8, 0.06, 4.4, z, sail);
    for (let i = 0; i < 4; i++) g.box(0.09, 0.06, 2.9, 0.1, 3.1 + i * 0.8, z, 0x5a4030);
  }
  g.box(0.14, 1.2, 0.5, 0, 0.2, -7.2, 0x4a3a2a);
  g.box(0.8, 0.4, 0.04, 0, 6.9, 2.2, [RED, 0xc9a24a, 0x2f5a8a, 0x2f6f5f][v]);
  return g.build();
}

function containerShip(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const hull = [[-3.4, -19], [-2.6, -18.5], [2.6, -18.5], [3.4, -19], [3.9, -15], [3.9, 15], [3.3, 18.6], [2.0, 19.8], [-2.0, 19.8], [-3.3, 18.6], [-3.9, 15], [-3.9, -15]];
  const hullColor = [0x3a3f44, 0x2f3a4a, 0x4a3a32, 0x2f4a44][v];
  const boxes = [[0x8a2f2f, 0x2f5a8a, 0xc9a24a], [0x2f6f5f, 0xd2691e, 0x8a8a84], [0x5a3a6a, 0x2f5a3f, 0xb8862f], [0x2f4f6f, 0xa83f2f, 0xd8c250]][v];
  g.prism(hull, 2.4, -1.2, hullColor);
  g.box(7.6, 0.14, 36, 0, 1.14, 0, 0x8a7a62);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const x = -1.25 + c * 1.25, z = -9 + r * 6;
    g.box(1.1, 0.95, 2.6, x, 1.28, z, boxes[(r + c) % 3]);
  }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const x = -0.65 + c * 1.3, z = -6 + r * 6;
    g.box(1.1, 0.95, 2.6, x, 2.23, z, boxes[(r + c + 1) % 3]);
  }
  g.box(3.6, 3.4, 2.4, 0, 1.28, -15.2, 0xe0dcd0);
  g.box(4.8, 0.9, 1.6, 0, 4.68, -15.2, 0xf0ece0);
  g.box(4.9, 0.14, 1.7, 0, 5.58, -15.2, 0x8a8a84);
  g.box(4.2, 0.4, 1.4, 0, 3.9, -15.2, GLASS);
  g.cyl(0.42, 0.48, 1.5, 0, 5.2, -16.4, 0xb5452f, 6);
  g.box(0.07, 5.5, 0.07, 0, 1.2, 15.5, 0x8a8a84);
  return g.build();
}

function fishingBoat(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const hull = [[-1.0, -2.8], [-0.65, -2.5], [0.65, -2.5], [1.0, -2.8], [1.1, -1], [1.1, 1], [0.9, 2.4], [0.4, 2.9], [-0.4, 2.9], [-0.9, 2.4], [-1.1, 1], [-1.1, -1]];
  const hullColor = [0x2f6f5f, 0x8a2f2f, 0x2f4f6f, 0xe0dcd0][v];
  g.prism(hull, 0.9, -0.45, hullColor);
  g.box(1.8, 0.08, 4.6, 0, 0.43, 0, 0x9c7a55);
  g.box(1.25, 0.8, 1.4, 0, 0.5, -0.7, 0xe0dcd0);
  g.box(1.35, 0.08, 1.5, 0, 1.3, -0.7, 0x8a8a84);
  g.box(0.5, 0.3, 0.05, 0, 0.9, 0.02, GLASS);
  g.cyl(0.045, 0.06, 2.6, 0, 0.5, 0.95, 0x6a6a68, 4);
  g.box(1.2, 0.05, 0.05, 0.1, 2.45, 0.95, 0x6a6a68);
  g.box(0.55, 0.28, 0.4, -0.25, 0.5, 0.2, 0x8a6a48);
  g.box(0.3, 0.18, 0.3, 0.35, 0.5, 0.42, 0xb5452f);
  return g.build();
}

function beachUmbrella(variant = 0) {
  const g = createGeo(), v = v4(variant);
  const canopy = [0xb5452f, 0x2f7a5a, 0x2f5a8a, 0xd8b040][v];
  const cloth = [0xf0e6d2, 0x8fc4d0, 0xe8d0a0, 0xd8e0e8][v];
  g.cyl(0.035, 0.05, 2.2, 0, 0, 0, 0x8a8a84, 4);
  g.cone(1.35, 0.45, 0, 2.0, 0, canopy, 8);
  g.cone(0.09, 0.12, 0, 2.42, 0, GOLD, 4);
  for (const x of [-0.85, 0.85]) {
    g.raw(new g.THREE.BoxGeometry(0.62, 0.08, 1.6), 0x9c7a55, x, 0.3, 0.35, { rz: 0 });
    g.raw(new g.THREE.BoxGeometry(0.62, 0.06, 0.62), cloth, x, 0.42, -0.55, { rx: -0.65 });
    g.box(0.07, 0.3, 0.07, x - 0.24, 0, 0.9, 0x6f5236);
    g.box(0.07, 0.3, 0.07, x + 0.24, 0, 0.9, 0x6f5236);
    g.box(0.07, 0.28, 0.07, x - 0.24, 0, -0.15, 0x6f5236);
    g.box(0.07, 0.28, 0.07, x + 0.24, 0, -0.15, 0x6f5236);
  }
  g.box(0.28, 0.08, 0.28, 0, 0.02, 0.1, 0xe8d0a0);
  return g.build();
}

export const DRESSING = {
  door, doorSteps, shutterWindow, flowerBox, awning, shopSign, lanternString, laundryLine,
  balcony, acUnit, waterTank, roofGarden, solarPanels, satelliteDish, chimneyStack, skylight,
  clutterCrates, bicycle, streetVendorCart, personGroup, rock, dock, crane,
  merchantShip, junk, containerShip, fishingBoat, beachUmbrella,
};
