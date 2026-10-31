import { createGeo } from './geo.js';

const TRUNK = 0x6b4a2f, DARKWOOD = 0x5a4030, IRON = 0x3b3a38, STONE = 0x9d9686;
const BRONZE = 0x8c6a3f, GOLD = 0xc9a24a, GLASS = 0x2e4a5e, HAY = 0xc7a857;
const LEAF = [0x5d8a3c, 0x4f7a3a, 0x7a9a48];
const BLOSSOM = [0xe8a8c8, 0xf2c8d8, 0xd98ab0];
const CLOTH = [0xb5452f, 0x2e6f8e, 0x5f8a3a];
const PAINT = [0xb83b30, 0x2f6f9f, 0xd8c250];
const CLAY = [0xb5643c, 0xa95636, 0xc4774a];

function v3(variant) { return Math.abs(Math.round(variant)) % 3; }

function planeTree(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = LEAF[v];
  const th = 1.8 + v * 0.15;
  g.cyl(0.16, 0.24, th, 0, 0, 0, TRUNK, 5);
  g.sphere(1.5 + v * 0.06, 0.1, th + 1.05, 0, c, 6);
  g.sphere(0.95, -0.75, th + 0.55, 0.25, LEAF[(v + 1) % 3], 5);
  return g.build();
}

function cypress(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = LEAF[v];
  g.cyl(0.06, 0.11, 0.5, 0, 0, 0, TRUNK, 4);
  g.cone(0.78, 2.9 + v * 0.2, 0, 0.4, 0, c, 6);
  g.cone(0.56, 2.2, 0, 2.5, 0, c, 6);
  g.cone(0.34, 1.7, 0, 3.9, 0, c, 6);
  return g.build();
}

function pine(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = LEAF[(v + 1) % 3];
  g.cyl(0.12, 0.2, 4.0, 0, 0, 0, TRUNK, 4);
  g.raw(new g.THREE.SphereGeometry(1, 6, 4), c, 0, 4.2, 0, { sx: 2.3 + v * 0.15, sy: 0.52, sz: 2.3 });
  g.raw(new g.THREE.SphereGeometry(1, 4, 4), c, 0.5, 4.75, -0.4, { sx: 1.05, sy: 0.35, sz: 1.05 });
  return g.build();
}

function willow(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = LEAF[v];
  g.cyl(0.13, 0.2, 2.2, 0, 0, 0, TRUNK, 5);
  g.sphere(1.35, 0, 2.9, 0, c, 6);
  const h = [0x6f9a46, 0x5d8a3c, 0x87a856][v];
  g.cone(0.28, 1.5, -0.9, 1.3, 0.3, h, 4, { rz: Math.PI });
  g.cone(0.3, 1.6, 0.85, 1.3, 0.2, h, 4, { rz: Math.PI });
  g.cone(0.26, 1.4, 0.1, 1.2, -0.85, h, 4, { rz: Math.PI });
  g.cone(0.25, 1.35, 0.2, 1.25, 0.8, h, 4, { rz: Math.PI });
  return g.build();
}

function blossom(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = BLOSSOM[v];
  g.cyl(0.12, 0.19, 1.9, 0, 0, 0, TRUNK, 4);
  g.sphere(1.3, 0, 2.9, 0, c, 6);
  g.sphere(0.86, 0.72, 2.5, 0.28, BLOSSOM[(v + 1) % 3], 5);
  return g.build();
}

function palm(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = LEAF[(v + 1) % 3];
  g.cyl(0.13, 0.18, 1.9, 0, 0, 0, TRUNK, 3, { rz: 0.06 });
  g.cyl(0.1, 0.13, 1.9, 0.16, 1.82, 0, TRUNK, 3, { rz: -0.05 });
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    g.box(1.45, 0.05, 0.3, Math.cos(a) * 0.55, 3.68, Math.sin(a) * 0.55, c, { ry: -a, rz: -0.34 });
  }
  return g.build();
}

