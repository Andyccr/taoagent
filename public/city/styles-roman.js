import { makeKit, textTexture, THREE } from './kit.js';

function romanMats(kit, accent) {
  return {
    stone: kit.mat(0xe9dcc3, { roughness: 0.9 }),
    stoneDark: kit.mat(0xd8c7a6, { roughness: 0.9 }),
    roof: kit.mat(0xb5563a, { roughness: 0.92 }),
    accent: kit.mat(accent, { roughness: 0.8 }),
    wood: kit.mat(0x6b4a2f, { roughness: 0.95 }),
    iron: kit.mat(0x2f2a26, { roughness: 0.55, metalness: 0.45 }),
    recess: kit.mat(0x1d1812, { roughness: 1 }),
    window: kit.mat(0x3a4150, { roughness: 0.45 }),
    bronze: kit.mat(0x7a5a2e, { roughness: 0.5, metalness: 0.6 }),
    lamp: kit.mat(0x6b5a3a, { roughness: 0.75 }),
    dome: kit.mat(0xa9a9a0, { roughness: 0.55, metalness: 0.25 }),
  };
}

function archShape(w, straightH) {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, straightH);
  s.absarc(0, straightH, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}

function archPanel(kit, parent, mat, w, straightH, depth, x, yBottom, z) {
  const geo = new THREE.ExtrudeGeometry(archShape(w, straightH), { depth, bevelEnabled: false });
  return kit.add(parent, geo, mat, x, yBottom, z);
}

function archTrim(kit, parent, mat, w, straightH, tube, x, yBottom, z) {
  const r = w / 2;
  kit.add(parent, new THREE.TorusGeometry(r, tube, 8, 20, Math.PI), mat, x, yBottom + straightH, z);
  kit.box(parent, tube * 2, straightH, tube * 2, mat, x - r, yBottom, z);
  kit.box(parent, tube * 2, straightH, tube * 2, mat, x + r, yBottom, z);
}

function pitchedRoof(kit, parent, mat, w, d, rise, x, yBase, z, overhang = 0.2) {
  const halfD = d / 2 + overhang;
  const len = Math.sqrt(halfD * halfD + rise * rise);
  const ang = Math.atan2(rise, halfD);
  const geo = new THREE.BoxGeometry(w + overhang * 2, 0.16, len);
  const a = kit.add(parent, geo, mat, x, yBase + rise / 2, z + halfD / 2);
  a.rotation.x = ang;
  const b = kit.add(parent, geo, mat, x, yBase + rise / 2, z - halfD / 2);
  b.rotation.x = -ang;
  kit.box(parent, w + overhang * 2, 0.12, 0.26, mat, x, yBase + rise - 0.04, z);
}

function makeLantern(kit, parent, x, y, z, M) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  kit.cyl(g, 0.06, 0.09, 1.55, M.bronze, 0, 0, 0, 8);
  kit.box(g, 0.55, 0.06, 0.06, M.bronze, 0.22, 1.5, 0);
  kit.cyl(g, 0.02, 0.02, 0.08, M.bronze, 0.44, 1.42, 0, 6);
  kit.cyl(g, 0.19, 0.14, 0.1, M.bronze, 0.44, 1.34, 0, 10);
  kit.cyl(g, 0.15, 0.19, 0.3, M.lamp, 0.44, 1.04, 0, 10);
  kit.cyl(g, 0.11, 0.15, 0.1, M.bronze, 0.44, 0.94, 0, 10);
  return g;
}

function makeGate(kit, parent, w, h, x, y, z, M) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const pw = w / 2 - 0.02;
  kit.box(g, pw, h, 0.12, M.wood, -w / 4, 0, 0);
  kit.box(g, pw, h, 0.12, M.wood, w / 4, 0, 0);
  kit.box(g, 0.06, h * 0.9, 0.14, M.iron, -0.04, 0.05, 0.02);
  kit.box(g, 0.06, h * 0.9, 0.14, M.iron, 0.04, 0.05, 0.02);
  for (const yy of [h * 0.2, h * 0.5, h * 0.8]) {
    kit.box(g, w - 0.03, 0.07, 0.16, M.iron, 0, yy, 0.02);
  }
  kit.add(g, new THREE.TorusGeometry(0.075, 0.018, 6, 12), M.iron, -0.12, h * 0.5, 0.09);
  kit.add(g, new THREE.TorusGeometry(0.075, 0.018, 6, 12), M.iron, 0.12, h * 0.5, 0.09);
  g.visible = false;
  return g;
}

