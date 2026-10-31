import { createGeo } from './geo.js';

export function buildTempleOfHeaven() {
  const g = createGeo();

  const MARBLE = 0xeee9dd;
  const MARBLE_DARK = 0xc9c2b0;
  const STONE = 0xbdb6a6;
  const RED = 0xa8322b;
  const RED_DARK = 0x8c2020;
  const BLUE = 0x2a4f8f;
  const BLUE_DARK = 0x1f3c6e;
  const GOLD = 0xd8a93a;
  const GOLD_DARK = 0xb8882a;
  const WOOD = 0x6b4226;
  const GREEN = 0x2f4f2a;
  const GREEN2 = 0x3a5f34;
  const TRUNK = 0x5a4632;
  const BRONZE = 0x7d6a4f;

  function angDiff(a, b) {
    let d = Math.abs(a - b) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  }

  function column(x, y, z, h, r = 0.32, col = RED) {
    g.cyl(r, r, h, x, y, z, col, 8);
    g.cyl(r * 0.6, r * 0.6, 0.24, x, y + h, z, GOLD, 8);
  }

  function balustradeRing(cx, cz, y, radius, n, postH = 0.9, skip = null) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (skip && skip.some((sa) => angDiff(a, sa) < 0.55)) continue;
      const px = cx + Math.cos(a) * radius;
      const pz = cz + Math.sin(a) * radius;
      g.box(0.26, postH, 0.26, px, y, pz, MARBLE, {});
      g.box(0.4, 0.16, 0.4, px, y + postH, pz, MARBLE, {});
    }
    g.ring(radius, 0.09, cx, y + postH, cz, MARBLE, 24);
    g.ring(radius, 0.06, cx, y + postH * 0.45, cz, MARBLE, 24);
  }

  function grandStairs(cx, cz, ry, fromRadius, topY, stepW) {
    g.group({ x: cx, z: cz, ry }, () => {
      const steps = 6;
      const stepD = 0.85;
      for (let i = 0; i < steps; i++) {
        const h = Math.max(0.3, topY * (1 - i / steps));
        g.box(stepW, h, stepD, 0, 0, fromRadius + 0.6 + i * stepD + stepD / 2, MARBLE, {});
      }
      const midZ = fromRadius + 0.6 + steps * stepD / 2;
      g.box(stepW * 0.34, topY + 0.25, steps * stepD, 0, topY / 2, midZ, MARBLE_DARK, {});
      g.box(stepW * 0.3, 0.14, steps * stepD, 0, 0.4, midZ, GOLD, {});
      g.box(0.16, topY + 0.25, steps * stepD, -stepW * 0.17, topY / 2, midZ, GOLD, {});
      g.box(0.16, topY + 0.25, steps * stepD, stepW * 0.17, topY / 2, midZ, GOLD, {});
      g.box(0.28, 1.0, steps * stepD + 1, -stepW / 2 - 0.25, topY - 0.3, midZ, MARBLE, {});
      g.box(0.28, 1.0, steps * stepD + 1, stepW / 2 + 0.25, topY - 0.3, midZ, MARBLE, {});
    });
  }

  function finial(cx, y, cz) {
    const top = 38;
    g.cyl(0.24, 0.42, 2.6, cx, y, cz, GOLD, 10);
    g.sphere(1.2, cx, y + 2.9, cz, GOLD, 12);
    g.ring(1.0, 0.1, cx, y + 3.4, cz, GOLD, 20);
    const spireBase = y + 4.0;
    g.cyl(0.16, 0.28, top - spireBase - 2.0, cx, spireBase, cz, GOLD, 10);
    g.cone(0.55, 2.0, cx, spireBase + (top - spireBase - 2.0), cz, GOLD, 12);
  }

  function hallOfPrayer(cx, cz) {
    const tiers = [
      { r: 10.5, y: 0, h: 1.8 },
      { r: 8.3, y: 1.8, h: 1.8 },
      { r: 6.8, y: 3.6, h: 1.8 },
    ];
    for (const t of tiers) {
      g.cyl(t.r, t.r * 0.96, t.h, cx, t.y, cz, MARBLE, 24);
      g.cyl(t.r * 1.02, t.r * 1.02, 0.22, cx, t.y + t.h, cz, MARBLE_DARK, 24);
      balustradeRing(cx, cz, t.y + t.h, t.r + 0.05, Math.round(t.r * 1.6), 0.9, [0, Math.PI / 2, Math.PI, Math.PI * 1.5]);
    }
    const floorY = tiers[2].y + tiers[2].h;
    for (let s = 0; s < 4; s++) grandStairs(cx, cz, s * Math.PI / 2, tiers[0].r, floorY, 6);

    const hallR = 4.8;
    g.cyl(hallR, hallR, 9.0, cx, floorY, cz, RED, 20);
    g.cyl(hallR + 0.28, hallR + 0.28, 0.5, cx, floorY + 9.0, cz, GOLD, 20);
    g.cyl(hallR + 0.1, hallR + 0.1, 1.6, cx, floorY + 6.0, cz, RED_DARK, 20);
    const nCol = 12;
    for (let i = 0; i < nCol; i++) {
      const a = (i / nCol) * Math.PI * 2;
      column(cx + Math.cos(a) * (hallR + 0.5), floorY, cz + Math.sin(a) * (hallR + 0.5), 8.8, 0.34);
      g.group({ x: cx, z: cz, ry: a }, () => {
        g.box(1.7, 2.5, 0.2, 0, floorY + 3.2, hallR + 0.05, WOOD, {});
        g.box(1.7, 0.14, 0.24, 0, floorY + 3.2 - 1.25, hallR + 0.05, GOLD, {});
        g.box(1.7, 0.14, 0.24, 0, floorY + 3.2 + 1.25, hallR + 0.05, GOLD, {});
        g.box(0.14, 2.5, 0.24, -0.5, floorY + 3.2, hallR + 0.05, RED_DARK, {});
        g.box(0.14, 2.5, 0.24, 0.5, floorY + 3.2, hallR + 0.05, RED_DARK, {});
      });
    }

    const roofs = [
      { r: 7.4, h: 5.6, y: floorY + 9.0 },
      { r: 5.6, h: 4.6, y: floorY + 9.0 + 4.2 },
      { r: 4.0, h: 4.4, y: floorY + 9.0 + 4.2 + 3.8 },
    ];
    for (const ro of roofs) {
      g.cone(ro.r, ro.h, cx, ro.y, cz, BLUE, 24);
      g.ring(ro.r, 0.13, cx, ro.y + 0.04, cz, GOLD, 28);
      g.ring(ro.r * 0.97, 0.07, cx, ro.y + 0.04, cz, BLUE_DARK, 28);
      for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2 + Math.PI / 4;
        g.sphere(0.26, cx + Math.cos(a) * ro.r, ro.y + 0.5, cz + Math.sin(a) * ro.r, GOLD, 8);
      }
    }
    const topY = roofs[2].y + roofs[2].h;
    finial(cx, topY, cz);
  }

  function causeway(z0, z1, y, w) {
    const len = z1 - z0;
    const zc = (z0 + z1) / 2;
    g.box(w, y, len, 0, 0, zc, MARBLE, {});
    g.box(w + 0.5, 0.3, len, 0, y, zc, MARBLE, {});
    for (let zz = z0 + 0.5; zz <= z1 - 0.5; zz += 1.15) {
      g.box(0.22, 0.8, 0.22, -w / 2 - 0.15, y + 0.3, zz, MARBLE, {});
      g.box(0.22, 0.8, 0.22, w / 2 + 0.15, y + 0.3, zz, MARBLE, {});
    }
    g.box(0.26, 0.14, len, -w / 2 - 0.15, y + 1.05, zc, MARBLE, {});
    g.box(0.26, 0.14, len, w / 2 + 0.15, y + 1.05, zc, MARBLE, {});
  }

  function echoWall(cx, cz) {
    const r = 6.0;
    g.cyl(r + 0.35, r + 0.35, 4.0, cx, 0, cz, RED, 24);
    g.cyl(r + 0.6, r + 0.6, 0.55, cx, 4.0, cz, BLUE, 24);
    g.ring(r + 0.6, 0.1, cx, 4.6, cz, GOLD, 28);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.box(0.42, 4.0, 0.42, cx + Math.cos(a) * (r + 0.5), 0, cz + Math.sin(a) * (r + 0.5), RED_DARK, {});
    }
    g.cyl(r - 0.6, r - 0.6, 0.1, cx, 3.9, cz, STONE, 24);
  }

  function imperialVault(cx, cz) {
    const floorY = 0.5;
    g.cyl(3.4, 3.4, 0.5, cx, 0, cz, MARBLE, 16);
    g.cyl(2.7, 2.7, 4.4, cx, floorY, cz, RED, 16);
    g.cyl(2.9, 2.9, 0.35, cx, floorY + 4.4, cz, GOLD, 16);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      column(cx + Math.cos(a) * 2.95, floorY, cz + Math.sin(a) * 2.95, 4.3, 0.22);
    }
    g.cone(3.9, 3.4, cx, floorY + 4.4, cz, BLUE, 16);
    g.ring(3.9, 0.12, cx, floorY + 4.45, cz, GOLD, 24);
    g.sphere(0.7, cx, floorY + 4.4 + 3.4 + 0.5, cz, GOLD, 10);
    g.cyl(0.12, 0.24, 1.2, cx, floorY + 4.4 + 3.4 + 0.9, cz, GOLD, 8);
  }

  function circularMound(cx, cz) {
    const tiers = [
      { r: 8.5, y: 0, h: 1.2 },
      { r: 6.6, y: 1.2, h: 1.2 },
      { r: 4.8, y: 2.4, h: 1.2 },
    ];
    for (const t of tiers) {
      g.cyl(t.r, t.r, t.h, cx, t.y, cz, MARBLE, 20);
      g.cyl(t.r * 1.02, t.r * 1.02, 0.2, cx, t.y + t.h, cz, MARBLE_DARK, 20);
      balustradeRing(cx, cz, t.y + t.h, t.r + 0.1, 16, 0.8);
    }
    g.cyl(0.9, 0.9, 0.12, cx, 3.6, cz, GOLD, 12);
    g.ring(1.6, 0.06, cx, 3.62, cz, GOLD, 20);
    g.ring(2.4, 0.06, cx, 3.62, cz, GOLD, 20);
    g.ring(3.2, 0.06, cx, 3.62, cz, GOLD, 20);
    for (let s = 0; s < 4; s++) {
      g.group({ x: cx, z: cz, ry: s * Math.PI / 2 }, () => {
        for (let i = 0; i < 4; i++) {
          g.box(3.4, 3.6 * (1 - i / 4) + 0.25, 0.7, 0, 0, 5.2 + i * 0.7 + 0.35, MARBLE, {});
        }
      });
    }
  }

  function enclosure(half) {
    const h = 6;
    g.box(half * 2, h, 1.6, 0, 0, -half, RED, {});
    g.box(half * 2, h, 1.6, 0, 0, half, RED, {});
    g.box(1.6, h, half * 2, -half, 0, 0, RED, {});
    g.box(1.6, h, half * 2, half, 0, 0, RED, {});
    g.box(half * 2 + 1, 0.5, 2.2, 0, h, -half, BLUE, {});
    g.box(half * 2 + 1, 0.5, 2.2, 0, h, half, BLUE, {});
    g.box(2.2, 0.5, half * 2 + 1, -half, h, 0, BLUE, {});
    g.box(2.2, 0.5, half * 2 + 1, half, h, 0, BLUE, {});
    g.box(half * 2, 0.14, 1.7, 0, h - 0.14, -half, GOLD, {});
    g.box(half * 2, 0.14, 1.7, 0, h - 0.14, half, GOLD, {});
    g.box(1.7, 0.14, half * 2, -half, h - 0.14, 0, GOLD, {});
    g.box(1.7, 0.14, half * 2, half, h - 0.14, 0, GOLD, {});
    for (let x = -half + 3; x <= half - 3; x += 6) {
      g.box(0.7, h + 0.5, 2.0, x, 0, -half, RED_DARK, {});
      g.box(0.7, h + 0.5, 2.0, x, 0, half, RED_DARK, {});
    }
    for (let z = -half + 3; z <= half - 3; z += 6) {
      g.box(2.0, h + 0.5, 0.7, -half, 0, z, RED_DARK, {});
      g.box(2.0, h + 0.5, 0.7, half, 0, z, RED_DARK, {});
    }
  }

  function gate(cx, cz, ry) {
    g.group({ x: cx, z: cz, ry }, () => {
      g.box(13, 4, 2.6, 0, 0, 0, RED, {});
      g.box(13, 1, 2.8, 0, 4, 0, RED, {});
      for (let i = -1; i <= 1; i++) {
        g.arch(1.4, 0.42, 0.9, i * 3.0, 1.3, 1.5, WOOD, 8, {});
        g.arch(1.4, 0.16, 1.0, i * 3.0, 1.3, 1.52, GOLD, 8, {});
      }
      g.hip(15, 2.4, 2.6, 0, 5, 0, BLUE, 0.12, {});
      g.hip(10, 1.6, 1.7, 0, 7.6, 0, BLUE_DARK, 0.1, {});
      g.sphere(0.35, 0, 9.5, 0, GOLD, 8);
    });
  }

  function cypress(x, z, s = 1) {
    g.cyl(0.16 * s, 0.22 * s, 1.0 * s, x, 0, z, TRUNK, 6);
    g.cone(1.1 * s, 2.6 * s, x, 0.8 * s, z, GREEN, 10);
    g.cone(0.8 * s, 2.2 * s, x, 2.2 * s, z, GREEN2, 10);
    g.cone(0.5 * s, 1.8 * s, x, 3.6 * s, z, GREEN, 10);
  }

  function lantern(x, y, z, s = 1) {
    g.cyl(0.1 * s, 0.1 * s, 1.4 * s, x, y, z, BRONZE, 6);
    g.box(0.6 * s, 0.7 * s, 0.6 * s, x, y + 1.4 * s, z, RED, {});
    g.box(0.7 * s, 0.1 * s, 0.7 * s, x, y + 1.3 * s, z, GOLD, {});
    g.box(0.7 * s, 0.1 * s, 0.7 * s, x, y + 2.1 * s, z, GOLD, {});
    g.dome(0.14 * s, x, y + 2.2 * s, z, GOLD, 8);
  }

  function incense(x, y, z, s = 1) {
    g.cyl(0.5 * s, 0.7 * s, 1.0 * s, x, y, z, BRONZE, 10);
    g.cyl(0.38 * s, 0.5 * s, 0.8 * s, x, y + 1.0 * s, z, BRONZE, 10);
    g.box(1.2 * s, 0.24 * s, 1.2 * s, x, y + 1.8 * s, z, GOLD, {});
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      g.cyl(0.12 * s, 0.06 * s, 1.3 * s, x + Math.cos(a) * 0.55 * s, y, z + Math.sin(a) * 0.55 * s, GOLD_DARK, 6);
    }
  }

  const HALF = 36;
  enclosure(HALF);
  gate(0, HALF, 0);
  gate(0, -HALF, Math.PI);
  gate(HALF, 0, Math.PI / 2);
  gate(-HALF, 0, -Math.PI / 2);

  hallOfPrayer(0, -16.5);
  causeway(-0.5, 6, 3.0, 5);
  echoWall(0, 12);
  imperialVault(0, 12);
  circularMound(0, 27);

  for (let z = -32; z <= 34; z += 6) { cypress(-16, z, 0.9); cypress(16, z, 0.9); }
  for (let z = -32; z <= 32; z += 7) { cypress(-24, z, 1.0); cypress(24, z, 1.0); }
  for (let z = -30; z <= 28; z += 8) { cypress(-30, z, 0.85); cypress(30, z, 0.85); }
  cypress(-7, -4, 0.8); cypress(7, -4, 0.8);
  cypress(-7, 1, 0.8); cypress(7, 1, 0.8);

  lantern(-4, 0, -26, 1); lantern(4, 0, -26, 1);
  lantern(-4, 0, 18, 1); lantern(4, 0, 18, 1);
  lantern(-7, 0, 1, 0.9); lantern(7, 0, 1, 0.9);
  incense(-9, 0, -27, 1); incense(9, 0, -27, 1);
  incense(-6, 0, 30, 0.9); incense(6, 0, 30, 0.9);
  incense(0, 0, -33, 1.1);

  const solid = g.build();
  return {
    solid,
    glass: null,
    name: '天坛',
    height: 38,
    radius: 62,
  };
}