function poplar(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = LEAF[(v + 1) % 3];
  g.cyl(0.1, 0.16, 2.0, 0, 0, 0, TRUNK, 4);
  g.raw(new g.THREE.SphereGeometry(1, 6, 4), c, 0, 4.3, 0, { sx: 0.72, sy: 2.45 + v * 0.12, sz: 0.72 });
  g.raw(new g.THREE.SphereGeometry(1, 4, 4), c, 0.08, 6.3, 0.05, { sx: 0.42, sy: 0.5, sz: 0.42 });
  return g.build();
}

function bush(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = LEAF[v];
  g.sphere(0.46, -0.32, 0.42, 0.05, c, 4);
  g.sphere(0.4, 0.34, 0.38, 0.1, LEAF[(v + 1) % 3], 4);
  g.sphere(0.36, 0.04, 0.36, -0.34, c, 4);
  g.box(0.16, 0.1, 0.16, 0.3, 0.62, 0.2, BLOSSOM[v]);
  return g.build();
}

function lanternPost(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const arm = v === 1 ? -0.3 : 0.3;
  g.box(0.16, 3.0, 0.16, 0, 0, 0, DARKWOOD);
  g.box(0.7, 0.09, 0.09, arm, 2.62, 0, DARKWOOD);
  g.sphere(0.32, arm * 2, 2.2, 0, [0xc0392b, 0xd44a35, 0xa93226][v], 4);
  g.cone(0.38, 0.16, arm * 2, 2.54, 0, 0x3a2a22, 4);
  return g.build();
}

function modernLamp(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const dir = v === 2 ? -1 : 1;
  const h = 3.4 + v * 0.2;
  g.box(0.28, 0.12, 0.28, 0, 0, 0, 0x4a4a48);
  g.cyl(0.05, 0.07, h, 0, 0.12, 0, 0x6c6c68, 4);
  g.box(1.1, 0.07, 0.09, dir * 0.45, h, 0, 0x6c6c68);
  g.box(0.62, 0.12, 0.24, dir * 0.95, h - 0.08, 0, 0xf4e6b8);
  return g.build();
}

function romanTorch(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  g.box(0.62, 0.16, 0.62, 0, 0, 0, STONE);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    g.box(0.07, 0.72, 0.07, Math.cos(a) * 0.2, 0.16, Math.sin(a) * 0.2, BRONZE, { rz: Math.cos(a) * 0.12, rx: -Math.sin(a) * 0.12 });
  }
  g.raw(new g.THREE.ConeGeometry(0.3, 0.22, 4, 1, true), BRONZE, 0, 0.9, 0);
  g.cone(0.11 + v * 0.015, 0.34, 0, 0.98, 0, [0xe8892e, 0xf0a83a, 0xd9662a][v], 3);
  return g.build();
}

function gasLamp(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const h = 2.8 + v * 0.15;
  g.box(0.4, 0.25, 0.4, 0, 0, 0, IRON);
  g.cyl(0.06, 0.09, h, 0, 0.25, 0, IRON, 4);
  g.box(1.5, 0.07, 0.07, 0, h + 0.2, 0, IRON);
  for (const x of [-0.7, 0, 0.7]) g.cone(0.16, 0.22, x, h + 0.04, 0, 0xf6e2a8, 3);
  return g.build();
}

function marketStall(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = CLOTH[v];
  g.box(1.8, 0.1, 1.1, 0, 0.78, 0, 0x9c7a55);
  g.box(1.6, 0.7, 0.9, 0, 0.1, 0, 0x8a6a48);
  for (const x of [-0.82, 0.82]) for (const z of [-0.48, 0.48]) g.box(0.08, 2.25, 0.08, x, 0, z, DARKWOOD);
  g.box(0.94, 0.08, 1.6, -0.47, 2.25, 0, c, { rx: 0.1 });
  g.box(0.94, 0.08, 1.6, 0.47, 2.25, 0, 0xf0e6d2, { rx: 0.1 });
  g.box(0.45, 0.32, 0.4, -0.45, 0.88, 0.1, CLAY[v]);
  g.box(0.45, 0.32, 0.4, 0.42, 0.88, -0.15, 0x8a6a48);
  return g.build();
}