function buildDomedWorkshop(kit, M) {
  const g = new THREE.Group();
  const windowMat = M.window;

  kit.cyl(g, 3.0, 3.0, 0.3, M.stoneDark, 0, 0, -0.2, 32);
  kit.box(g, 2.6, 0.15, 0.6, M.stone, 0, 0, 3.0);
  kit.box(g, 2.2, 0.15, 0.6, M.stone, 0, 0.15, 2.9);

  kit.cyl(g, 1.9, 1.95, 2.6, M.stone, 0, 0.3, -0.4, 28);

  const cornice = kit.add(g, new THREE.TorusGeometry(1.93, 0.07, 8, 32), M.stoneDark, 0, 2.9, -0.4);
  cornice.rotation.x = Math.PI / 2;

  kit.add(g, new THREE.SphereGeometry(1.95, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.dome, 0, 2.9, -0.4);
  kit.add(g, new THREE.SphereGeometry(0.12, 8, 6), M.bronze, 0, 4.85, -0.4);

  for (const cx of [-1.65, -0.85, 0.85, 1.65]) {
    kit.box(g, 0.42, 0.12, 0.42, M.stoneDark, cx, 0.3, 2.35);
    kit.cyl(g, 0.15, 0.18, 2.4, M.stone, cx, 0.3, 2.35, 12);
    kit.box(g, 0.42, 0.12, 0.42, M.stoneDark, cx, 2.58, 2.35);
  }

  kit.box(g, 3.9, 0.32, 1.2, M.stone, 0, 2.7, 2.0);

  const ped = new THREE.Shape();
  ped.moveTo(-1.95, 0);
  ped.lineTo(1.95, 0);
  ped.lineTo(0, 0.9);
  ped.lineTo(-1.95, 0);
  kit.add(g, new THREE.ExtrudeGeometry(ped, { depth: 1.1, bevelEnabled: false }), M.stone, 0, 3.02, 1.45);

  archPanel(kit, g, M.recess, 1.25, 1.5, 0.12, 0, 0.3, 1.4);
  archTrim(kit, g, M.accent, 1.25, 1.5, 0.09, 0, 0.3, 1.56);
  const gate = makeGate(kit, g, 1.2, 2.05, 0, 0.3, 1.54, M);

  for (const s of [-1, 1]) {
    const th = s * 0.96;
    const win = kit.add(g, new THREE.BoxGeometry(0.5, 0.9, 0.08), windowMat, Math.sin(th) * 1.9, 1.55, -0.4 + Math.cos(th) * 1.9);
    win.rotation.y = th;
  }

  kit.box(g, 0.55, 1.1, 0.06, M.accent, 1.25, 1.9, 2.62);

  const lantern = makeLantern(kit, g, -2.1, 0.3, 1.9, M);

  return {
    group: g,
    porch: new THREE.Vector3(0, 0.3, 3.05),
    roofY: 4.97,
    windowMats: [windowMat],
    lantern,
    lanternMat: M.lamp,
    gate,
    mats: kit.mats,
    meshes: kit.meshes,
    height: 4.97,
  };
}

function buildArcadeForge(kit, M) {
  const g = new THREE.Group();
  const windowMat = M.window;

  kit.box(g, 6.6, 0.3, 5.0, M.stoneDark, 0, 0, -0.3);
  kit.box(g, 6.0, 5.0, 4.2, M.stone, 0, 0.3, -0.3);
  kit.box(g, 6.2, 0.2, 4.4, M.stoneDark, 0, 3.0, -0.3);
  kit.box(g, 6.3, 0.2, 4.45, M.stoneDark, 0, 5.1, -0.3);
  kit.box(g, 1.9, 0.15, 0.6, M.stone, 0, 0, 2.45);

  archPanel(kit, g, M.recess, 1.4, 1.5, 0.12, 0, 0.3, 1.78);
  archTrim(kit, g, M.accent, 1.4, 1.5, 0.1, 0, 0.3, 1.94);
  const gate = makeGate(kit, g, 1.35, 2.1, 0, 0.3, 1.92, M);

  for (const sx of [-1, 1]) {
    archPanel(kit, g, M.recess, 1.0, 1.0, 0.12, sx * 1.95, 0.3, 1.78);
    archTrim(kit, g, M.stoneDark, 1.0, 1.0, 0.08, sx * 1.95, 0.3, 1.9);
  }

  for (const wx of [-1.7, 0, 1.7]) {
    archPanel(kit, g, windowMat, 0.85, 0.95, 0.1, wx, 3.25, 1.78);
    archTrim(kit, g, M.stoneDark, 0.85, 0.95, 0.07, wx, 3.25, 1.88);
  }

  kit.box(g, 1.8, 0.12, 0.55, M.accent, 0, 2.55, 1.9);
  kit.box(g, 0.45, 0.9, 0.06, M.accent, 2.55, 4.0, 1.83);

  pitchedRoof(kit, g, M.roof, 6.4, 4.4, 1.1, 0, 5.3, -0.3, 0.25);

  kit.box(g, 0.55, 1.25, 0.55, M.stoneDark, 2.0, 5.55, -1.1);
  kit.box(g, 0.72, 0.12, 0.72, M.stone, 2.0, 6.8, -1.1);

  const lantern = makeLantern(kit, g, -2.9, 0.3, 2.0, M);

  return {
    group: g,
    porch: new THREE.Vector3(0, 0.15, 2.85),
    roofY: 6.92,
    windowMats: [windowMat],
    lantern,
    lanternMat: M.lamp,
    gate,
    mats: kit.mats,
    meshes: kit.meshes,
    height: 6.92,
  };
}

function aqueductTier(kit, g, M, x, yBase, z0, z1, n, height) {
  const span = (z1 - z0) / n;
  for (let i = 0; i <= n; i++) {
    kit.box(g, 0.7, height, 0.32, M.stone, x, yBase, z0 + i * span);
  }
  for (let i = 0; i < n; i++) {
    const zc = z0 + (i + 0.5) * span;
    const arch = kit.add(g, new THREE.TorusGeometry((span - 0.32) / 2, 0.1, 8, 20, Math.PI), M.stoneDark, x, yBase + height * 0.52, zc);
    arch.rotation.y = Math.PI / 2;
  }
  kit.box(g, 0.74, 0.22, (z1 - z0) + 0.32, M.stoneDark, x, yBase + height - 0.22, (z0 + z1) / 2);
}

function buildAqueductWorkshop(kit, M) {
  const g = new THREE.Group();
  const windowMat = M.window;
  const hx = 0.9;

  kit.box(g, 4.0, 0.3, 3.6, M.stoneDark, hx, 0, -0.4);
  kit.box(g, 3.2, 2.7, 2.8, M.stone, hx, 0.3, -0.4);
  kit.box(g, 3.35, 0.18, 2.95, M.stoneDark, hx, 3.0, -0.4);
  kit.box(g, 1.8, 0.15, 0.6, M.stone, hx, 0, 1.5);

  archPanel(kit, g, M.recess, 1.3, 1.4, 0.12, hx, 0.3, 0.98);
  archTrim(kit, g, M.accent, 1.3, 1.4, 0.09, hx, 0.3, 1.13);
  const gate = makeGate(kit, g, 1.25, 2.0, hx, 0.3, 1.12, M);

  for (const wx of [-0.35, 2.1]) {
    archPanel(kit, g, windowMat, 0.7, 0.9, 0.1, wx, 1.1, 0.98);
    archTrim(kit, g, M.stoneDark, 0.7, 0.9, 0.06, wx, 1.1, 1.08);
  }

  kit.box(g, 1.7, 0.12, 0.55, M.accent, hx, 2.45, 1.2);

  pitchedRoof(kit, g, M.roof, 3.4, 3.0, 0.8, hx, 3.0, -0.4, 0.2);

  kit.cyl(g, 0.7, 0.75, 0.6, M.stone, hx, 3.4, -1.0, 16);
  kit.add(g, new THREE.SphereGeometry(0.8, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.dome, hx, 4.0, -1.0);
  kit.add(g, new THREE.SphereGeometry(0.1, 8, 6), M.bronze, hx, 4.8, -1.0);

  const az0 = -3.0;
  const az1 = 1.8;
  aqueductTier(kit, g, M, -2.7, 0, az0, az1, 3, 1.9);
  aqueductTier(kit, g, M, -2.7, 1.9, az0, az1, 3, 1.5);
  kit.box(g, 0.95, 0.35, (az1 - az0) + 0.5, M.stone, -2.7, 3.4, (az0 + az1) / 2);

  const lantern = makeLantern(kit, g, -0.75, 0.3, 1.35, M);

  return {
    group: g,
    porch: new THREE.Vector3(hx, 0.15, 1.85),
    roofY: 4.92,
    windowMats: [windowMat],
    lantern,
    lanternMat: M.lamp,
    gate,
    mats: kit.mats,
    meshes: kit.meshes,
    height: 4.92,
  };
}

export function buildRoman(opts = {}) {
  const kit = makeKit(opts.shadows !== false);
  const M = romanMats(kit, opts.color || '#b5563a');
  const v = (((opts.variant | 0) % 3) + 3) % 3;
  if (v === 1) return buildArcadeForge(kit, M);
  if (v === 2) return buildAqueductWorkshop(kit, M);
  return buildDomedWorkshop(kit, M);
}

export { buildAqueduct } from './aqueduct.js';
