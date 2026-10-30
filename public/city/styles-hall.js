// Lead building: imperial hall inspired by the Hall of Supreme Harmony (Taihe Dian). Front faces +z.
import { makeKit, THREE } from './kit.js';

// Hip roof / frustum from 4 base corners (half extents) to a top rectangle or ridge.
function frustum(W, D, tw, td, h) {
  const b = [[-W, 0, -D], [W, 0, -D], [W, 0, D], [-W, 0, D]], t = [[-tw, h, -td], [tw, h, -td], [tw, h, td], [-tw, h, td]];
  const tris = [b[3], b[2], t[2], b[3], t[2], t[3], b[1], b[0], t[0], b[1], t[0], t[1], b[2], b[1], t[1], b[2], t[1], t[2], b[0], b[3], t[3], b[0], t[3], t[0], t[0], t[3], t[2], t[0], t[2], t[1]];
  const pos = new Float32Array(tris.flat());
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

export function buildImperialHall(opts = {}) {
  const kit = makeKit(opts.shadows !== false);
  const g = new THREE.Group();
  const marble = kit.mat(0xf3efe6), marble2 = kit.mat(0xe4ddcc), ramp = kit.mat(0xdcd3bf);
  const red = kit.mat(0x9e2b22), col = kit.mat(0xb2352a), gold = kit.mat(0xe0b23a, { roughness: 0.5, metalness: 0.2 });
  const ridge = kit.mat(0x6b4a1e), dark = kit.mat(0x2a1a14), bronze = kit.mat(0x7a5a32, { metalness: 0.4, roughness: 0.5 });
  const lattice = kit.mat(0x6a4a24); // windows (city lights them when working)
  const accent = kit.mat(opts.color || '#3a3d42');

  // three-tier marble terrace with balustrade rails (gap at the front for the stairs)
  const tiers = [[15, 13], [13.2, 11.4], [11.4, 9.8]];
  tiers.forEach(([w, d], i) => {
    const y = i * 0.6;
    kit.box(g, w, 0.6, d, i % 2 ? marble2 : marble, 0, y, 0);
    const ry = y + 0.6, rh = 0.32, t = 0.14;
    kit.box(g, w, rh, t, marble, 0, ry, -d / 2 + t / 2);
    kit.box(g, t, rh, d, marble, -w / 2 + t / 2, ry, 0);
    kit.box(g, t, rh, d, marble, w / 2 - t / 2, ry, 0);
    const seg = (w - 4.4) / 2;
    kit.box(g, seg, rh, t, marble, -(2.2 + seg / 2), ry, d / 2 - t / 2);
    kit.box(g, seg, rh, t, marble, 2.2 + seg / 2, ry, d / 2 - t / 2);
  });
  const TOP = 1.8, FRONT = 4.9;
  // central-axis stairway with the carved dragon slab in the middle
  for (let i = 0; i < 9; i++) kit.box(g, 3.8, TOP - 0.2 * i, 0.45, i % 2 ? marble : marble2, 0, 0, FRONT + 0.45 * i + 0.225);
  const run = 0.45 * 9, len = Math.hypot(run, TOP);
  const slab = kit.box(g, 1.2, 0.18, len, ramp, 0, 0, 0);
  slab.position.set(0, TOP / 2 + 0.12, FRONT + run / 2); slab.rotation.x = Math.atan2(TOP, run);
  for (const sx of [-1, 1]) { const r = kit.box(g, 0.16, 0.3, len, marble, 0, 0, 0); r.position.set(sx * 1.98, TOP / 2 + 0.2, FRONT + run / 2); r.rotation.x = Math.atan2(TOP, run); }

  // hall body
  const HW = 9, HD = 4.5, HZ = -0.8, WALL = 3.0, frontZ = HZ + HD / 2;
  kit.box(g, HW, WALL, HD, red, 0, TOP, HZ);
  // doorway recess + golden lattice windows between columns
  kit.box(g, 1.9, 2.6, 0.12, dark, 0, TOP, frontZ + 0.01);
  const windowMats = [lattice];
  for (const x of [-3.4, -2.1, 2.1, 3.4]) kit.box(g, 1.0, 1.9, 0.1, lattice, x, TOP + 0.5, frontZ + 0.03);
  for (const x of [-3.4, -2.1, 2.1, 3.4]) kit.box(g, 1.0, 0.08, 0.12, gold, x, TOP + 1.45, frontZ + 0.06);
  // front colonnade
  for (let i = 0; i < 8; i++) kit.cyl(g, 0.17, 0.19, WALL, col, -4.2 + i * 1.2, TOP, frontZ + 0.55, 10);
  kit.box(g, HW + 0.4, 0.35, 1.2, accent, 0, TOP + WALL - 0.35, frontZ + 0.5);
  // double-eave golden hip roof with upturned corners
  const Y1 = TOP + WALL;
  kit.add(g, frustum(6.2, 3.9, 4.8, 2.6, 0.95), gold, 0, Y1, HZ + 0.35);
  kit.box(g, 7.6, 0.85, 3.6, red, 0, Y1 + 0.95, HZ + 0.35);
  kit.add(g, frustum(5.4, 3.0, 3.0, 0.05, 2.3), gold, 0, Y1 + 1.8, HZ + 0.35);
  kit.box(g, 6.4, 0.22, 0.25, ridge, 0, Y1 + 4.05, HZ + 0.35);
  for (const sx of [-1, 1]) kit.box(g, 0.3, 0.5, 0.3, ridge, sx * 3.1, Y1 + 4.05, HZ + 0.35);
  for (const [y, w, d] of [[Y1 + 0.05, 6.2, 3.9], [Y1 + 1.85, 5.4, 3.0]]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const tip = kit.add(g, new THREE.ConeGeometry(0.16, 0.7, 6), gold, sx * (w + 0.1), y + 0.25, HZ + 0.35 + sz * (d + 0.1));
    tip.rotation.set(sz * 0.7, 0, -sx * 0.7);
  }
  // throne (Emperor) on the top terrace in front of the door, incense burners, lantern
  const TZ = frontZ + 1.4;
  kit.box(g, 1.5, 0.4, 1.1, red, 0, TOP, TZ);
  kit.box(g, 1.5, 1.5, 0.2, gold, 0, TOP + 0.4, TZ - 0.5);
  for (const sx of [-1, 1]) {
    kit.cyl(g, 0.45, 0.35, 0.6, bronze, sx * 3.9, TOP, 3.4, 10);
    kit.cyl(g, 0.12, 0.12, 0.35, bronze, sx * 3.9, TOP + 0.6, 3.4, 8);
  }
  const lantern = new THREE.Group(); g.add(lantern);
  kit.box(lantern, 0.12, 1.6, 0.12, dark, -2.7, TOP, 4.2);
  const lanternMat = kit.mat(0x8a2a20);
  kit.add(lantern, new THREE.SphereGeometry(0.32, 10, 8), lanternMat, -2.7, TOP + 1.75, 4.2).scale.y = 1.25;
  // closed gate for "disconnected"
  const gate = new THREE.Group(); g.add(gate);
  for (const sx of [-1, 1]) {
    kit.box(gate, 0.95, 2.6, 0.12, col, sx * 0.48, TOP, frontZ + 0.12);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) kit.box(gate, 0.08, 0.08, 0.06, gold, sx * 0.48 + (c - 1) * 0.26, TOP + 0.5 + r * 0.5, frontZ + 0.2);
  }
  gate.visible = false;
  const roofY = Y1 + 4.3;
  return {
    group: g, roofY, height: roofY, windowMats, lantern, lanternMat, gate, mats: kit.mats, meshes: kit.meshes,
    throne: new THREE.Vector3(0, TOP + 0.4, TZ), porch: new THREE.Vector3(0, TOP, FRONT - 0.6), stairFoot: new THREE.Vector3(0, 0, FRONT + run + 0.6),
  };
}
