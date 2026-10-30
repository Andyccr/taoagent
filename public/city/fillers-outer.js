import { createGeo } from './geo.js';

const variantIndex = (variant) => Math.max(0, Math.min(2, variant | 0));
const at = (values, index) => values[Math.max(0, Math.min(values.length - 1, index))];

function warehouse(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const wall = 0xb8ad98;
  const roof = at([0x6f7f8c, 0x9a5b3c, 0x657784], v);
  const rib = at([0x56636e, 0x74442f, 0x4e5e68], v);
  const wallHeight = 2.4 + v * 0.12;
  const width = 6.6;
  const depth = 4.4;
  const roofHeight = 1.0 + v * 0.08;
  const roofDepth = depth + 0.3;

  geo.box(width, wallHeight, depth, 0, 0, 0, wall);
  geo.gable(width + 0.3, roofHeight, roofDepth, 0, wallHeight, 0, roof);

  for (let i = 0; i < 5; i++) {
    const z = -1.65 + i * 0.825;
    const y = wallHeight + roofHeight * (1 - Math.abs(z) / (roofDepth / 2)) + 0.02;
    geo.box(width + 0.34, 0.055, 0.07, 0, y, z, rib);
  }

  geo.box(3.8, 0.3, 0.9, 0, 0, 2.5, 0x8f8778);
  geo.box(1.35, 1.8, 0.08, -1.65, 0.3, 2.23, 0x3b3a36);
  geo.box(1.35, 1.8, 0.08, 1.65, 0.3, 2.23, 0x3b3a36);

  return geo.build();
}

function factory(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const wallHeight = 2.9 + v * 0.15;
  const width = 6.4;
  const depth = 4.2;

  geo.box(width, wallHeight, depth, 0, 0, 0, 0x9b5a43);

  const sawHeight = 0.72 + v * 0.08;
  for (let i = 0; i < 4; i++) {
    const z = -1.55 + i * 1.03;
    geo.gable(width + 0.12, sawHeight, 1.06, 0, wallHeight, z, 0x6d4b42);
  }

  const chimneyHeight = 9 + v;
  geo.cyl(0.34, 0.42, chimneyHeight, 2.55, 0, -1.55, 0x8a4a3a, 8);
  geo.cyl(0.43, 0.43, 0.24, 2.55, chimneyHeight - 1.0, -1.55, 0xd8c9b5, 8);

  for (let i = 0; i < 5; i++) {
    const x = -2.4 + i * 1.2;
    geo.box(0.5, 0.55, 0.08, x, 1.5, 2.13, 0x3d4b55);
  }

  geo.box(0.9, 1.3, 0.08, 0, 0, 2.13, 0x4a332c);

  return geo.build();
}

function silos(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const height = 6 + v * 0.5;
  const radius = 1.0;
  const positions = [-2.15, 0, 2.15];
  const concrete = [0xcfcac0, 0xbab4a8, 0xc6c1b6];

  for (let i = 0; i < 3; i++) {
    geo.cyl(radius, radius, height, positions[i], 0, 0, concrete[(i + v) % 3], 10);
    geo.dome(radius * 1.01, positions[i], height, 0, concrete[(i + v + 1) % 3], 10);
  }

  geo.box(5.0, 0.32, 0.55, 0, height + 0.55, 0, 0x8f918c);
  geo.box(1.3, 1.0, 1.1, 0, 0, 2.2, 0xb6b0a5);
  geo.box(1.5, 0.15, 1.3, 0, 1.0, 2.2, 0x6f7478);
  geo.box(0.45, 0.7, 0.08, 0, 0, 2.76, 0x3b3b3b);

  return geo.build();
}

function crane(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const orange = 0xd9822b;
  const dark = 0x3b3b3b;
  const legHeight = 8.5 + v * 0.4;
  const legX = [-2.0, 2.0];
  const legZ = [-0.8, 0.8];

  for (const x of legX) {
    for (const z of legZ) {
      geo.box(0.32, legHeight, 0.32, x, 0, z, orange);
      geo.box(0.62, 0.24, 0.62, x, 0, z, dark);
    }
  }

  geo.box(4.5, 0.28, 0.3, 0, legHeight, -0.8, orange);
  geo.box(4.5, 0.28, 0.3, 0, legHeight, 0.8, orange);
  geo.box(0.38, 0.4, 8.0, 0, legHeight + 0.2, 1.0, orange);
  geo.box(1.4, 0.7, 0.7, 0, legHeight - 0.2, -2.8, 0x4a4a4a);
  geo.box(0.85, 0.75, 0.8, 1.15, legHeight - 0.55, -0.2, dark);
  geo.box(0.04, 3.2, 0.04, 0, legHeight - 3.0, 4.2, dark);
  geo.box(0.22, 0.22, 0.22, 0, legHeight - 3.22, 4.2, dark);

  return geo.build();
}

