import { createGeo } from './geo.js';

export function buildLighthouse() {
  const solid = createGeo();
  const glass = createGeo();

  const C = {
    rock1: 0x8b8f87,
    rock2: 0x787c74,
    rock3: 0x666b63,
    rock4: 0x999d95,
    lime: 0xe6dcc4,
    lime2: 0xded2b8,
    band: 0xcdb991,
    stoneDark: 0xb0a381,
    stoneEdge: 0xbfb292,
    window: 0x292522,
    bronze: 0xb08a4a,
    bronze2: 0xc79a5a,
    bronzeDark: 0x7a5f34,
    fire: 0xffc070,
    fireCore: 0xffe9a3,
    wood: 0x6b4a2a,
    leaf1: 0x5a7d4a,
    leaf2: 0x4a6d3d,
    quay: 0xa39a86,
    bollard: 0x8d8472,
    hull: 0x6b4f35,
    hull2: 0x7c5e40,
    hull3: 0x8a6c49,
    sail: 0xded2b8,
    sail2: 0xc9bc9f,
  };

  // tiny deterministic rng for boulder/rock jitter
  let seed = 0x9e3779b9;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const sqCornice = (g, a, y, h, out, hex) => {
    const e = a + out;
    const L = a * 2 + out * 2 + 0.4;
    g.box(L, h, 0.6, 0, y, e, hex);
    g.box(L, h, 0.6, 0, y, -e, hex);
    g.box(0.6, h, L, e, y, 0, hex);
    g.box(0.6, h, L, -e, y, 0, hex);
  };

  const sqWindows = (g, a, y, w, h, cols, hex) => {
    for (let c = 0; c < cols; c++) {
      const px = (-1 + (2 * c + 1) / cols) * (a - 1.6);
      g.box(w, h, 0.3, px, y, a + 0.06, hex);
      g.box(w, h, 0.3, px, y, -(a + 0.06), hex);
      g.box(0.3, h, w, a + 0.06, y, px, hex);
      g.box(0.3, h, w, -(a + 0.06), y, px, hex);
    }
  };

  const ringWindows = (g, r, y, wh, ww, n, hex) => {
    for (let f = 0; f < n; f++) {
      const a = Math.PI / n + (f * Math.PI * 2) / n;
      g.box(ww, wh, 0.3, Math.sin(a) * r, y, Math.cos(a) * r, hex, { ry: a });
    }
  };

  const column = (g, x, y, z, h, hex, seg = 8) => {
    g.cyl(0.32, 0.42, h, x, y, z, hex, seg);
    g.box(0.92, 0.3, 0.92, x, y + h, z, C.stoneDark);
    g.box(0.86, 0.26, 0.86, x, y - 0.26, z, C.stoneDark);
  };

  const balustrade = (g, half, y, n, hex) => {
    for (let i = 0; i < n; i++) {
      const p = (-1 + (2 * i + 1) / n) * half;
      g.box(0.26, 0.9, 0.26, p, y, half - 0.1, hex);
      g.box(0.26, 0.9, 0.26, p, y, -(half - 0.1), hex);
      g.box(0.26, 0.9, 0.26, half - 0.1, y, p, hex);
      g.box(0.26, 0.9, 0.26, -(half - 0.1), y, p, hex);
    }
    g.box(half * 2, 0.15, 0.15, 0, y + 0.9, half - 0.18, hex);
    g.box(half * 2, 0.15, 0.15, 0, y + 0.9, -(half - 0.18), hex);
    g.box(0.15, 0.15, half * 2, half - 0.18, y + 0.9, 0, hex);
    g.box(0.15, 0.15, half * 2, -(half - 0.18), y + 0.9, 0, hex);
  };

  const ringBalustrade = (g, r, y, n, hex) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.box(0.26, 0.85, 0.26, Math.sin(a) * r, y, Math.cos(a) * r, hex);
    }
    g.ring(r, 0.08, 0, y + 0.85, 0, hex, 16);
  };

  // bronze ridge beast (roof finial)
  const beast = (x, y, z, ry) => {
    solid.group({ x, y, z, ry }, (s) => {
      s.box(0.28, 0.24, 0.95, 0, 0.1, 0, C.bronze);
      s.sphere(0.22, 0, 0.42, 0.32, C.bronze, 8);
      s.box(0.12, 0.22, 0.4, 0, 0.34, -0.2, C.bronze2);
      s.box(0.08, 0.16, 0.3, 0, 0.36, -0.55, C.bronzeDark);
    });
  };
  // recumbent lion guard
  const lion = (x, y, z, ry) => {
    solid.group({ x, y, z, ry }, (s) => {
      s.box(1.4, 0.5, 0.5, 0, 0.5, 0, C.bronze);
      s.box(1.8, 0.8, 1.1, 0, 0.9, 0, C.bronze2);
      s.sphere(0.5, 0, 1.1, 1.15, C.bronze, 8);
      s.box(0.25, 0.7, 0.25, 0.6, 0.3, 0.7, C.bronzeDark);
      s.box(0.25, 0.7, 0.25, -0.6, 0.3, 0.7, C.bronzeDark);
      s.box(0.25, 0.7, 0.25, 0.6, 0.3, -0.7, C.bronzeDark);
      s.box(0.25, 0.7, 0.25, -0.6, 0.3, -0.7, C.bronzeDark);
    });
  };

  // ===== Rocky island rising from the sea (y=0) to a plateau at y=5 =====
  solid.box(50, 4.5, 46, 0, -0.5, 0, C.rock1);
  solid.box(44, 4.4, 40, 0, -0.4, 0, C.rock2);
  solid.box(40, 1.6, 40, 0, 3.4, 0, C.rock4);

  // boulder breakwater + waterline rocks
  for (let i = 0; i < 150; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = 18.5 + rnd() * 5.5;
    const rad = 1.0 + rnd() * 1.6;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr * 0.95;
    const y = rad - 0.4 + rnd() * 1.6;
    solid.sphere(rad, x, y, z, i % 3 ? C.rock2 : C.rock3, i % 2 ? 6 : 7);
  }
  // submerged reef ring at the waterline
  for (let i = 0; i < 44; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = 23.2 + rnd() * 1.6;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr * 0.95;
    const rad = 0.9 + rnd() * 1.0;
    solid.sphere(rad, x, rad - 0.45 + rnd() * 0.5, z, C.rock3, 5);
  }
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = 15.5 + rnd() * 4.5;
    solid.cone(1.1 + rnd() * 1.5, 2 + rnd() * 2, Math.cos(a) * rr, 3.3, Math.sin(a) * rr * 0.95, i % 2 ? C.rock1 : C.rock4, 6);
  }
  for (let i = 0; i < 20; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = 6 + rnd() * 6;
    solid.sphere(0.7 + rnd() * 0.8, Math.cos(a) * rr, 4.4, Math.sin(a) * rr * 0.9, C.rock2, 5);
  }

  // Courtyard pavement
  solid.box(40, 0.3, 40, 0, 5, 0, C.band);

  // ===== Fortified enclosure: crenellated curtain wall, towers, sea gate =====
  const EW = 20;
  solid.box(EW * 2, 6, 1.4, 0, 5, -EW, C.lime);
  solid.box(EW * 2, 6, 1.4, 0, 5, EW, C.lime);
  solid.box(1.4, 6, EW * 2, -EW, 5, 0, C.lime);
  solid.box(1.4, 6, EW * 2, EW, 5, 0, C.lime);
  sqCornice(solid, EW, 10.9, 0.5, 0.2, C.lime2);

  let mm = 0;
  for (let s = -EW + 1.1; s <= EW - 1.1; s += 2.3) {
    solid.box(0.9, 1.2, 1.0, s, 11, -EW, C.lime2);
    solid.box(0.9, 1.2, 1.0, s, 11, EW, C.lime2);
    solid.box(1.0, 1.2, 0.9, -EW, 11, s, C.lime2);
    solid.box(1.0, 1.2, 0.9, EW, 11, s, C.lime2);
    if (mm++ % 2 === 0) {
      solid.sphere(0.32, s, 12.3, -EW, C.bronze, 6);
      solid.sphere(0.32, s, 12.3, EW, C.bronze, 6);
      solid.sphere(0.32, -EW, 12.3, s, C.bronze, 6);
      solid.sphere(0.32, EW, 12.3, s, C.bronze, 6);
    }
  }

  const wallTower = (x, z) => {
    solid.cyl(2.8, 3.2, 8, x, 5, z, C.lime2, 8);
    solid.cyl(3.4, 2.9, 1.1, x, 13, z, C.stoneDark, 8);
    solid.cone(3.6, 3.0, x, 14.1, z, C.lime2, 8);
    beast(x, 17.0, z, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      solid.box(0.5, 0.9, 0.4, x + Math.sin(a) * 2.6, 8.4, z + Math.cos(a) * 2.6, C.window, { ry: a });
    }
  };
  for (const [x, z] of [[-EW, -EW], [EW, -EW], [-EW, EW], [EW, EW], [0, -EW], [0, EW], [-EW, 0], [EW, 0]]) wallTower(x, z);

  // Sea gate on the +z side (approach side)
  solid.box(7, 7, 2.2, 0, 5, EW, C.lime2);
  solid.box(8, 1.2, 3, 0, 11.6, EW, C.stoneDark);
  solid.box(3.6, 4, 1.0, 0, 5, EW + 1.2, C.window);
  solid.arch(2.0, 0.6, 1.4, 0, 9, EW + 1.2, C.stoneEdge, 8);
  solid.cyl(0.5, 0.6, 3.4, -2.8, 5, EW + 1.3, C.stoneDark, 6);
  solid.cyl(0.5, 0.6, 3.4, 2.8, 5, EW + 1.3, C.stoneDark, 6);
  solid.gable(8, 2.6, 3.4, 0, 12.2, EW + 0.2, C.stoneDark);
  beast(-3, 14.7, EW + 0.2, 0); beast(0, 14.7, EW + 0.2, 0); beast(3, 14.7, EW + 0.2, 0);

  // Stepped podium inside the enclosure
  solid.box(30, 0.8, 30, 0, 5, 0, C.lime2);
  solid.box(28.5, 0.8, 28.5, 0, 5.8, 0, C.lime);
  solid.box(27, 1.4, 27, 0, 6.6, 0, C.stoneDark);

  // Peristyle colonnade walkway ringing the podium
  const colHalf = 15;
  const colH = 6;
  for (let i = 0; i < 16; i++) {
    const p = (-1 + (2 * i + 1) / 16) * colHalf;
    column(solid, p, 5, colHalf, colH, C.lime);
    column(solid, p, 5, -colHalf, colH, C.lime);
    column(solid, colHalf, 5, p, colH, C.lime);
    column(solid, -colHalf, 5, p, colH, C.lime);
  }
  solid.box(colHalf * 2 + 1, 0.5, 0.7, 0, 5 + colH, colHalf + 0.35, C.band);
  solid.box(colHalf * 2 + 1, 0.5, 0.7, 0, 5 + colH, -(colHalf + 0.35), C.band);
  solid.box(0.7, 0.5, colHalf * 2 + 1, colHalf + 0.35, 5 + colH, 0, C.band);
  solid.box(0.7, 0.5, colHalf * 2 + 1, -(colHalf + 0.35), 5 + colH, 0, C.band);
  // triglyph / metope frieze along the colonnade entablature
  for (let i = 0; i < 32; i++) {
    const p = (-1 + (2 * i + 1) / 32) * (colHalf + 0.35);
    solid.box(0.34, 0.6, 0.2, p, 5 + colH, colHalf + 0.55, i % 2 ? C.stoneDark : C.lime2);
    solid.box(0.34, 0.6, 0.2, p, 5 + colH, -(colHalf + 0.55), i % 2 ? C.stoneDark : C.lime2);
    solid.box(0.2, 0.6, 0.34, colHalf + 0.55, 5 + colH, p, i % 2 ? C.stoneDark : C.lime2);
    solid.box(0.2, 0.6, 0.34, -(colHalf + 0.55), 5 + colH, p, i % 2 ? C.stoneDark : C.lime2);
  }
  solid.box(colHalf * 2 + 1.6, 0.4, 0.6, 0, 5 + colH + 0.6, colHalf + 0.55, C.lime2);
  solid.box(colHalf * 2 + 1.6, 0.4, 0.6, 0, 5 + colH + 0.6, -(colHalf + 0.55), C.lime2);
  solid.box(0.6, 0.4, colHalf * 2 + 1.6, colHalf + 0.55, 5 + colH + 0.6, 0, C.lime2);
  solid.box(0.6, 0.4, colHalf * 2 + 1.6, -(colHalf + 0.55), 5 + colH + 0.6, 0, C.lime2);

  // Courtyard statues + trees in the gaps between colonnade and wall
  const statue = (x, z, ry) => {
    solid.group({ x, y: 5, z, ry }, (s) => {
      s.box(1.2, 0.4, 1.2, 0, 0, 0, C.stoneDark);
      s.box(0.42, 2.4, 0.42, 0, 0.4, 0, C.bronze);
      s.box(0.85, 0.4, 0.42, 0, 2.8, 0, C.bronze2);
      s.sphere(0.34, 0, 3.6, 0, C.bronze, 8);
    });
  };
  statue(17, 9, 0); statue(-17, 9, 0); statue(17, -9, Math.PI); statue(-17, -9, Math.PI);
  statue(9, 17, Math.PI / 2); statue(-9, 17, Math.PI / 2);
  statue(9, -17, -Math.PI / 2); statue(-9, -17, -Math.PI / 2);

  const tree = (x, z) => {
    solid.cyl(0.24, 0.34, 2.2, x, 5, z, C.wood, 6);
    solid.cone(1.2, 2.8, x, 7.0, z, C.leaf1, 7);
    solid.cone(1.0, 2.4, x, 8.6, z, C.leaf2, 7);
  };
  for (const [x, z] of [[17.5, 15.5], [15.5, 17.5], [-17.5, 15.5], [-15.5, 17.5], [17.5, -15.5], [15.5, -17.5], [-17.5, -15.5], [-15.5, -17.5]]) tree(x, z);

  // ===== Square base tier with slight batter (~44 high) =====
  const baseY0 = 8;
  const baseH = 44;
  const baseTop = baseY0 + baseH; // 52
  const aB = 13.5;
  const aT = 12;
  const halfAt = (y) => aB - (aB - aT) * ((y - baseY0) / baseH);

  solid.cyl(aT * 1.4142, aB * 1.4142, baseH, 0, baseY0, 0, C.lime, 4, { ry: Math.PI / 4 });
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    solid.box(1.6, baseH, 1.6, (aB - 0.7) * sx, baseY0, (aB - 0.7) * sz, C.lime2);
  }

  const nLv = 10;
  for (let l = 0; l < nLv; l++) {
    const y = baseY0 + 1.6 + l * (baseH / nLv);
    const a = halfAt(y);
    sqCornice(solid, a, y, 0.5, 0.12, l % 2 ? C.band : C.lime2);
    sqWindows(solid, a, y + 0.6, 0.9, 1.5, 6, C.window);
  }

  // relief frieze of dentils under the crown
  const fy = baseTop - 2.2;
  for (let s = -aT + 0.6; s <= aT - 0.6; s += 0.9) {
    solid.box(0.35, 0.7, 0.35, s, fy, aT + 0.1, C.band);
    solid.box(0.35, 0.7, 0.35, s, fy, -(aT + 0.1), C.band);
    solid.box(0.35, 0.7, 0.35, aT + 0.1, fy, s, C.band);
    solid.box(0.35, 0.7, 0.35, -(aT + 0.1), fy, s, C.band);
  }
  // relief panel band at mid height
  const ry = baseY0 + 22;
  const ra = halfAt(ry);
  for (let i = 0; i < 16; i++) {
    const p = (-1 + (2 * i + 1) / 16) * (ra - 1.5);
    solid.box(0.55, 0.55, 0.16, p, ry, ra + 0.05, C.band);
    solid.box(0.55, 0.55, 0.16, p, ry, -(ra + 0.05), C.band);
    solid.box(0.16, 0.55, 0.55, ra + 0.05, ry, p, C.band);
    solid.box(0.16, 0.55, 0.55, -(ra + 0.05), ry, p, C.band);
  }
  sqWindows(solid, aT, baseTop - 1.4, 0.8, 1.2, 4, C.window);

  // crown cornice + platform (52 -> 54.4)
  solid.box(aT * 2 + 2.6, 1.4, aT * 2 + 2.6, 0, baseTop, 0, C.lime2);
  solid.box(aT * 2 + 1.6, 1.0, aT * 2 + 1.6, 0, baseTop + 1.4, 0, C.band);
  balustrade(solid, 13.3, 54.4, 26, C.lime2);

  // Grand entrance portico on the +z face
  solid.box(3.4, 3.2, 0.9, 0, baseY0, aB + 0.1, C.window);
  solid.arch(1.7, 0.6, 1.3, 0, baseY0 + 3.2, aB + 0.1, C.stoneEdge, 8);
  solid.box(6.5, 1.1, 2.0, 0, baseY0, aB + 1.5, C.lime2);
  solid.box(7.6, 0.5, 1.4, 0, baseY0 - 0.5, aB + 1.2, C.stoneDark);
  column(solid, -2.6, baseY0, aB + 1.6, 4.2, C.lime);
  column(solid, 2.6, baseY0, aB + 1.6, 4.2, C.lime);
  solid.gable(7.6, 2.2, 1.6, 0, baseY0 + 4.2, aB + 1.6, C.band);
  for (let i = 0; i < 4; i++) {
    solid.box(7 - i * 0.7, 0.55, 0.85, 0, 7.1 - i * 0.55, aB + 2.4 + i * 0.7, C.lime2);
  }

  // Corner Triton statues on the base-tier platform
  const triton = (x, z) => {
    solid.box(1.5, 0.5, 1.5, x, 54.4, z, C.stoneDark);
    solid.cyl(0.45, 0.65, 1.9, x, 54.9, z, C.bronze, 8);
    solid.box(0.9, 1.0, 0.5, x, 56.8, z, C.bronze);
    solid.sphere(0.4, x, 58.1, z, C.bronze, 8);
    solid.box(0.25, 1.1, 0.22, x - 0.7, 57.1, z, C.bronze);
    solid.box(0.25, 1.1, 0.22, x + 0.7, 57.1, z, C.bronze);
    solid.cone(0.3, 1.1, x + 0.95, 57.1, z, C.bronzeDark, 6);
  };
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) triton((aT - 0.6) * sx, (aT - 0.6) * sz);

  // ===== Octagonal middle tier (~26 high) =====
  const midY = 55;
  const midH = 26;
  const midR = 8.6;
  solid.cyl(midR + 0.9, midR + 1.7, 0.9, 0, 54.4, 0, C.band, 8);
  solid.cyl(midR, midR, midH, 0, midY, 0, C.lime, 8);
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    solid.box(0.9, midH, 0.8, Math.sin(a) * midR, midY, Math.cos(a) * midR, C.lime2, { ry: a });
    solid.box(0.7, 0.5, 0.6, Math.sin(a) * midR, midY + 0.3, Math.cos(a) * midR, C.stoneDark, { ry: a });
    solid.box(0.7, 0.5, 0.6, Math.sin(a) * midR, midY + midH - 0.8, Math.cos(a) * midR, C.stoneDark, { ry: a });
  }
  for (let l = 0; l < 4; l++) {
    const y = midY + 1.3 + l * 6.2;
    solid.cyl(midR + 0.5, midR + 0.5, 0.5, 0, y, 0, l % 2 ? C.band : C.lime2, 8);
    ringWindows(solid, midR, y + 0.8, 1.5, 1.0, 8, C.window);
  }
  // dentil frieze at octagon crown
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    solid.box(0.4, 0.6, 0.4, Math.sin(a) * (midR + 0.4), midY + midH - 1.6, Math.cos(a) * (midR + 0.4), C.band, { ry: a });
  }
  solid.cyl(midR + 0.6, midR + 0.6, 0.8, 0, midY + midH - 0.8, 0, C.band, 8);
  solid.cyl(midR + 1.3, midR + 0.8, 1.3, 0, midY + midH, 0, C.lime2, 8);
  ringBalustrade(solid, midR + 1.5, midY + midH + 1.2, 20, C.lime2);
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    solid.box(0.6, 0.3, 0.6, Math.sin(a) * (midR + 1.2), midY + midH + 1.1, Math.cos(a) * (midR + 1.2), C.stoneDark);
  }

  // ===== Cylindrical lantern tier (~15 high) =====
  const topY = 82;
  const topH = 16;
  const topR = 6.2;
  solid.cyl(topR + 0.3, topR + 1.0, 0.8, 0, topY - 0.8, 0, C.band, 12);
  solid.cyl(topR, topR, topH, 0, topY, 0, C.lime, 12);
  for (let l = 0; l < 3; l++) {
    const y = topY + 1.3 + l * 4.9;
    solid.cyl(topR + 0.4, topR + 0.4, 0.45, 0, y, 0, l % 2 ? C.band : C.lime2, 12);
    ringWindows(solid, topR, y + 0.7, 1.6, 0.85, 12, C.window);
  }
  solid.cyl(topR + 0.9, topR + 0.4, 1.4, 0, topY + topH, 0, C.lime2, 12);

  // ===== Colonnaded lantern: ring of columns around the fire chamber =====
  const lanY = 98;
  const lanR = 4.0;
  const lanH = 5;
  solid.cyl(lanR + 0.8, topR + 0.5, 1.0, 0, lanY, 0, C.lime2, 12);
  for (let f = 0; f < 8; f++) {
    const a = Math.PI / 8 + (f * Math.PI) / 4;
    const cx = Math.sin(a) * lanR;
    const cz = Math.cos(a) * lanR;
    solid.cyl(0.26, 0.32, lanH, cx, lanY + 1.0, cz, C.lime2, 8);
    solid.box(0.62, 0.28, 0.62, cx, lanY + 1.0 + lanH, cz, C.stoneDark);
  }
  solid.cyl(lanR + 0.8, lanR + 0.8, 0.5, 0, lanY + 1.0 + lanH, 0, C.lime2, 12);

  // Fire pedestal + glowing flame + polished bronze mirror
  solid.cyl(2.2, 2.4, 1.0, 0, lanY + 0.4, 0, C.stoneDark, 12);
  solid.cyl(1.2, 1.6, 0.6, 0, lanY + 1.4, 0, C.bronzeDark, 10);
  solid.sphere(1.15, 0, lanY + 2.7, 0, C.fire, 8);
  solid.cone(0.9, 1.8, 0, lanY + 3.5, 0, C.fireCore, 8);
  solid.sphere(0.5, 0, lanY + 5.4, 0, C.fire, 6);
  solid.cyl(0.85, 0.9, 0.18, 0, lanY + 2.9, -1.7, C.bronze2, 10, { rx: Math.PI / 2 });

  // Glowing glass lantern between the columns (warm fire glow)
  glass.cyl(lanR + 0.2, lanR + 0.2, 3.4, 0, lanY + 1.3, 0, 0xffc070, 12);

  // ===== Dome + bronze statue of Zeus/Poseidon =====
  const domeY = lanY + 1.0 + lanH + 0.5; // ~104.5
  solid.dome(lanR + 0.6, 0, domeY, 0, C.lime2, 12);
  solid.cyl(0.7, 0.9, 0.6, 0, domeY + 1.6, 0, C.bronzeDark, 8);

  const PY = domeY + 0.4;
  solid.box(1.4, 0.4, 1.4, 0, PY, 0, C.bronzeDark);
  solid.box(0.55, 1.6, 0.4, -0.24, PY + 0.4, 0, C.bronze);
  solid.box(0.55, 1.6, 0.4, 0.24, PY + 0.4, 0, C.bronze);
  solid.box(1.0, 1.7, 0.5, 0, PY + 2.0, 0, C.bronze2);
  solid.sphere(0.45, 0, PY + 3.2, 0, C.bronze, 8);
  solid.box(0.24, 1.2, 0.24, -0.85, PY + 2.4, 0, C.bronze);
  solid.box(0.24, 1.2, 0.24, 0.85, PY + 2.5, 0, C.bronze);
  solid.cyl(0.09, 0.11, 1.7, 0.85, PY + 3.5, 0, C.bronzeDark, 6);
  solid.cyl(0.05, 0.05, 0.6, 0.78, PY + 5.1, -0.12, C.bronzeDark, 6);
  solid.cyl(0.05, 0.05, 0.6, 0.92, PY + 5.1, -0.12, C.bronzeDark, 6);
  solid.cyl(0.05, 0.05, 0.7, 0.85, PY + 5.1, 0, C.bronzeDark, 6);

  // ===== Ceremonial causeway / viaduct rising from the sea (+z side) =====
  const rampTop = (z) => 5 - (z - 20) * (4.5 / 8);
  for (const zz of [22, 24, 26]) {
    solid.box(7.4, rampTop(zz) + 0.5, 1.1, 0, -0.5, zz, C.lime2);
  }
  for (let i = 0; i < 7; i++) {
    const z0 = 20.6 + i;
    const y = rampTop(z0);
    solid.box(7.8, 0.55, 1.05, 0, y, z0, C.lime);
    solid.box(0.5, 1.0, 1.05, 3.65, y, z0, C.stoneDark);
    solid.box(0.5, 1.0, 1.05, -3.65, y, z0, C.stoneDark);
  }
  for (const zz of [23, 25, 26.4]) {
    solid.arch(1.35, 0.5, 7.2, 0, 0.3, zz, C.stoneEdge, 8, { ry: Math.PI / 2 });
  }
  for (let i = 0; i < 5; i++) {
    const z0 = 21 + i * 1.4;
    const y = rampTop(z0);
    solid.box(0.6, 1.2, 0.16, 4.3, y, z0, C.bronze2);
    solid.box(0.6, 1.2, 0.16, -4.3, y, z0, C.bronze2);
  }

  // ===== Stone quays + bollards flanking the causeway mouth =====
  const quay = (sx) => {
    solid.box(9, 1.6, 5.5, sx * 13, -0.5, 24.6, C.quay);
    solid.box(9.8, 0.4, 6, sx * 13, 1.1, 24.6, C.lime2);
    for (let i = 0; i < 5; i++) {
      const z = 22.5 + i * 0.95;
      solid.cyl(0.34, 0.46, 0.9, sx * 13 - 4.2, 1.2, z, C.bollard, 6);
      solid.cyl(0.34, 0.46, 0.9, sx * 13 + 4.2, 1.2, z, C.bollard, 6);
    }
  };
  quay(1); quay(-1);

  const torch = (x, y, z) => {
    solid.cyl(0.12, 0.16, 2.6, x, y, z, C.bronzeDark, 6);
    solid.sphere(0.3, x, y + 2.7, z, C.fire, 6);
    solid.cone(0.22, 0.8, x, y + 2.9, z, C.fireCore, 6);
  };
  torch(5.5, 5, 20.6); torch(-5.5, 5, 20.6);
  lion(5.6, 5, 21.2, 0); lion(-5.6, 5, 21.2, 0);

  // ===== Two moored galleys =====
  const ship = (x, z, ry, second) => {
    solid.group({ x, y: 0, z, ry }, (s) => {
      s.box(3.4, 1.8, 11, 0, -0.4, 0, C.hull);
      s.box(2.6, 1.5, 4, 0, -0.2, 6.2, C.hull2);
      s.box(2.2, 0.6, 2, 0, 1.0, 7.8, C.hull2);
      s.box(3.6, 0.25, 11.4, 0, 1.2, 0, C.hull3);
      const mz = second ? 1 : -1.5;
      s.cyl(0.22, 0.3, 9.5, 0, 1.4, mz, C.wood, 6);
      s.box(5, 0.12, 0.14, 0, 8.4, mz, C.wood);
      s.box(0.12, 4.8, 3.6, 0, 6.2, mz, C.sail);
      s.gable(0.12, 2.4, 3.0, 0, 9.2, mz, C.sail2);
      if (second) {
        s.cyl(0.16, 0.2, 7, 0, 1.4, 4, C.wood, 6);
        s.box(3.4, 0.1, 0.12, 0, 6.6, 4, C.wood);
        s.box(0.1, 3.2, 2.6, 0, 5.0, 4, C.sail);
      }
    });
  };
  ship(17.5, 24, -Math.PI / 2, false);
  ship(-17.5, 24, Math.PI / 2, true);

  return {
    solid: solid.build(),
    glass: glass.build(),
    name: '法罗斯灯塔',
    height: 111,
    radius: 28,
  };
}