function handcart(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  g.cyl(0.34, 0.34, 0.09, -0.58, 0.34, 0.15, 0x5a4030, 6, { rz: Math.PI / 2 });
  g.cyl(0.34, 0.34, 0.09, 0.58, 0.34, 0.15, 0x5a4030, 6, { rz: Math.PI / 2 });
  g.box(1.05, 0.5, 1.6, 0, 0.36, -0.1, [0x9c7a55, 0x8a6a48, 0xa8835a][v]);
  g.box(0.08, 0.08, 1.3, -0.36, 0.55, 1.2, DARKWOOD);
  g.box(0.08, 0.08, 1.3, 0.36, 0.55, 1.2, DARKWOOD);
  g.box(0.8, 0.07, 0.07, 0, 0.9, 1.82, DARKWOOD);
  return g.build();
}

function oxcart(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  g.cyl(0.4, 0.4, 0.09, -0.62, 0.4, 0.1, DARKWOOD, 4, { rz: Math.PI / 2 });
  g.cyl(0.4, 0.4, 0.09, 0.62, 0.4, 0.1, DARKWOOD, 4, { rz: Math.PI / 2 });
  g.box(1.15, 0.28, 2.2, 0, 0.52, -0.2, 0x8a6a48);
  g.box(0.08, 0.08, 1.6, -0.4, 0.5, 1.6, DARKWOOD);
  g.box(0.08, 0.08, 1.6, 0.4, 0.5, 1.6, DARKWOOD);
  g.box(0.72, 0.78, 1.5, 0, 0.55, 1.95, [0x8a7355, 0x6f5a42, 0x9a8262][v]);
  g.box(0.46, 0.5, 0.62, 0, 0.92, 2.98, 0x7a6448);
  for (const x of [-0.26, 0.26]) for (const z of [1.35, 2.55]) {
    g.raw(new g.THREE.CylinderGeometry(0.055, 0.07, 0.62, 3, 1, true), 0x5a4a38, x, 0.31, z);
  }
  return g.build();
}

function car(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = PAINT[v];
  for (const x of [-0.86, 0.86]) for (const z of [-1.25, 1.25]) {
    g.raw(new g.THREE.CylinderGeometry(0.3, 0.3, 0.18, 4, 1, true), 0x222222, x, 0.3, z, { rz: Math.PI / 2 });
  }
  g.box(1.75, 0.58, 3.8, 0, 0.18, 0, c);
  g.box(1.5, 0.6, 1.9, 0, 0.74, -0.1, v === 1 ? 0xd8d4ca : c);
  g.box(1.52, 0.34, 1.6, 0, 0.86, -0.1, GLASS);
  g.box(0.32, 0.14, 0.08, -0.55, 0.48, 1.92, 0xf6e6b0);
  g.box(0.32, 0.14, 0.08, 0.55, 0.48, 1.92, 0xf6e6b0);
  return g.build();
}

function bus(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = [0xb83b30, 0x2f7a5a, 0xd8a530][v];
  for (const x of [-1.15, 1.15]) for (const z of [-3.2, 3.2]) {
    g.raw(new g.THREE.CylinderGeometry(0.52, 0.52, 0.24, 4, 1, true), 0x222222, x, 0.52, z, { rz: Math.PI / 2 });
  }
  g.box(2.5, 2.15, 10, 0, 0.42, 0, c);
  g.box(2.52, 0.5, 10, 0, 0.5, 0, 0xe8e2d2);
  g.box(2.53, 0.7, 8.4, 0, 1.72, 0, GLASS);
  g.box(2.3, 0.14, 9.2, 0, 2.57, 0, 0xd8d4ca);
  g.box(2.28, 0.92, 0.08, 0, 1.62, 5.02, GLASS);
  g.box(0.08, 1.35, 1.1, 1.28, 0.45, 2.2, 0x2a2a28);
  return g.build();
}