function pier(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const wood = at([0x8a6a48, 0x81613f, 0x92704b], v);
  const darkWood = 0x6e5238;

  geo.box(3.0, 0.25, 9.5, 0, 0.15, 1.25, wood);

  for (const x of [-1.15, 1.15]) {
    for (const z of [-2.7, -0.4, 1.9, 4.2]) {
      geo.cyl(0.13, 0.13, 1.9, x, -1.5, z, darkWood, 6);
    }
  }

  geo.cyl(0.16, 0.2, 0.55, -1.25, 0.4, -1.2, 0x4a4a4a, 6);
  geo.cyl(0.16, 0.2, 0.55, 1.25, 0.4, 4.6, 0x4a4a4a, 6);

  geo.box(0.7, 0.6, 0.7, -1.0, 0.4, 2.4, 0x9a7b52);
  geo.box(0.62, 0.5, 0.62, 0.2, 0.4, 3.2, 0x8d704a);
  geo.box(0.55, 0.45, 0.55, -0.9, 0.4, 3.7, 0xa38257);

  geo.box(1.15, 0.45, 2.2, 2.6, -0.15, 2.2, 0x2f5f9e);
  geo.box(0.85, 0.38, 0.7, 2.6, -0.12, 3.55, 0x2f5f9e);
  geo.box(0.65, 0.45, 0.85, 2.6, 0.3, 2.1, 0xf0efe8);
  geo.cyl(0.035, 0.035, 1.1, 2.6, 0.75, 2.1, 0x3b3b3b, 6);

  return geo.build();
}

function farmhouse(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const wall = 0xe2d8c3;
  const roof = at([0x8b4a32, 0x92513a, 0x7f432e], v);
  const houseWidth = 3.3;
  const houseDepth = 2.7;
  const houseHeight = 2.2 + v * 0.08;
  const hx = -0.8;
  const hz = -1.1;

  geo.box(houseWidth, houseHeight, houseDepth, hx, 0, hz, wall);
  geo.gable(houseWidth + 0.4, 1.7, houseDepth + 0.35, hx, houseHeight, hz, roof);
  geo.box(0.32, 1.25, 0.32, -1.9, houseHeight + 0.7, hz, 0x9b5a43);
  geo.box(0.55, 1.2, 0.08, hx, 0, hz + houseDepth / 2 + 0.02, 0x6b4a32);
  geo.box(0.45, 0.45, 0.07, -1.8, 1.0, hz + houseDepth / 2 + 0.03, 0x3d4b55);
  geo.box(0.45, 0.45, 0.07, 0.2, 1.0, hz + houseDepth / 2 + 0.03, 0x3d4b55);

  const frontZ = 2.9;
  const sideX = 3.2;
  const postX = [-3.2, -1.92, -0.64, 0.64, 1.92, 3.2];
  for (const x of postX) geo.box(0.12, 1.05, 0.12, x, 0, frontZ, 0x8c7256);

  for (const x of [-3.2, 3.2]) {
    for (const z of [-2.2, 0.35]) {
      geo.box(0.12, 1.05, 0.12, x, 0, z, 0x8c7256);
    }
  }

  geo.box(6.4, 0.08, 0.08, 0, 0.55, frontZ, 0x8c7256);
  geo.box(6.4, 0.08, 0.08, 0, 0.95, frontZ, 0x8c7256);
  geo.box(0.08, 0.08, 5.1, -sideX, 0.55, 0.35, 0x8c7256);
  geo.box(0.08, 0.08, 5.1, -sideX, 0.95, 0.35, 0x8c7256);
  geo.box(0.08, 0.08, 5.1, sideX, 0.55, 0.35, 0x8c7256);
  geo.box(0.08, 0.08, 5.1, sideX, 0.95, 0.35, 0x8c7256);

  geo.cyl(0.38, 0.38, 0.8, -2.2, 0.1, 1.7, 0xd9c06a, 8, { rz: Math.PI / 2 });
  geo.cyl(0.12, 0.16, 1.1, 2.3, 0, 1.4, 0x7a5a3a, 6);
  geo.sphere(0.9, 2.3, 1.75, 1.4, 0x5d8a3c, 8);

  return geo.build();
}

