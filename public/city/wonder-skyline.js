import { createGeo } from './geo.js';

const TIERS = [
  { y0: 16, y1: 51, r: 8.5 },
  { y0: 51, y1: 86, r: 7.6 },
  { y0: 86, y1: 121, r: 6.7 },
  { y0: 121, y1: 150, r: 5.8 },
];

export function buildSkylineTowers() {
  const solid = createGeo();
  const glass = createGeo();

  const C = {
    plinth: 0x4c443b,
    step: 0x63584d,
    stepLight: 0x73675b,
    podium: 0x6e6358,
    podiumLight: 0x827568,
    podiumDark: 0x5c5348,
    core: 0x46505a,
    band: 0xd9dee2,
    spandrel: 0x9aa4ad,
    fin: 0xb8c0c7,
    finDark: 0x8b9299,
    crown: 0x8b9299,
    crownDark: 0x747b82,
    light: 0xffefbf,
    spire: 0xcbd2d8,
    spireBright: 0xe8edf1,
    glassMain: 0x7aa6c7,
    glassDark: 0x5883a8,
    glassTower: 0x6f9ec0,
    canopy: 0x9aa1a7,
    frame: 0x6f6a60,
    bridge: 0x8b9299,
    water: 0x3f7f9e,
    poolRim: 0x8a8578,
    trunk: 0x7a6042,
    palm: 0x4f7d3c,
    palmDark: 0x3e6230,
    flag: 0xb83b32,
    gold: 0xe3b34a,
    pole: 0xd8d4ca,
    plaza: 0xcfc6b4,
    pavers: 0xc4b9a4,
    helipad: 0x5c6369,
    helipadH: 0xdfe3e6,
    roof: 0x8a8f94,
    garden: 0x5c7d46,
    wall: 0x7d7468,
  };

  const apothem = (r) => r * Math.cos(Math.PI / 8);
  const faceWidth = (r) => 2 * r * Math.sin(Math.PI / 8);

  const ring = (g, r, y, h, w, d, hex, out = 0) => {
    const ap = apothem(r) + out;
    for (let f = 0; f < 8; f++) {
      const a = Math.PI / 8 + (f * Math.PI) / 4;
      g.box(w, h, d, Math.sin(a) * ap, y, Math.cos(a) * ap, hex, { ry: a });
    }
  };

  const starPoints = (g, r, y, h, hex) => {
    for (let f = 0; f < 8; f++) {
      const a = (f * Math.PI) / 4;
      g.box(0.95, h, 2.2, Math.sin(a) * (r - 0.2), y, Math.cos(a) * (r - 0.2), hex, { ry: a });
    }
  };

  const mullions = (g, r, y, h, hex) => {
    const ap = apothem(r) + 0.02;
    const fw = faceWidth(r);
    for (let f = 0; f < 8; f++) {
      const a = Math.PI / 8 + (f * Math.PI) / 4;
      for (let k = -1; k <= 1; k++) {
        const t = k * fw * 0.27;
        g.box(0.35, h, 0.5, Math.sin(a) * ap + Math.cos(a) * t, y, Math.cos(a) * ap - Math.sin(a) * t, hex, { ry: a });
      }
    }
  };

  const corners = (g, r, y, h, hex) => {
    for (let f = 0; f < 8; f++) {
      const a = (f * Math.PI) / 4;
      g.box(0.85, h, 0.85, Math.sin(a) * r, y, Math.cos(a) * r, hex, { ry: a });
    }
  };

  const strut = (g, x1, y1, x2, y2, w, d, hex) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const rz = Math.atan2(dx, dy);
    g.box(w, len, d, (x1 + x2) / 2, (y1 + y2) / 2, 0, hex, { rz });
  };

  const towerStructure = (g) => {
    for (let ti = 0; ti < TIERS.length; ti++) {
      const { y0, y1, r } = TIERS[ti];
      const h = y1 - y0;
      g.cyl(r - 1.1, r - 1.1, h, 0, y0, 0, C.core, 8);
      starPoints(g, r, y0, h, C.fin);
      mullions(g, r, y0, h, C.fin);
      corners(g, r, y0, h, C.step);
      const levels = Math.floor(h / 4);
      for (let li = 0; li <= levels; li++) {
        const y = y0 + li * 4;
        if (y > y1 - 1.4) continue;
        ring(g, r, y, 0.6, faceWidth(r), 0.62, C.band, 0.04);
        if (li % 2 === 1) ring(g, r, y + 0.65, 0.3, faceWidth(r), 1.1, C.spandrel, 0.16);
      }
      ring(g, r, y1 - 0.5, 0.5, faceWidth(r), 0.9, C.crownDark, 0.1);
    }

    for (let i = 1; i < TIERS.length; i++) {
      const prev = TIERS[i - 1];
      const next = TIERS[i];
      g.cyl(next.r + 0.7, prev.r + 0.7, 0.7, 0, next.y0 - 0.35, 0, C.band, 8);
      g.cyl(next.r + 0.25, next.r + 0.25, 0.35, 0, next.y0 + 0.35, 0, C.crownDark, 8);
      ring(g, prev.r + 0.4, next.y0 - 0.35, 0.35, faceWidth(prev.r + 0.4), 0.8, C.crownDark, 0.1);
    }

    const top = 150;
    g.cyl(5.8, 6.2, 1.0, 0, top - 0.5, 0, C.crownDark, 8);
    for (let f = 0; f < 8; f++) {
      const a = (f * Math.PI) / 4;
      g.box(1.1, 2.6, 1.1, Math.sin(a) * 5.2, top - 1.4, Math.cos(a) * 5.2, C.crown, { ry: a });
    }
    for (let i = 0; i < 3; i++) {
      g.ring(4.6 - i * 1.0, 0.22, 0, top + 0.6 + i * 1.2, 0, C.light, 12);
    }

    g.cyl(1.6, 2.0, 4, 0, top, 0, C.spire, 8);
    g.cyl(1.0, 1.6, 5, 0, top + 4, 0, C.spire, 8);
    g.cyl(0.55, 1.0, 6, 0, top + 9, 0, C.spireBright, 8);
    g.cyl(0.28, 0.55, 7, 0, top + 15, 0, C.spireBright, 8);
    g.cyl(0.12, 0.28, 7, 0, top + 22, 0, C.spireBright, 8);
    g.cone(0.24, 6, 0, top + 29, 0, C.spireBright, 8);
    g.sphere(0.34, 0, top + 35, 0, C.light, 8);
  };

  const towerGlass = (g) => {
    for (let ti = 0; ti < TIERS.length; ti++) {
      const { y0, y1, r } = TIERS[ti];
      const h = y1 - y0;
      const ap = apothem(r) + 0.02;
      const fw = faceWidth(r);
      const levels = Math.floor(h / 4);
      for (let li = 0; li < levels; li++) {
        const y = y0 + li * 4;
        for (let f = 0; f < 8; f++) {
          const a = Math.PI / 8 + (f * Math.PI) / 4;
          g.box(fw - 0.3, 3.2, 0.2, Math.sin(a) * ap, y + 0.7, Math.cos(a) * ap, ti % 2 ? C.glassDark : C.glassTower, { ry: a });
        }
      }
    }
  };

  const tower = (tx) => {
    solid.group({ x: tx }, (g) => towerStructure(g));
    glass.group({ x: tx }, (g) => towerGlass(g));
  };

  const satelliteSolid = (g, height, r, padKind) => {
    g.cyl(r - 1.0, r - 1.0, height, 0, 0, 0, C.core, 8);
    const floors = Math.floor(height / 4);
    for (let li = 0; li <= floors; li++) {
      const y = li * 4;
      if (y > height - 1.5) break;
      ring(g, r, y, 0.55, faceWidth(r), 0.6, C.band, 0.04);
    }
    for (let f = 0; f < 8; f++) {
      const a = (f * Math.PI) / 4 + Math.PI / 8;
      g.box(0.4, height, 0.5, Math.sin(a) * apothem(r), 0, Math.cos(a) * apothem(r), C.fin, { ry: a });
    }
    if (padKind === 'helipad') {
      g.cyl(r + 1.5, r + 1.5, 0.7, 0, height, 0, C.helipad, 8);
      g.ring(r + 0.3, 0.16, 0, height + 0.7, 0, C.helipadH, 14);
      g.cyl(0.5, 0.5, 0.25, 0, height + 0.7, 0, C.helipadH, 8);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.box(1.4, 0.1, 0.28, Math.cos(a) * (r * 0.6), height + 0.95, Math.sin(a) * (r * 0.6), C.helipadH, { ry: a });
      }
    } else {
      g.cyl(r + 1.3, r + 1.3, 0.5, 0, height, 0, C.roof, 8);
      g.cyl(r - 0.2, r - 0.2, 0.8, 0, height + 0.5, 0, C.garden, 8);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const tx = Math.cos(a) * (r - 1.0);
        const tz = Math.sin(a) * (r - 1.0);
        g.cyl(0.12, 0.2, 2.2, tx, height + 0.9, tz, C.trunk, 6);
        g.sphere(0.9, tx, height + 3.6, tz, C.palm, 8);
      }
    }
  };

  const satellite = (tx, tz, height, r, padKind) => {
    solid.group({ x: tx, z: tz }, (g) => satelliteSolid(g, height, r, padKind));
    glass.group({ x: tx, z: tz }, (g) => g.cyl(r, r, height - 0.4, 0, 0.2, 0, C.glassDark, 8, { ry: Math.PI / 8 }));
  };

  const palm = (g, x, z, s = 1) => {
    const ty = 5.5 * s;
    g.cyl(0.14 * s, 0.26 * s, ty, x, 0, z, C.trunk, 6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const fx = x + Math.sin(a) * 1.1 * s;
      const fz = z + Math.cos(a) * 1.1 * s;
      g.box(2.6 * s, 0.07 * s, 0.4 * s, fx, ty, fz, C.palmDark, { rz: -0.4, ry: a });
    }
    g.sphere(0.5 * s, x, ty + 0.1 * s, z, C.palm, 8);
  };

  const flagpole = (g, x, z, y) => {
    g.cyl(0.14, 0.2, 10, x, y, z, C.pole, 6);
    g.box(2.6, 1.5, 0.08, x + 1.4, y + 8, z, C.flag);
    g.sphere(0.22, x, y + 10, z, C.gold, 6);
  };

  // --- Podium mall (4 storeys) ---
  solid.box(46, 1, 36, 0, 0, 0, C.plinth);
  solid.box(42, 15, 32, 0, 1, 0, C.podium);
  for (let s = 1; s <= 4; s++) {
    const y = 1 + s * 3.6 - 0.3;
    solid.box(42.4, 0.5, 32.4, 0, y, 0, s % 2 ? C.podiumLight : C.podiumDark);
  }
  solid.box(42.8, 0.8, 32.8, 0, 15.8, 0, C.podiumDark);
  for (const x of [-19, 19]) {
    for (const z of [-14, 14]) {
      solid.box(1.2, 15, 1.2, x, 1, z, C.podiumLight);
    }
  }
  for (let i = -8; i <= 8; i += 2) {
    solid.box(0.7, 15, 0.8, i, 1, 16.1, C.podiumLight);
  }

  // Glass atrium: front curtain wall, side glazing and a dome skylight.
  glass.box(14, 12, 0.5, 0, 2, 16.25, C.glassMain);
  glass.box(0.5, 12, 12, -21.25, 2, 0, C.glassDark);
  glass.box(0.5, 12, 12, 21.25, 2, 0, C.glassDark);
  glass.dome(6.5, 0, 15, 0, C.glassMain, 14);
  solid.box(1.2, 2.4, 1.2, -7, 1, 16.1, C.wall);
  solid.box(1.2, 2.4, 1.2, 7, 1, 16.1, C.wall);

  // Entrance canopy and steps.
  solid.box(24, 0.7, 10, 0, 14.6, 20.5, C.canopy);
  solid.box(0.6, 13.6, 0.6, -9, 1, 24.6, C.podiumDark);
  solid.box(0.6, 13.6, 0.6, 9, 1, 24.6, C.podiumDark);
  solid.box(24, 0.4, 1.4, 0, 14.1, 18.8, C.podiumDark);
  for (let i = 0; i < 4; i++) {
    solid.box(20 - i * 3, 0.35, 1.1, 0, 0.35 + i * 0.35, 17.6 + i * 1.1, C.stepLight);
  }
  glass.box(8, 6, 0.4, 0, 1, 16.4, C.glassMain);

  // --- Skybridge (two storeys) with A-frame support ---
  strut(solid, -9, 16, 0, 66, 0.7, 0.7, C.frame);
  strut(solid, 9, 16, 0, 66, 0.7, 0.7, C.frame);
  solid.box(18.4, 0.7, 0.7, 0, 41, 0, C.frame);
  solid.box(22, 0.8, 7, 0, 66, 0, C.bridge);
  solid.box(22, 0.5, 7, 0, 72, 0, C.bridge);
  solid.box(22, 0.8, 7, 0, 77.2, 0, C.bridge);
  solid.box(0.5, 10.4, 7, -11, 67, 0, C.bridge);
  solid.box(0.5, 10.4, 7, 11, 67, 0, C.bridge);
  glass.box(22, 10.4, 0.5, 0, 66.8, 3.2, C.glassMain);
  glass.box(22, 10.4, 0.5, 0, 66.8, -3.2, C.glassMain);
  for (let i = -10; i <= 10; i += 2) {
    solid.box(0.25, 10.4, 0.6, i, 66.8, 3.2, C.fin);
    solid.box(0.25, 10.4, 0.6, i, 66.8, -3.2, C.fin);
    strut(solid, i - 0.9, 66.9, i + 0.9, 71.9, 0.18, 0.5, C.finDark);
    strut(solid, i + 0.9, 66.9, i - 0.9, 71.9, 0.18, 0.5, C.finDark);
  }
  solid.ring(6.2, 0.2, 0, 78, 0, C.light, 12);

  // --- Plaza, fountain, palms, flagpoles ---
  solid.box(44, 0.5, 18, 0, 0, 24, C.plaza);
  for (let i = -20; i <= 20; i += 5) {
    solid.box(0.4, 0.52, 18, i, 0, 24, C.pavers);
  }
  for (let i = 16; i <= 32; i += 5) {
    solid.box(44, 0.52, 0.4, 0, 0, i, C.pavers);
  }

  const fx = 0, fz = 25;
  solid.ring(4.5, 0.5, fx, 0.55, fz, C.poolRim, 20);
  solid.cyl(4.4, 4.4, 0.3, fx, 0.25, fz, C.poolRim, 16);
  solid.cyl(4.0, 4.0, 0.2, fx, 0.55, fz, C.water, 16);
  solid.cyl(0.5, 0.5, 1.2, fx, 0.55, fz, C.poolRim, 8);
  solid.cyl(0.18, 0.18, 2.6, fx, 1.75, fz, C.spireBright, 6);
  solid.sphere(0.5, fx, 4.4, fz, C.spireBright, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    solid.cyl(0.1, 0.1, 1.6, fx + Math.cos(a) * 3.2, 0.55, fz + Math.sin(a) * 3.2, C.spireBright, 5);
  }

  for (const [px, pz] of [[-18, 22], [18, 22], [-18, 29], [18, 29], [-8, 30], [8, 30]]) {
    palm(solid, px, pz, 0.95);
  }

  flagpole(solid, -18, 12, 16);
  flagpole(solid, 18, 12, 16);
  flagpole(solid, -18, -12, 16);
  flagpole(solid, 18, -12, 16);

  // Benches and planters around the plaza edge.
  for (const [bx, bz] of [[-13, 32], [13, 32], [-22, 25], [22, 25]]) {
    solid.box(3, 0.4, 0.6, bx, 0.5, bz, C.stepLight);
    solid.box(0.4, 0.4, 0.6, bx - 1.2, 0.4, bz, C.stepLight);
    solid.box(0.4, 0.4, 0.6, bx + 1.2, 0.4, bz, C.stepLight);
  }
  for (const [px, pz] of [[-16, 33], [16, 33], [-24, 28], [24, 28]]) {
    solid.cyl(0.8, 0.9, 0.6, px, 0.5, pz, C.podiumDark, 8);
    solid.cyl(0.6, 0.6, 0.5, px, 1.1, pz, C.garden, 8);
    solid.sphere(0.7, px, 2.1, pz, C.palm, 8);
  }

  // --- Towers ---
  tower(-12);
  tower(12);

  // --- Satellite towers at the back corners ---
  satellite(-24, -17, 60, 4.2, 'garden');
  satellite(24, -17, 80, 4.6, 'helipad');

  return {
    solid: solid.build(),
    glass: glass.build(),
    name: '双子星塔',
    height: 185,
    radius: 29,
  };
}
