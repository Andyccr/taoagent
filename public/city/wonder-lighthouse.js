import { createGeo } from './geo.js';

export function buildLighthouse() {
  const solid = createGeo();
  const glass = createGeo();

  const C = {
    rock1: 0x8b8f87,
    rock2: 0x787c74,
    rock3: 0x666b63,
    rock4: 0x999d95,
    stone: 0xded5bd,
    stone2: 0xd3c8ae,
    stone3: 0xc6ba9f,
    stoneDark: 0xb0a381,
    stoneEdge: 0xbfb292,
    window: 0x292522,
    bronze: 0x9a7b4f,
    bronze2: 0xb08d57,
    bronzeDark: 0x6e5230,
    fire: 0xffc45a,
    fireCore: 0xffe9a3,
    wood: 0x6b4a2a,
    quay: 0xa39a86,
    bollard: 0x8d8472,
    hull: 0x6b4f35,
    hull2: 0x7c5e40,
    hull3: 0x8a6c49,
    sail: 0xded2b8,
    sail2: 0xc9bc9f,
  };

  const squareCornice = (g, half, y, h, out, hex) => {
    const e = half + out;
    const L = half * 2 + out * 2 + 0.3;
    g.box(L, h, 0.5, 0, y, e, hex);
    g.box(L, h, 0.5, 0, y, -e, hex);
    g.box(0.5, h, L, e, y, 0, hex);
    g.box(0.5, h, L, -e, y, 0, hex);
  };

  const squareWindows = (g, half, y, w, h, cols, hex, lintel = true) => {
    for (let c = 0; c < cols; c++) {
      const x = -1 + (2 * c + 1) / cols;
      const px = x * (half - 1.5);
      g.box(w, h, 0.25, px, y, half + 0.05, hex);
      g.box(w, h, 0.25, px, y, -(half + 0.05), hex);
      g.box(0.25, h, w, half + 0.05, y, px, hex);
      g.box(0.25, h, w, -(half + 0.05), y, px, hex);
      if (lintel) {
        g.box(w + 0.3, 0.25, 0.3, px, y + h, half + 0.06, hex);
        g.box(w + 0.3, 0.25, 0.3, px, y + h, -(half + 0.06), hex);
        g.box(0.3, 0.25, w + 0.3, half + 0.06, y + h, px, hex);
        g.box(0.3, 0.25, w + 0.3, -(half + 0.06), y + h, px, hex);
      }
    }
  };

  const ringWindows = (g, r, y, wh, ww, n, hex) => {
    for (let f = 0; f < n; f++) {
      const a = Math.PI / n + (f * Math.PI * 2) / n;
      const cx = Math.sin(a) * r;
      const cz = Math.cos(a) * r;
      g.box(ww, wh, 0.3, cx, y, cz, hex, { ry: a });
    }
  };

  // --- Rocky island rising from the sea (y = 0.04) to a plateau at y ~ 4 ---
  solid.box(46, 5, 42, 0, -1, 0, C.rock1);
  solid.box(40, 5.4, 36, 0, -1.2, 0, C.rock2);
  solid.box(34, 0.4, 34, 0, 3.8, 0, C.rock4);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    const rr = 20 + (i % 4) * 1.6;
    const x = Math.cos(a) * rr * 1.05;
    const z = Math.sin(a) * rr * 0.9;
    const y = -0.5 + (i % 6) * 0.7;
    solid.sphere(1.8 + (i % 4) * 0.5, x, y, z, i % 3 ? C.rock2 : C.rock3, 6);
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + 0.3;
    const rr = 17 + (i % 3);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr * 0.9;
    solid.cone(1.5 + (i % 3) * 0.6, 2.2 + (i % 4) * 0.8, x, 3.3, z, i % 2 ? C.rock1 : C.rock4, 6);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.15;
    const rr = 7 + (i % 3) * 3.5;
    solid.sphere(1 + (i % 3) * 0.5, Math.cos(a) * rr, 3.5, Math.sin(a) * rr * 0.85, C.rock2, 5);
  }

  // --- Courtyard pavement ---
  solid.box(34, 0.3, 34, 0, 4.2, 0, C.stone3);

  // --- Fortified enclosure wall ---
  const EW = 17;
  const wT = 1.3;
  solid.box(EW * 2, 5, wT, 0, 4, -EW, C.stone);
  solid.box(EW * 2, 5, wT, 0, 4, EW, C.stone);
  solid.box(wT, 5, EW * 2, -EW, 4, 0, C.stone);
  solid.box(wT, 5, EW * 2, EW, 4, 0, C.stone);
  squareCornice(solid, EW, 8.8, 0.5, 0.15, C.stone2);

  for (let s = -EW + 1.2; s <= EW - 1.2; s += 2.4) {
    solid.box(0.9, 1.1, 0.9, s, 9.2, -EW, C.stone2);
    solid.box(0.9, 1.1, 0.9, s, 9.2, EW, C.stone2);
    solid.box(0.9, 1.1, 0.9, -EW, 9.2, s, C.stone2);
    solid.box(0.9, 1.1, 0.9, EW, 9.2, s, C.stone2);
  }

  for (let s = -EW + 4; s <= EW - 4; s += 6.5) {
    solid.box(0.9, 5, 1.2, s, 4, -(EW + 0.9), C.stoneDark);
    solid.box(0.9, 5, 1.2, s, 4, EW + 0.9, C.stoneDark);
    solid.box(1.2, 5, 0.9, -(EW + 0.9), 4, s, C.stoneDark);
    solid.box(1.2, 5, 0.9, EW + 0.9, 4, s, C.stoneDark);
  }

  const tower = (x, z) => {
    solid.cyl(2.6, 3, 7, x, 4, z, C.stone2, 8);
    solid.cyl(3.1, 2.6, 0.9, x, 11, z, C.stoneDark, 8);
    solid.cone(3.2, 2.6, x, 11.9, z, C.stone3, 8);
  };
  for (const [x, z] of [[-EW, -EW], [EW, -EW], [-EW, EW], [EW, EW], [0, -EW], [0, EW], [-EW, 0], [EW, 0]]) tower(x, z);

  // Gatehouse on the seaward (+z) side.
  solid.box(6.5, 6, 2, 0, 4, EW, C.stone2);
  solid.box(7.5, 1.2, 2.8, 0, 9.6, EW, C.stoneDark);
  solid.box(3.6, 3.2, 1, 0, 4, EW + 1.1, C.window);
  solid.arch(1.8, 0.6, 1.2, 0, 7.2, EW + 1.1, C.stoneEdge, 8);
  solid.cyl(0.5, 0.6, 3, -2.6, 4, EW + 1.2, C.stoneDark, 6);
  solid.cyl(0.5, 0.6, 3, 2.6, 4, EW + 1.2, C.stoneDark, 6);

  // --- Stone quay + bollards ---
  solid.box(11, 3, 13, 0, -1, 22.5, C.quay);
  solid.box(12.4, 0.6, 14, 0, 2, 22.5, C.quay);
  for (let i = 0; i < 9; i++) {
    const z = 18 + i * 1.2;
    solid.cyl(0.34, 0.46, 0.8, -5.2, 2.6, z, C.bollard, 6);
    solid.cyl(0.34, 0.46, 0.8, 5.2, 2.6, z, C.bollard, 6);
  }

  // Stairs from the quay up to the gate.
  for (let i = 0; i < 5; i++) {
    const z = 17.6 + i * 0.95;
    const y = 2.2 + i * 0.45;
    solid.box(5.4, 0.5, 0.95, 0, y, z, C.stone2);
  }

  // ===== The lighthouse =====
  const baseHalf = 12;
  const baseY0 = 4;
  const baseH = 43;

  // Square base tier (~43 high), 4 -> 47.
  solid.box(baseHalf * 2, baseH, baseHalf * 2, 0, baseY0, 0, C.stone);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    solid.box(1.8, baseH, 1.8, (baseHalf - 0.9) * sx, baseY0, (baseHalf - 0.9) * sz, C.stone2);
  }
  solid.box(baseHalf * 2 + 2.6, 1.4, baseHalf * 2 + 2.6, 0, baseY0, 0, C.stone2);

  const levels = 11;
  for (let l = 0; l < levels; l++) {
    const y = baseY0 + 1.6 + l * 4.7;
    squareCornice(solid, baseHalf, y, 0.5, 0.1, l % 2 ? C.stoneDark : C.stone3);
    squareWindows(solid, baseHalf, y + 0.7, 0.95, 1.6, 6, C.window);
  }
  squareWindows(solid, baseHalf, baseY0 + baseH - 1.6, 0.8, 1.2, 5, C.window, false);

  // Grand entrance on the street (+z) face with a stepped podium.
  solid.box(3.6, 3, 0.9, 0, baseY0, baseHalf + 0.05, C.window);
  solid.arch(1.8, 0.6, 1.2, 0, baseY0 + 3, baseHalf + 0.05, C.stoneEdge, 8);
  solid.box(6.5, 1.1, 2, 0, baseY0, baseHalf + 1.6, C.stone2);
  for (let i = 0; i < 4; i++) {
    solid.box(8 - i * 0.8, 0.5, 0.9 + i * 0.4, 0, baseY0, baseHalf + 2.4 + i * 0.45, C.stone2);
  }

  // Corner Triton statues on the base-tier platform.
  const baseTop = baseY0 + baseH;
  const triton = (x, z) => {
    solid.box(1.4, 0.5, 1.4, x, baseTop, z, C.stoneDark);
    solid.cyl(0.5, 0.7, 1.6, x, baseTop + 0.5, z, C.bronze, 8);
    solid.box(0.9, 1.0, 0.5, x, baseTop + 2.1, z, C.bronze);
    solid.sphere(0.42, x, baseTop + 3.5, z, C.bronze, 8);
    solid.box(0.28, 1.1, 0.24, x - 0.75, baseTop + 2.4, z, C.bronze);
    solid.box(0.28, 1.1, 0.24, x + 0.75, baseTop + 2.4, z, C.bronze);
  };
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) triton((baseHalf - 0.6) * sx, (baseHalf - 0.6) * sz);

  // Corniced platform at the top of the base (47 -> 50).
  solid.box(baseHalf * 2 + 3, 1.2, baseHalf * 2 + 3, 0, baseTop, 0, C.stone2);
  solid.box(baseHalf * 2 + 1.4, 1.0, baseHalf * 2 + 1.4, 0, baseTop + 1.2, 0, C.stone3);
  for (let s = -baseHalf - 1; s <= baseHalf + 1; s += 1.9) {
    solid.box(0.55, 1.0, 0.55, s, baseTop + 2.2, baseHalf + 1.5, C.stoneDark);
    solid.box(0.55, 1.0, 0.55, s, baseTop + 2.2, -(baseHalf + 1.5), C.stoneDark);
    solid.box(0.55, 1.0, 0.55, baseHalf + 1.5, baseTop + 2.2, s, C.stoneDark);
    solid.box(0.55, 1.0, 0.55, -(baseHalf + 1.5), baseTop + 2.2, s, C.stoneDark);
  }

  // Octagonal middle tier (~23 high), 50 -> 73.
  const midY = baseTop + 3;
  const midR = 8.4;
  solid.cyl(midR, midR, 23, 0, midY, 0, C.stone, 8);
  for (let l = 0; l < 4; l++) {
    const y = midY + 1.4 + l * 5.4;
    solid.cyl(midR + 0.4, midR + 0.4, 0.5, 0, y, 0, l % 2 ? C.stoneDark : C.stone3, 8);
    ringWindows(solid, midR, y + 0.8, 1.5, 1.0, 8, C.window);
  }
  solid.cyl(midR + 0.4, midR + 0.4, 0.8, 0, midY + 21.4, 0, C.stoneDark, 8);
  solid.cyl(midR + 1.1, midR + 0.6, 1.2, 0, midY + 22.2, 0, C.stone2, 8);

  // Cylindrical top tier (~11 high), 73 -> 84.
  const topY = midY + 23;
  const topR = 6;
  solid.cyl(topR, topR, 11, 0, topY, 0, C.stone, 12);
  solid.cyl(topR + 0.35, topR + 0.35, 0.5, 0, topY + 1.2, 0, C.stone3, 12);
  ringWindows(solid, topR, topY + 2.6, 1.7, 0.9, 12, C.window);
  solid.cyl(topR + 0.35, topR + 0.35, 0.5, 0, topY + 4.8, 0, C.stone3, 12);
  ringWindows(solid, topR, topY + 6.0, 1.7, 0.9, 12, C.window);
  solid.cyl(topR + 0.35, topR + 0.35, 0.5, 0, topY + 8.2, 0, C.stoneDark, 12);
  solid.cyl(topR + 0.9, topR + 0.4, 1.4, 0, topY + 10, 0, C.stone2, 12);

  // Colonnaded lantern (84 -> 89).
  const lanY = topY + 11;
  const lanR = 3.5;
  solid.cyl(lanR + 0.7, topR + 0.2, 0.9, 0, lanY, 0, C.stone2, 12);
  for (let f = 0; f < 8; f++) {
    const a = Math.PI / 8 + (f * Math.PI) / 4;
    const cx = Math.sin(a) * lanR;
    const cz = Math.cos(a) * lanR;
    solid.cyl(0.28, 0.34, 2.6, cx, lanY + 0.8, cz, C.stone2, 8);
    solid.box(0.62, 0.28, 0.62, cx, lanY + 3.3, cz, C.stoneDark);
  }
  solid.cyl(lanR + 0.7, lanR + 0.7, 0.4, 0, lanY + 0.8, 0, C.stoneDark, 12);
  solid.cyl(lanR + 0.8, lanR + 0.8, 0.5, 0, lanY + 3.5, 0, C.stone2, 12);
  solid.dome(lanR + 0.6, 0, lanY + 4, 0, C.stone3, 12);

  // Glowing fire on its pedestal in the lantern.
  solid.cyl(1.6, 1.9, 0.7, 0, lanY + 0.9, 0, C.stoneDark, 10);
  solid.cyl(0.8, 1.1, 0.6, 0, lanY + 1.6, 0, C.bronzeDark, 8);
  solid.sphere(1.0, 0, lanY + 2.5, 0, C.fire, 8);
  solid.cone(0.8, 1.6, 0, lanY + 3.3, 0, C.fireCore, 8);
  solid.sphere(0.45, 0, lanY + 5.1, 0, C.fire, 6);

  // Lantern glazing (thin ring of pale glass between the columns).
  glass.cyl(lanR + 0.25, lanR + 0.25, 2.2, 0, lanY + 1.1, 0, 0x9fc3d9, 12);

  // Bronze statue (Poseidon) on the lantern dome.
  const PY = lanY + 4.4;
  solid.box(1.6, 0.4, 1.6, 0, PY, 0, C.bronzeDark);
  solid.box(0.55, 1.5, 0.4, -0.22, PY + 0.4, 0, C.bronze);
  solid.box(0.55, 1.5, 0.4, 0.22, PY + 0.4, 0, C.bronze);
  solid.box(0.95, 1.6, 0.5, 0, PY + 1.9, 0, C.bronze2);
  solid.sphere(0.42, 0, PY + 3.05, 0, C.bronze, 8);
  solid.box(0.22, 1.2, 0.22, -0.75, PY + 2.2, 0, C.bronze);
  solid.box(0.22, 1.2, 0.22, 0.75, PY + 2.3, 0, C.bronze);
  solid.cyl(0.09, 0.11, 1.4, 0.75, PY + 3.2, 0, C.bronzeDark, 6);
  solid.cyl(0.05, 0.05, 0.5, 0.66, PY + 4.6, -0.1, C.bronzeDark, 6);
  solid.cyl(0.05, 0.05, 0.5, 0.84, PY + 4.6, -0.1, C.bronzeDark, 6);
  solid.cyl(0.05, 0.05, 0.6, 0.75, PY + 4.6, 0, C.bronzeDark, 6);

  // --- Colossus-like bronze statue beside the entrance ---
  const cx0 = 7;
  const cz0 = 13.5;
  solid.box(7, 1, 7, cx0, 4, cz0, C.stone2);
  solid.box(6, 1, 6, cx0, 5, cz0, C.stone);
  solid.box(5, 5, 5, cx0, 6, cz0, C.stone);
  solid.box(5.8, 0.8, 5.8, cx0, 11, cz0, C.stone2);
  solid.box(3, 0.6, 3, cx0, 11.8, cz0, C.bronzeDark);
  solid.box(0.6, 3.4, 0.6, cx0 - 0.7, 12.4, cz0, C.bronze);
  solid.box(0.6, 3.4, 0.6, cx0 + 0.7, 12.4, cz0, C.bronze);
  solid.box(1.8, 4, 0.9, cx0, 15.8, cz0, C.bronze);
  solid.box(2.0, 0.5, 1.0, cx0, 18.6, cz0, C.bronze2);
  solid.sphere(0.7, cx0, 20.2, cz0, C.bronze, 8);
  solid.box(0.45, 3.4, 0.45, cx0 + 1.4, 16.6, cz0, C.bronze);
  solid.cyl(0.18, 0.22, 2.4, cx0 + 1.4, 19.6, cz0, C.bronzeDark, 6);
  solid.sphere(0.5, cx0 + 1.4, 22.2, cz0, C.fire, 6);
  solid.cone(0.45, 1.4, cx0 + 1.4, 22.5, cz0, C.fireCore, 6);
  solid.box(0.45, 2.6, 0.45, cx0 - 1.3, 15.5, cz0, C.bronze);

  // --- Two moored ships ---
  const ship = (x, z, ry, second) => {
    solid.group({ x, y: 0, z, ry }, (s) => {
      s.box(3.4, 1.8, 11, 0, -0.4, 0, C.hull);
      s.box(2.6, 1.5, 4, 0, -0.2, 6.4, C.hull2);
      s.box(2.2, 0.6, 2, 0, 1.0, 8.0, C.hull2);
      s.box(3.6, 0.25, 11.4, 0, 1.2, 0, C.hull3);
      const mz = second ? 1 : -1.5;
      s.cyl(0.22, 0.3, 9.5, 0, 1.4, mz, C.wood, 6);
      s.box(5, 0.12, 0.14, 0, 8.6, mz, C.wood);
      s.box(0.12, 4.8, 3.6, 0, 6.4, mz, C.sail);
      s.gable(0.12, 2.4, 3.0, 0, 9.4, mz, C.sail2);
      if (second) {
        s.cyl(0.16, 0.2, 7, 0, 1.4, 4, C.wood, 6);
        s.box(3.4, 0.1, 0.12, 0, 6.8, 4, C.wood);
        s.box(0.1, 3.2, 2.6, 0, 5.2, 4, C.sail);
      }
    });
  };
  ship(-9, 20, 0, false);
  ship(10.5, 21, Math.PI, true);

  return {
    solid: solid.build(),
    glass: glass.build(),
    name: '法罗斯灯塔',
    radius: 23,
    height: 95,
  };
}