function fountainSmall(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  g.cyl(1.2, 1.35, 0.45, 0, 0, 0, [0xb2aa98, 0x9d9686, 0xc0b8a6][v], 8);
  g.cyl(1.02, 1.02, 0.04, 0, 0.42, 0, 0x7fb4cc, 7);
  g.cyl(0.22, 0.3, 0.5, 0, 0.45, 0, 0xb2aa98, 5);
  g.cyl(0.04, 0.07, 0.55 + v * 0.08, 0, 0.95, 0, 0x9fc8da, 3);
  g.sphere(0.12, 0, 1.52 + v * 0.08, 0, 0x9fc8da, 4);
  return g.build();
}

function statue(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const body = [BRONZE, 0x8a8a84, 0xd8d2c4][v];
  g.box(0.9, 0.6, 0.9, 0, 0, 0, STONE);
  g.box(0.66, 1.35, 0.66, 0, 0.6, 0, 0xb0a894);
  g.box(0.3, 0.9, 0.26, 0, 1.95, 0, body);
  g.box(0.52, 0.85, 0.3, 0, 2.85, 0, body);
  g.sphere(0.17, 0, 3.84, 0, body, 4);
  g.box(0.12, 0.7, 0.12, -0.34, 2.9, 0, body, { rz: 0.16 });
  g.box(0.12, 0.7, 0.12, 0.34, 2.95, 0.1, body, { rz: -0.3, rx: -0.2 });
  return g.build();
}

function bannerPole(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = [0xb83b30, 0x2f6f9f, 0xc9a24a][v];
  g.box(0.5, 0.25, 0.5, 0, 0, 0, STONE);
  g.cyl(0.06, 0.09, 5.2, 0, 0.25, 0, DARKWOOD, 4);
  g.box(0.95, 0.07, 0.07, 0.1, 5.0, 0, DARKWOOD);
  g.box(0.6, 2.2, 0.04, 0.28, 2.6, 0, c);
  g.box(0.74, 0.05, 0.05, 0.24, 2.5, 0, GOLD);
  g.cone(0.09, 0.22, 0, 5.45, 0, GOLD, 3);
  return g.build();
}

function flagPole(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = CLOTH[v];
  g.cyl(0.18, 0.24, 0.2, 0, 0, 0, STONE, 4);
  g.cyl(0.04, 0.07, 4.8, 0, 0.2, 0, 0x8a8a84, 4);
  g.box(1.2, 0.7, 0.04, 0.62, 4.05, 0, c, { ry: 0.12 });
  g.box(1.2, 0.22, 0.045, 0.62, 3.63, 0, 0xf0e6d2, { ry: 0.12 });
  g.sphere(0.08, 0, 5.04, 0, GOLD, 4);
  return g.build();
}

function fence(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const wood = v === 0, c = wood ? 0x8a6a48 : 0x3a3a38;
  for (const x of [-1, 1]) g.box(wood ? 0.1 : 0.07, 1.1, wood ? 0.1 : 0.07, x, 0, 0, c);
  for (const y of [0.25, 0.62, 0.95]) g.box(2, 0.07, 0.07, 0, y, 0, c);
  for (const x of [-0.72, -0.24, 0.24, 0.72]) g.box(0.05, 0.75, 0.05, x, 0.14, 0, c);
  return g.build();
}

function bollard(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const c = v === 2 ? 0x4a4a48 : STONE;
  g.cyl(0.12, 0.15, 0.75, 0, 0, 0, c, 6);
  g.sphere(0.14, 0, 0.8, 0, c, 4);
  g.cyl(0.2, 0.24, 0.12, 0, 0, 0, v === 2 ? 0x333331 : 0xb0a894, 6);
  return g.build();
}

