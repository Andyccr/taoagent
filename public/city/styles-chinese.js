import { makeKit, textTexture, THREE } from './kit.js';

export function buildChinese(opts = {}) {
  const accent = opts.color || '#c8402a';
  const kit = makeKit(opts.shadows !== false);
  const group = new THREE.Group();

  const marble = kit.mat(0xe9e5dc, { roughness: 0.92 });
  const marbleTrim = kit.mat(0xd4cec0, { roughness: 0.9 });
  const red = kit.mat(0xb23327, { roughness: 0.82 });
  const redDeep = kit.mat(0x8f241c, { roughness: 0.85 });
  const roofGold = kit.mat(0xe0b23a, { roughness: 0.5, metalness: 0.22, flatShading: true });
  const gold = kit.mat(0xd8a92f, { roughness: 0.42, metalness: 0.45 });
  const wood = kit.mat(0x6b3a22, { roughness: 0.85 });
  const doorMat = kit.mat(0x9e2b1e, { roughness: 0.8 });
  const studMat = kit.mat(0xe8c15a, { roughness: 0.35, metalness: 0.6 });
  const accentMat = kit.mat(accent, { roughness: 0.78 });
  const dark = kit.mat(0x1e1611, { roughness: 0.95 });
  const windowMat = kit.mat(0x3a4150, { roughness: 0.55, emissive: 0x000000 });
  const lanternMat = kit.mat(0x8a2a20, { roughness: 0.7, emissive: 0x000000 });
  const windowMats = [windowMat];

  const floorY = 0.6;
  const wallTop = 3.4;
  const doorW = 1.7;
  const doorH = 2.6;
  const hallW = 4.2;
  const hallD = 3.4;
  const wallT = 0.16;
  const frontZ = hallD / 2;

  // marble platform + three front steps
  kit.box(group, 6.4, 0.5, 5.6, marble, 0, 0, 0);
  kit.box(group, 6.6, 0.1, 5.8, marbleTrim, 0, 0.5, 0);
  const stepW = [4.0, 3.8, 3.6];
  for (let i = 0; i < 3; i++) {
    kit.box(group, stepW[i], 0.2 * (i + 1), 0.3, i % 2 ? marble : marbleTrim, 0, 0, 3.45 - i * 0.3);
  }

  // red walls
  kit.box(group, hallW, wallTop - floorY, wallT, red, 0, floorY, -frontZ);
  kit.box(group, wallT, wallTop - floorY, hallD, red, -hallW / 2, floorY, 0);
  kit.box(group, wallT, wallTop - floorY, hallD, red, hallW / 2, floorY, 0);
  const sidePanelW = (hallW - doorW) / 2;
  const sidePanelX = doorW / 2 + sidePanelW / 2;
  kit.box(group, sidePanelW, wallTop - floorY, wallT, red, -sidePanelX, floorY, frontZ);
  kit.box(group, sidePanelW, wallTop - floorY, wallT, red, sidePanelX, floorY, frontZ);
  kit.box(group, doorW + 0.4, wallTop - (floorY + doorH), wallT, red, 0, floorY + doorH, frontZ);

  // dark interior + deep doorway recess
  kit.box(group, hallW - 0.3, 0.05, hallD - 0.3, dark, 0, floorY + 0.01, 0);
  kit.box(group, doorW - 0.06, doorH, 0.06, dark, 0, floorY, frontZ - 0.5);

  // red columns (four along the front veranda, two at the rear)
  const colH = wallTop - floorY;
  for (const x of [-2.4, -1.0, 1.0, 2.4]) {
    kit.cyl(group, 0.13, 0.14, colH, red, x, floorY, 2.5, 12);
    kit.cyl(group, 0.18, 0.2, 0.12, gold, x, floorY, 2.5, 12);
  }
  kit.cyl(group, 0.13, 0.14, colH, red, -2.0, floorY, -1.6, 12);
  kit.cyl(group, 0.13, 0.14, colH, red, 2.0, floorY, -1.6, 12);

  // lintel beam over the veranda
  kit.box(group, 5.0, 0.3, 0.22, redDeep, 0, 3.1, 2.5);
  kit.box(group, 5.0, 0.06, 0.26, gold, 0, 3.02, 2.5);

  // lattice windows either side of the doorway
  for (const sx of [-1, 1]) {
    const wx = sx * sidePanelX;
    kit.box(group, 0.82, 1.12, 0.06, windowMat, wx, 1.28, frontZ - 0.02);
    for (const ox of [-0.2, 0.2]) kit.box(group, 0.05, 1.12, 0.05, wood, wx + ox, 1.28, frontZ + 0.03);
    for (const oy of [0.34, 0.74]) kit.box(group, 0.82, 0.05, 0.05, wood, wx, 1.28 + oy, frontZ + 0.03);
  }

  // golden door frame
  kit.box(group, 0.12, doorH + 0.1, 0.24, gold, -doorW / 2 - 0.06, floorY, frontZ);
  kit.box(group, 0.12, doorH + 0.1, 0.24, gold, doorW / 2 + 0.06, floorY, frontZ);
  kit.box(group, doorW + 0.3, 0.12, 0.24, gold, 0, floorY + doorH, frontZ);

  // accent banner hanging from the front eave
  kit.box(group, 0.55, 0.07, 0.07, gold, 1.85, 2.98, 2.62);
  kit.box(group, 0.46, 1.3, 0.04, accentMat, 1.85, 1.68, 2.62);

  // red round lantern at front-left eave
  const lantern = new THREE.Group();
  kit.cyl(lantern, 0.02, 0.02, 0.38, dark, -2.4, 2.72, 2.62, 6);
  const lanternBody = kit.add(lantern, new THREE.SphereGeometry(0.2, 14, 10), lanternMat, -2.4, 2.5, 2.62);
  lanternBody.scale.set(1, 0.82, 1);
  kit.cyl(lantern, 0.11, 0.11, 0.06, gold, -2.4, 2.66, 2.62, 10);
  kit.cyl(lantern, 0.09, 0.09, 0.05, gold, -2.4, 2.29, 2.62, 10);
  kit.cyl(lantern, 0.02, 0.02, 0.16, accentMat, -2.4, 2.13, 2.62, 6);
  group.add(lantern);

  // closed double doors with golden studs (hidden by default)
  const gate = new THREE.Group();
  const panelW = doorW / 2 - 0.03;
  const studGeo = new THREE.SphereGeometry(0.045, 8, 6);
  for (const sx of [-1, 1]) {
    const px = sx * (panelW / 2 + 0.01);
    kit.box(gate, panelW, doorH - 0.08, 0.08, doorMat, px, floorY + 0.04, frontZ + 0.02);
    for (const ox of [-0.16, 0.16]) {
      for (const oy of [0.55, 2.0]) {
        kit.add(gate, studGeo, studMat, px + ox, floorY + 0.04 + oy, frontZ + 0.08);
      }
    }
  }
  group.add(gate);
  gate.visible = false;

  // lower glazed eave (hip roof)
  const lowerHalf = 2.9;
  const lowerH = 0.85;
  const lower = kit.add(group, new THREE.ConeGeometry(lowerHalf * Math.SQRT2, lowerH, 4, 1), roofGold, 0, 3.4 + lowerH / 2, 0);
  lower.rotation.y = Math.PI / 4;

  // upper storey drum + golden band
  kit.box(group, 2.1, 0.9, 1.8, redDeep, 0, 3.6, 0);
  kit.box(group, 2.2, 0.1, 1.9, gold, 0, 4.36, 0);

  // upper glazed eave
  const upperHalf = 2.4;
  const upperH = 1.0;
  const upper = kit.add(group, new THREE.ConeGeometry(upperHalf * Math.SQRT2, upperH, 4, 1), roofGold, 0, 4.5 + upperH / 2, 0);
  upper.rotation.y = Math.PI / 4;

  // upturned corners
  const eaveArms = (half, y, len) => {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(sx * half * 0.95, y, sz * half * 0.95);
        pivot.rotation.y = Math.atan2(-sz, sx);
        const arm = kit.box(pivot, len, 0.09, 0.2, gold, len * 0.36, -0.045, 0);
        arm.rotation.z = 0.5;
        group.add(pivot);
      }
    }
  };
  eaveArms(lowerHalf, 3.46, 0.8);
  eaveArms(upperHalf, 4.56, 0.6);

  // ridge ornaments + finial
  kit.box(group, 0.85, 0.1, 0.16, gold, 0, 5.3, 0);
  kit.add(group, new THREE.SphereGeometry(0.09, 10, 8), gold, -0.44, 5.38, 0);
  kit.add(group, new THREE.SphereGeometry(0.09, 10, 8), gold, 0.44, 5.38, 0);
  kit.cyl(group, 0.07, 0.1, 0.32, gold, 0, 5.4, 0, 10);
  kit.add(group, new THREE.SphereGeometry(0.13, 12, 10), gold, 0, 5.8, 0);
  kit.add(group, new THREE.ConeGeometry(0.075, 0.22, 10), gold, 0, 5.98, 0);

  const roofY = 6.1;

  return {
    group,
    porch: new THREE.Vector3(0, floorY, 2.55),
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

export { buildImperialHall } from './styles-hall.js';