function barn(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const red = 0xa33b2b;
  const white = 0xe9e2d2;
  const roof = 0x5a5a5a;
  const width = 4.2;
  const depth = 3.5;
  const height = 3.1 + v * 0.15;
  const bx = -0.7;
  const bz = -0.8;

  geo.box(width, height, depth, bx, 0, bz, red);
  geo.gable(width + 0.5, 2.1 + v * 0.1, depth + 0.5, bx, height, bz, roof);

  const frontZ = bz + depth / 2 + 0.03;
  geo.box(1.5, 2.1, 0.1, bx, 0, frontZ, white);
  geo.box(1.28, 1.9, 0.12, bx, 0, frontZ + 0.04, 0x6b3b2d);

  geo.box(0.12, 2.2, 0.12, bx - width / 2 + 0.06, 0, frontZ, white);
  geo.box(0.12, 2.2, 0.12, bx + width / 2 - 0.06, 0, frontZ, white);
  geo.box(width, 0.12, 0.12, bx, height - 0.1, frontZ, white);
  geo.box(1.9, 0.12, 0.12, bx, height * 0.55, frontZ, white);

  geo.cyl(0.75, 0.75, 4.2, 2.45, 0, 0.2, 0xbab4a8, 8);
  geo.dome(0.76, 2.45, 4.2, 0.2, 0x8f8a80, 12);
  geo.box(0.5, 0.7, 0.08, 2.45, 0, 0.96, 0x4a4a4a);

  return geo.build();
}

function cottage(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const wall = at([0xe9e2d2, 0xd8c9a8, 0xc9d3d6], v);
  const roof = at([0x7a4a36, 0x4f5a63, 0x7a4a36], v);
  const hx = -0.7;
  const hz = -0.9;
  const width = 3.5;
  const depth = 3.0;
  const height = 2.6;

  geo.box(7, 0.1, 7, 0, 0, 0, 0x86ad5f);
  geo.box(width, height, depth, hx, 0.1, hz, wall);
  geo.hip(width + 0.55, depth + 0.55, 1.35, hx, height + 0.1, hz, roof, 0);

  const frontZ = hz + depth / 2 + 0.03;
  geo.box(0.6, 1.3, 0.08, hx, 0.1, frontZ, 0x6b4a32);
  geo.box(0.55, 0.55, 0.07, hx - 1.0, 1.3, frontZ + 0.01, 0x3d4b55);
  geo.box(0.55, 0.55, 0.07, hx + 1.0, 1.3, frontZ + 0.01, 0x3d4b55);

  geo.box(0.7, 0.04, 2.6, hx, 0.1, 1.9, 0xcbbfa3);
  geo.box(0.35, 0.45, 1.8, hx - 0.8, 0.1, 1.9, 0x4f7a3a);
  geo.box(0.35, 0.45, 1.8, hx + 0.8, 0.1, 1.9, 0x4f7a3a);

  geo.cyl(0.12, 0.16, 0.9, 2.4, 0.1, -1.8, 0x7a5a3a, 6);
  geo.sphere(0.65, 2.4, 1.1, -1.8, 0x5d8a3c, 8);

  return geo.build();
}

function workshop(variant = 0) {
  const v = variantIndex(variant);
  const geo = createGeo();
  const wall = at([0xd9c7a5, 0xc7b49a, 0xe0d6c4], v);
  const awning = at([0xb5452f, 0x2e6f8e, 0x5f8a3a], v);
  const width = 3.8;
  const depth = 3.6;
  const lowerHeight = 2.6;
  const upperHeight = 2.4;
  const totalHeight = lowerHeight + upperHeight;
  const bx = 0;
  const bz = -0.8;

  geo.box(width, totalHeight, depth, bx, 0, bz, wall);
  geo.box(width + 0.06, 0.12, depth + 0.06, bx, lowerHeight, bz, 0x8f8270);

  const frontZ = bz + depth / 2;
  geo.box(2.8, 1.7, 0.08, bx, 0.4, frontZ + 0.05, 0x33434b);
  geo.box(0.65, 2.0, 0.1, bx - 1.35, 0, frontZ + 0.06, 0x5c4634);
  geo.box(3.1, 0.08, 1.05, bx, 1.95, frontZ + 0.45, awning, { rx: -0.22 });

  for (const x of [-1.2, 0, 1.2]) {
    geo.box(0.55, 0.6, 0.07, x, 3.25, frontZ + 0.05, 0x3d4b55);
  }

  geo.box(3.0, 0.1, 0.7, bx, 2.85, frontZ + 0.35, 0x8f8270);
  geo.box(3.0, 0.5, 0.06, bx, 2.95, frontZ + 0.68, 0x6b6258);
  geo.box(0.06, 0.5, 0.7, bx - 1.47, 2.95, frontZ + 0.35, 0x6b6258);
  geo.box(0.06, 0.5, 0.7, bx + 1.47, 2.95, frontZ + 0.35, 0x6b6258);

  geo.box(width + 0.2, 0.12, depth + 0.2, bx, totalHeight, bz, 0x8b8174);
  geo.cyl(0.55, 0.55, 1.2, 1.0, totalHeight + 0.12, -1.5, 0x6f7f8c, 8);
  geo.cyl(0.58, 0.58, 0.1, 1.0, totalHeight + 1.32, -1.5, 0x56636e, 8);

  return geo.build();
}

export const OUTER_FILLERS = {
  warehouse,
  factory,
  silos,
  crane,
  pier,
  farmhouse,
  barn,
  cottage,
  workshop,
};