function kiosk(variant = 0) {
  const g = createGeo();
  const v = v3(variant), c = [0x5f8a5a, 0x8a5a44, 0x3f6a8a][v];
  g.box(2.0, 0.15, 1.4, 0, 0, 0, STONE);
  g.box(1.8, 1.9, 1.2, 0, 0.15, 0, c);
  g.box(2.0, 0.12, 0.5, 0, 0.8, 0.75, 0xe8e2d2);
  g.box(1.4, 0.8, 0.05, 0, 1.15, 0.62, GLASS);
  g.gable(2.2, 0.5, 1.6, 0, 2.05, 0, 0x6a4a32);
  g.box(0.08, 0.8, 0.08, -0.9, 1.0, 0.72, DARKWOOD);
  g.box(0.08, 0.8, 0.08, 0.9, 1.0, 0.72, DARKWOOD);
  g.box(1.0, 0.3, 0.05, 0, 1.9, 0.66, 0xf0e6d2);
  return g.build();
}

function bench(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const wood = [0x8a6a48, 0x6f5236, 0x9a7a52][v];
  const w = 1.7 + (v % 2) * 0.3;
  g.box(w, 0.1, 0.55, 0, 0.45, 0, wood);
  g.box(w, 0.42, 0.09, 0, 0.6, -0.26, wood);
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) g.box(0.1, 0.45, 0.5, x, 0, 0, IRON);
  for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) g.box(0.08, 0.08, 0.55, x, 0.68, 0, IRON);
  g.box(w - 0.1, 0.05, 0.06, 0, 0.56, -0.24, wood);
  return g.build();
}

function umbrellaTable(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  g.cyl(0.55, 0.55, 0.06, 0, 1.0, 0, 0x9c7a55, 6);
  g.cyl(0.06, 0.08, 1.0, 0, 0, 0, IRON, 4);
  g.box(0.5, 0.08, 0.5, 0, 0, 0, IRON);
  g.cyl(0.035, 0.045, 2.2, 0, 0, 0, DARKWOOD, 4);
  g.cone(1.25, 0.55, 0, 2.05, 0, [0xb5452f, 0x2e6f8e, 0xe0b040][v], 6);
  g.box(0.55, 0.46, 0.5, 0.95, 0.04, 0.1, 0x6f5236);
  g.box(0.55, 0.46, 0.5, -0.95, 0.04, -0.1, 0x6f5236);
  return g.build();
}

function haystack(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const c = [HAY, 0xd4b968, 0xb8973f][v];
  g.cyl(0.8, 1.0, 1.2, 0, 0, 0, c, 8);
  g.cone(1.05, 1.2, 0, 1.2, 0, c, 8);
  g.cyl(1.03, 1.03, 0.05, 0, 0.38, 0, 0x8a6a38, 8);
  g.cyl(0.88, 0.88, 0.05, 0, 0.9, 0, 0x8a6a38, 8);
  return g.build();
}

function amphoraStack(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const spots = [[-0.45, 0, 0.05], [0.42, 0, -0.1], [0.0, 0, 0.35]];
  spots.forEach(([x, y, z], i) => {
    const c = CLAY[(v + i) % 3];
    g.sphere(0.26, x, y + 0.28, z, c, 4);
    g.cyl(0.07, 0.1, 0.22, x, y + 0.5, z, c, 3);
  });
  g.box(0.25, 0.06, 0.05, 0.0, 0.55, 0.52, CLAY[v]);
  return g.build();
}

function barrelStack(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const spots = [[-0.38, 0, 0], [0.38, 0, 0.12]];
  spots.forEach(([x, y, z]) => {
    const c = [0x8a6a48, 0x7a5a3a, 0x9a7a52][(v + (x > 0 ? 1 : 0)) % 3];
    g.cyl(0.32, 0.36, 0.75, x, y, z, c, 6);
    g.raw(new g.THREE.CylinderGeometry(0.345, 0.345, 0.06, 6, 1, true), 0x4a4038, x, y + 0.2, z);
    g.raw(new g.THREE.CylinderGeometry(0.345, 0.345, 0.06, 6, 1, true), 0x4a4038, x, y + 0.56, z);
  });
  g.cyl(0.28, 0.31, 0.62, 0.05, 0.02, 0.72, CLAY[v], 6);
  return g.build();
}

