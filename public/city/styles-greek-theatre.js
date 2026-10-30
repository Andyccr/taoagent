import { makeKit, textTexture, THREE } from './kit.js';

export function buildGreekTheatre(opts = {}) {
  const kit = makeKit(opts.shadows !== false);
  const accent = opts.color || '#b5651d';
  const group = new THREE.Group();

  const cream = kit.mat(0xf2efe6, { roughness: 0.8 });
  const stone = kit.mat(0xe6e1d3, { roughness: 0.85 });
  const accentMat = kit.mat(accent, { roughness: 0.72 });
  const bronze = kit.mat(0x7a5a32, { roughness: 0.55, metalness: 0.35 });
  const dark = kit.mat(0x171512, { roughness: 1 });
  const wood = kit.mat(0x5a3d2b, { roughness: 0.85 });
  const windowMat = kit.mat(0x3a4150, { roughness: 0.35, metalness: 0.08, emissive: 0x000000 });
  const lanternMat = kit.mat(0x6b5a3a, { roughness: 0.5, metalness: 0.15, emissive: 0x000000 });
  const windowMats = [windowMat];

  const baseZ = 0.35;

  kit.cyl(group, 1.7, 1.7, 0.06, cream, 0, 0, baseZ, 32);
  const orchestraRim = kit.add(
    group,
    new THREE.TorusGeometry(1.7, 0.05, 6, 40),
    stone,
    0,
    0.06,
    baseZ
  );
  orchestraRim.rotation.x = Math.PI / 2;

  const ringSlab = (inner, outer, h, y, m) => {
    const s = new THREE.Shape();
    s.moveTo(outer, 0);
    s.absarc(0, 0, outer, 0, Math.PI, false);
    s.lineTo(-inner, 0);
    s.absarc(0, 0, inner, Math.PI, 0, true);
    s.lineTo(outer, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 28 });
    const mesh = kit.add(group, g, m, 0, y, baseZ);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  };

  for (let i = 0; i < 5; i++) {
    const inner = 1.6 + i * 0.36;
    ringSlab(inner, inner + 0.4, 0.32, i * 0.3, i % 2 ? stone : cream);
  }

  kit.box(group, 2.0, 2.9, 0.3, cream, -1.9, 0, 2.25);
  kit.box(group, 2.0, 2.9, 0.3, cream, 1.9, 0, 2.25);
  kit.box(group, 1.8, 0.28, 0.3, stone, 0, 2.62, 2.25);
  kit.box(group, 1.78, 2.62, 0.05, dark, 0, 0, 2.125);

  [-2.45, -1.35, 1.35, 2.45].forEach((x) => {
    kit.box(group, 0.2, 0.2, 0.05, windowMat, x, 1.75, 2.405);
  });

  [-2.7, -1.75, -1.0, 1.0, 1.75, 2.7].forEach((x) => {
    kit.cyl(group, 0.22, 0.26, 0.14, stone, x, 0, 3.0, 10);
    kit.cyl(group, 0.15, 0.18, 2.5, cream, x, 0.14, 3.0, 10);
    kit.box(group, 0.46, 0.16, 0.46, stone, x, 2.64, 3.0);
  });

  kit.box(group, 5.9, 0.42, 0.55, cream, 0, 2.8, 3.0);
  kit.box(group, 5.55, 0.16, 0.06, accentMat, 0, 2.94, 3.3);

  const pedimentShape = new THREE.Shape();
  pedimentShape.moveTo(-2.95, 0);
  pedimentShape.lineTo(2.95, 0);
  pedimentShape.lineTo(0, 0.82);
  pedimentShape.lineTo(-2.95, 0);
  const pedimentGeo = new THREE.ExtrudeGeometry(pedimentShape, {
    depth: 0.45,
    bevelEnabled: false,
  });
  kit.add(group, pedimentGeo, cream, 0, 3.22, 2.8);

  const lantern = new THREE.Group();
  lantern.position.set(-3.2, 0, 3.05);
  group.add(lantern);
  kit.cyl(lantern, 0.24, 0.3, 0.18, bronze, 0, 0, 0, 10);
  kit.cyl(lantern, 0.1, 0.12, 0.45, bronze, 0, 0.18, 0, 8);
  kit.cyl(lantern, 0.3, 0.16, 0.2, bronze, 0, 0.63, 0, 10);
  kit.cyl(lantern, 0.18, 0.16, 0.28, lanternMat, 0, 0.78, 0, 8);
  kit.cyl(lantern, 0.12, 0.2, 0.07, bronze, 0, 1.06, 0, 10);

  const gate = new THREE.Group();
  gate.position.set(0, 0, 2.44);
  group.add(gate);
  kit.box(gate, 0.84, 2.58, 0.08, wood, -0.44, 0, 0);
  kit.box(gate, 0.84, 2.58, 0.08, wood, 0.44, 0, 0);
  kit.box(gate, 0.07, 0.1, 0.05, accentMat, -0.22, 1.25, 0.06);
  kit.box(gate, 0.07, 0.1, 0.05, accentMat, 0.22, 1.25, 0.06);
  gate.visible = false;

  const roofY = 4.04;

  return {
    group,
    porch: new THREE.Vector3(0, 0, 2.9),
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

