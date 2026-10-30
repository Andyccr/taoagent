import { makeKit, textTexture, THREE } from './kit.js';

export function buildGreekTemple(opts = {}) {
  const kit = makeKit(opts.shadows !== false);
  const group = new THREE.Group();
  const accent = opts.color || '#b08a3e';

  const marble = kit.mat(0xf2efe6, { roughness: 0.8 });
  const wall = kit.mat(0xe6e1d3, { roughness: 0.9 });
  const col = kit.mat(0xf2efe6, { roughness: 0.75, flatShading: true });
  const roofMat = kit.mat(0xb0603c, { roughness: 0.92, flatShading: true });
  const accentMat = kit.mat(accent, { roughness: 0.8 });
  const winMat = kit.mat(0x3a4150, { emissive: 0x000000, roughness: 0.55, metalness: 0.1 });
  const dark = kit.mat(0x241f1a, { roughness: 1 });
  const bronze = kit.mat(0x7a5a32, { metalness: 0.45, roughness: 0.55 });
  const lanternMat = kit.mat(0x6b5a3a, { emissive: 0x000000, roughness: 0.7, metalness: 0.15 });
  const windowMats = [winMat];

  const baseTop = 0.66;
  const friezeY = 3.51;
  const roofBase = friezeY + 0.34;
  const roofY = roofBase + 1.15;

  kit.box(group, 7.2, 0.22, 7.0, marble, 0, 0, 0);
  kit.box(group, 6.8, 0.22, 6.6, marble, 0, 0.22, 0);
  kit.box(group, 6.4, 0.22, 6.2, marble, 0, 0.44, 0);

  const h = 2.9;
  kit.box(group, 4.6, h, 0.2, wall, 0, baseTop, -2.4);
  kit.box(group, 0.2, h, 3.8, wall, -2.2, baseTop, -0.6);
  kit.box(group, 0.2, h, 3.8, wall, 2.2, baseTop, -0.6);
  kit.box(group, 1.4, h, 0.2, wall, -1.6, baseTop, 1.2);
  kit.box(group, 1.4, h, 0.2, wall, 1.6, baseTop, 1.2);
  kit.box(group, 1.8, 0.3, 0.2, wall, 0, baseTop + 2.6, 1.2);

  kit.box(group, 1.8, 2.6, 0.08, dark, 0, baseTop, 1.16);

  kit.box(group, 0.1, 2.72, 0.14, accentMat, -0.95, baseTop, 1.31);
  kit.box(group, 0.1, 2.72, 0.14, accentMat, 0.95, baseTop, 1.31);
  kit.box(group, 2.0, 0.12, 0.14, accentMat, 0, baseTop + 2.6, 1.31);

  for (const s of [-1, 1]) {
    kit.box(group, 0.06, 1.2, 0.55, winMat, 2.32 * s, 1.9, 0.4);
    kit.box(group, 0.06, 1.2, 0.55, winMat, 2.32 * s, 1.9, -1.4);
    kit.box(group, 0.5, 1.2, 0.06, winMat, 1.55 * s, 1.6, 1.31);
  }

  const column = (x, z) => {
    kit.box(group, 0.52, 0.14, 0.52, marble, x, baseTop, z);
    kit.cyl(group, 0.19, 0.22, 2.55, col, x, baseTop + 0.14, z, 16);
    kit.box(group, 0.52, 0.16, 0.52, marble, x, baseTop + 2.69, z);
  };

  for (const x of [-2.8, -1.68, -0.56, 0.56, 1.68, 2.8]) column(x, 2.4);
  for (const z of [1.0, -1.4]) {
    column(-2.85, z);
    column(2.85, z);
  }

  kit.box(group, 6.4, 0.34, 5.6, accentMat, 0, friezeY, -0.1);

  const tri = new THREE.Shape();
  tri.moveTo(-3.2, 0);
  tri.lineTo(3.2, 0);
  tri.lineTo(0, 1.15);
  tri.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: 5.6, bevelEnabled: false });
  kit.add(group, roofGeo, roofMat, 0, roofBase, -2.9);

  const pedGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.07, bevelEnabled: false });
  kit.add(group, pedGeo, marble, 0, roofBase, 2.71);

  kit.box(group, 0.48, 1.05, 0.04, accentMat, 1.28, 2.2, 1.35);
  kit.box(group, 0.58, 0.06, 0.06, accentMat, 1.28, 3.22, 1.35);

  const gate = new THREE.Group();
  gate.position.set(0, baseTop, 1.34);
  for (const x of [-0.72, -0.36, 0, 0.36, 0.72]) {
    kit.box(gate, 0.055, 2.55, 0.055, bronze, x, 0, 0);
  }
  kit.box(gate, 1.62, 0.07, 0.06, bronze, 0, 0.55, 0);
  kit.box(gate, 1.62, 0.07, 0.06, bronze, 0, 1.95, 0);
  gate.visible = false;
  group.add(gate);

  const lantern = new THREE.Group();
  lantern.position.set(-1.25, baseTop, 2.55);
  kit.box(lantern, 0.34, 0.55, 0.34, bronze, 0, 0, 0);
  kit.cyl(lantern, 0.24, 0.16, 0.3, lanternMat, 0, 0.55, 0, 12);
  group.add(lantern);

  return {
    group,
    porch: new THREE.Vector3(0, baseTop, 2.95),
    roofY,
    windowMats,
    lantern,
    lanternMat,
    gate,
    mats: kit.mats,
    meshes: kit.meshes,
    height: roofY,
  };
}