function signboard(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const c = [0xb83b30, 0x2f6f9f, 0x3f7a4a][v];
  g.cyl(0.08, 0.1, 3.6, 0, 0, 0, DARKWOOD, 4);
  g.box(0.62, 0.07, 0.07, 0.3, 3.32, 0, DARKWOOD);
  g.box(0.55, 1.8, 0.08, 0.55, 1.35, 0, c);
  g.box(0.65, 0.1, 0.14, 0.55, 3.14, 0, 0x3a2a22);
  g.box(0.65, 0.1, 0.14, 0.55, 1.27, 0, 0x3a2a22);
  g.box(0.4, 0.09, 0.09, 0.55, 2.2, 0, GOLD);
  g.box(0.4, 0.09, 0.09, 0.55, 1.75, 0, GOLD);
  return g.build();
}

function sampan(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const hull = [[-2.2, -0.5], [-1.6, -0.7], [1.6, -0.7], [2.2, -0.5], [2.4, 0], [2.2, 0.5], [1.6, 0.7], [-1.6, 0.7], [-2.2, 0.5], [-2.4, 0]];
  g.prism(hull, 0.7, -0.35, [0x6a4a32, 0x7a5a3a, 0x5a4030][v]);
  g.box(2.8, 0.08, 1.1, 0, 0.33, 0, 0x9c7a55);
  g.box(2.2, 0.06, 0.34, 0, 1.15, -0.45, [0xc9a24a, 0xb8973f, 0xd8b860][v], { rx: 0.5 });
  g.box(2.2, 0.06, 0.34, 0, 1.35, 0, 0xc9a24a);
  g.box(2.2, 0.06, 0.34, 0, 1.15, 0.45, [0xc9a24a, 0xb8973f, 0xd8b860][v], { rx: -0.5 });
  for (const x of [-1.0, 1.0]) g.box(0.06, 0.85, 0.06, x, 0.35, 0.4, DARKWOOD);
  g.box(0.06, 0.06, 2.2, -1.9, 0.55, 0.7, DARKWOOD, { ry: 0.5 });
  return g.build();
}

function galley(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const hull = [[-3.0, -0.5], [-2.4, -0.95], [2.2, -0.95], [3.0, -0.5], [3.4, 0], [3.0, 0.5], [2.2, 0.95], [-2.4, 0.95], [-3.0, 0.5], [-3.4, 0]];
  g.prism(hull, 0.9, -0.45, [0x7a5a3a, 0x6a4a32, 0x8a6a48][v]);
  g.box(4.8, 0.1, 1.7, 0, 0.45, 0, 0x9c7a55);
  g.cyl(0.09, 0.12, 4.2, 0, 0.55, 0, DARKWOOD, 4);
  g.box(2.8, 0.08, 0.08, 0, 4.3, 0, DARKWOOD);
  g.box(2.6, 1.7, 0.05, 0, 3.0, 0.1, [0xe8e2d2, 0xd9c8a0, 0xc9b8a0][v]);
  for (let i = 0; i < 5; i++) {
    const x = -1.6 + i * 0.8;
    g.box(0.07, 0.07, 2.0, x, 0.62, 1.5, 0x5a4030, { rx: 0.16 });
  }
  return g.build();
}

function sailboat(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const hull = [[-2.0, -0.55], [-1.2, -0.8], [1.2, -0.8], [2.0, -0.55], [2.3, 0], [2.0, 0.55], [1.2, 0.8], [-1.2, 0.8], [-2.0, 0.55], [-2.3, 0]];
  g.prism(hull, 0.65, -0.3, 0xe8e4da);
  g.box(2.8, 0.08, 1.2, 0, 0.35, 0, 0xc9a24a);
  g.box(0.4, 0.45, 0.6, 0, 0.42, -0.1, 0x8a8a84);
  g.cyl(0.04, 0.06, 5.2, 0, 0.4, 0.1, 0x8a8a84, 4);
  g.box(1.5, 0.07, 0.07, 0.1, 3.2, 0.1, 0x8a8a84);
  g.box(1.35, 3.0, 0.04, -0.5, 1.5, 0.1, [0xf0e6d2, 0xe8c8a0, 0xd8e0e8][v], { rz: -0.1 });
  g.box(0.8, 2.2, 0.04, 1.05, 2.2, 0.08, 0xf0e6d2, { rz: 0.16 });
  return g.build();
}

function barge(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const hull = [[-4.0, -1.1], [-3.2, -1.4], [3.2, -1.4], [4.0, -1.1], [4.2, 0], [4.0, 1.1], [3.2, 1.4], [-3.2, 1.4], [-4.0, 1.1], [-4.2, 0]];
  g.prism(hull, 0.55, -0.28, 0x5a5a58);
  g.box(7.4, 0.1, 2.4, 0, 0.27, 0, 0x8a7a62);
  g.box(1.4, 1.1, 1.6, -2.6, 0.35, 0, 0xd8d2c4);
  g.box(0.9, 0.5, 0.7, -2.6, 1.45, 0, 0x3f6a8a);
  for (let i = 0; i < 4; i++) {
    const x = 0.2 + (i % 2) * 1.3, z = i < 2 ? -0.6 : 0.65;
    g.box(1.1, 0.75, 0.9, x, 0.35, z, [0x9c7a55, 0x8a6a48, 0xa8835a][(v + i) % 3]);
  }
  g.box(0.7, 0.4, 0.12, -3.9, 0.4, 0, 0x3a3a38);
  return g.build();
}

function ferry(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const hull = [[-6.5, -1.2], [-5.6, -1.7], [5.6, -1.7], [6.5, -1.2], [7.0, 0], [6.5, 1.2], [5.6, 1.7], [-5.6, 1.7], [-6.5, 1.2], [-7.0, 0]];
  g.prism(hull, 0.9, -0.45, [0x2f4f6f, 0x8a2f2f, 0x2f6f5f][v]);
  g.box(11, 0.1, 3.0, 0, 0.45, 0, 0xc9c1b1);
  g.box(6.5, 1.4, 2.6, 0, 0.55, 0, 0xe8e2d2);
  g.box(5.2, 1.1, 2.1, 0, 1.95, 0, 0xf0ece0);
  g.box(6.6, 0.5, 2.65, 0, 1.15, 0, GLASS);
  g.box(5.3, 0.45, 2.15, 0, 2.5, 0, GLASS);
  g.box(5.4, 0.12, 2.3, 0, 3.05, 0, 0xd8d4ca);
  g.cyl(0.05, 0.07, 2.4, 0, 3.17, 0, 0x8a8a84, 4);
  g.cyl(0.2, 0.26, 0.9, 0, 3.2, -0.6, [0x2a2a28, 0x3a3a38, 0x8a2f2f][v], 4);
  return g.build();
}

function person(variant = 0) {
  const g = createGeo();
  const v = v3(variant);
  const pants = [0x3f4a5e, 0x5a4a3a, 0x2f3a2f][v];
  const shirt = [0xb5452f, 0x2e6f8e, 0xd8c250][v];
  const skin = [0xc9986a, 0x9a6a44, 0xe0b088][v];
  g.box(0.26, 0.72, 0.2, 0, 0, 0, pants);
  g.box(0.42, 0.65, 0.24, 0, 0.72, 0, shirt);
  g.raw(new g.THREE.SphereGeometry(0.12, 4, 3), skin, 0, 1.55, 0);
  return g.build();
}

export const STREET_PROPS = {
  planeTree, cypress, pine, willow, blossom, palm, poplar, bush,
  lanternPost, modernLamp, romanTorch, gasLamp,
  marketStall, handcart, oxcart, car, bus, fountainSmall, statue, bannerPole, flagPole, fence, bollard, kiosk, bench, umbrellaTable, haystack, amphoraStack, barrelStack, signboard,
  sampan, galley, sailboat, barge, ferry,
  person,
};
