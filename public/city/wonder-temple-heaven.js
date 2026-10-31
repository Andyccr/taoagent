import { createGeo } from './geo.js';

export function buildTempleOfHeaven() {
  const g = createGeo();
  const glass = createGeo();

  const MARBLE = 0xeee9dd;
  const MARBLE_DARK = 0xc9c2b0;
  const STONE = 0xbdb6a6;
  const PAVE = 0xb4ada0;
  const RED = 0xa8322a;
  const RED_DARK = 0x7e231e;
  const RED_HALL = 0xb02a22;
  const BLUE = 0x2a4a8a;
  const BLUE_DARK = 0x1f3c6e;
  const GOLD = 0xd9b13a;
  const GOLD_DARK = 0xb8882a;
  const WOOD = 0x6b4226;
  const BEAM = 0x3f7a5a;
  const GREEN = 0x2f4f2a;
  const GREEN2 = 0x3a5f34;
  const TRUNK = 0x5a4632;
  const BRONZE = 0x7d6a4f;
  const GLASS = 0xffd77a;

  function angDiff(a, b) {
    let d = Math.abs(a - b) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  }

  function column(x, y, z, h, r = 0.32, col = RED_HALL) {
    g.cyl(r, r, h, x, y, z, col, 8);
    g.cyl(r * 0.62, r * 0.62, 0.22, x, y + h, z, GOLD, 8);
    g.cyl(r * 1.08, r * 1.08, 0.16, x, y - 0.04, z, GOLD_DARK, 8);
  }

  function balustradeRing(cx, cz, y, radius, n, postH = 0.9, skip = null) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (skip && skip.some((sa) => angDiff(a, sa) < 0.5)) continue;
      const px = cx + Math.cos(a) * radius;
      const pz = cz + Math.sin(a) * radius;
      g.box(0.24, postH, 0.24, px, y, pz, MARBLE, {});
      g.box(0.4, 0.16, 0.4, px, y + postH, pz, MARBLE_DARK, {});
    }
    g.ring(radius, 0.085, cx, y + postH, cz, MARBLE, 20);
    g.ring(radius, 0.055, cx, y + postH * 0.45, cz, MARBLE, 20);
  }

  function dougongRing(cx, cz, y, radius, n, col = RED_DARK) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = cx + Math.cos(a) * radius;
      const pz = cz + Math.sin(a) * radius;
      g.group({ x: px, z: pz, ry: a }, () => {
        g.box(0.9, 0.34, 0.5, 0, y, 0, col, {});
        g.box(0.5, 0.34, 1.05, 0, y + 0.16, 0, GOLD_DARK, {});
      });
    }
    g.cyl(radius + 0.1, radius + 0.1, 0.3, cx, y, cz, col, 24);
  }

  function dragonRamp(cx, cz, ry, topY, len, width) {
    g.group({ x: cx, z: cz, ry }, () => {
      const steps = 7;
      const sd = len / steps;
      for (let i = 0; i < steps; i++) {
        const h = topY * ((i + 1) / steps);
        g.box(width * 0.34, h + 0.1, sd + 0.06, 0, 0, i * sd + sd / 2, MARBLE_DARK, {});
      }
      g.box(width * 0.12, topY + 0.08, len, 0, 0, len / 2, GOLD, {});
      for (let i = 0; i < steps; i++) {
        const zz = i * sd + sd / 2;
        g.box(width * 0.12, 0.1, sd * 0.5, 0, topY * ((i + 1) / steps) + 0.12, zz, GOLD_DARK, {});
      }
    });
  }

  function carriageStairs(cx, cz, ry, fromRadius, topY, stepW) {
    g.group({ x: cx, z: cz, ry }, () => {
      const steps = 7;
      const stepD = 0.9;
      for (let i = 0; i < steps; i++) {
        const h = Math.max(0.28, topY * (1 - i / steps));
        g.box(stepW, h, stepD, 0, 0, fromRadius + 0.5 + i * stepD + stepD / 2, MARBLE, {});
        g.box(0.3, topY - topY * (i / steps) + 0.5, stepD, -stepW / 2 - 0.2, 0, fromRadius + 0.5 + i * stepD + stepD / 2, MARBLE, {});
        g.box(0.3, topY - topY * (i / steps) + 0.5, stepD, stepW / 2 + 0.2, 0, fromRadius + 0.5 + i * stepD + stepD / 2, MARBLE, {});
      }
      const midZ = fromRadius + 0.5 + steps * stepD / 2;
      g.box(0.3, topY + 0.2, steps * stepD, -stepW / 2 - 0.2, topY / 2, midZ, MARBLE_DARK, {});
      g.box(0.3, topY + 0.2, steps * stepD, stepW / 2 + 0.2, topY / 2, midZ, MARBLE_DARK, {});
      g.box(0.36, 0.14, steps * stepD, -stepW / 2 - 0.2, topY + 0.28, midZ, MARBLE, {});
      g.box(0.36, 0.14, steps * stepD, stepW / 2 + 0.2, topY + 0.28, midZ, MARBLE, {});
    });
  }

  function finial(cx, y, cz, topY) {
    g.cyl(0.26, 0.5, 2.8, cx, y, cz, GOLD, 10);
    g.sphere(1.25, cx, y + 3.1, cz, GOLD, 12);
    glass.sphere(1.05, cx, y + 3.1, cz, GLASS, 10);
    g.ring(1.05, 0.1, cx, y + 3.6, cz, GOLD, 20);
    let sy = y + 4.4;
    for (let i = 0; i < 4; i++) {
      g.cyl(0.5 - i * 0.08, 0.6 - i * 0.08, 1.4, cx, sy, cz, GOLD, 10);
      g.ring(0.62 - i * 0.08, 0.07, cx, sy + 1.4, cz, GOLD, 18);
      sy += 1.5;
    }
    g.cyl(0.16, 0.34, topY - sy - 1.6, cx, sy, cz, GOLD, 10);
    g.cone(0.6, 1.8, cx, topY - 1.8, cz, GOLD, 12);
    glass.sphere(0.5, cx, topY - 0.9, cz, GLASS, 8);
  }

  function hallOfPrayer(cx, cz) {
    const tiers = [
      { r: 11.0, y: 0, h: 2.0 },
      { r: 9.0, y: 2.0, h: 2.0 },
      { r: 7.4, y: 4.0, h: 2.0 },
    ];
    for (const t of tiers) {
      g.cyl(t.r, t.r * 0.96, t.h, cx, t.y, cz, MARBLE, 24);
      g.cyl(t.r * 1.02, t.r * 1.02, 0.24, cx, t.y + t.h, cz, MARBLE_DARK, 24);
      balustradeRing(cx, cz, t.y + t.h, t.r + 0.05, Math.round(t.r * 1.9), 0.9, [0, Math.PI / 2, Math.PI, Math.PI * 1.5]);
    }
    const floorY = tiers[2].y + tiers[2].h;
    for (let s = 0; s < 4; s++) carriageStairs(cx, cz, s * Math.PI / 2, tiers[0].r, floorY, 5.6);
    dragonRamp(cx, cz, Math.PI, floorY, 6.6, 2.4);

    const hallR = 5.0;
    g.cyl(hallR, hallR, 11.0, cx, floorY, cz, RED_HALL, 20);
    g.cyl(hallR + 0.28, hallR + 0.28, 0.5, cx, floorY + 11.0, cz, GOLD, 20);
    g.cyl(hallR + 0.12, hallR + 0.12, 1.5, cx, floorY + 7.2, cz, RED_DARK, 20);
    g.cyl(hallR + 0.12, hallR + 0.12, 0.7, cx, floorY + 1.6, cz, BEAM, 20);
    const nCol = 12;
    for (let i = 0; i < nCol; i++) {
      const a = (i / nCol) * Math.PI * 2;
      column(cx + Math.cos(a) * (hallR + 0.5), floorY, cz + Math.sin(a) * (hallR + 0.5), 10.8, 0.34);
      g.group({ x: cx, z: cz, ry: a }, () => {
        g.box(1.9, 2.6, 0.22, 0, floorY + 3.4, hallR + 0.06, WOOD, {});
        g.box(1.9, 0.14, 0.26, 0, floorY + 3.4 - 1.3, hallR + 0.06, GOLD, {});
        g.box(1.9, 0.14, 0.26, 0, floorY + 3.4 + 1.3, hallR + 0.06, GOLD, {});
        g.box(1.9, 0.14, 0.26, 0, floorY + 2.0, hallR + 0.06, BEAM, {});
        g.box(0.14, 2.6, 0.26, -0.55, floorY + 3.4, hallR + 0.06, RED_DARK, {});
        g.box(0.14, 2.6, 0.26, 0.55, floorY + 3.4, hallR + 0.06, RED_DARK, {});
      });
    }

    const roofs = [
      { r: 8.6, h: 6.6, y: floorY + 11.0 },
      { r: 6.4, h: 5.6, y: floorY + 11.0 + 4.8 },
      { r: 4.4, h: 5.0, y: floorY + 11.0 + 4.8 + 4.2 },
    ];
    for (let k = 0; k < roofs.length; k++) {
      const ro = roofs[k];
      g.cone(ro.r, ro.h, cx, ro.y, cz, k === 1 ? BLUE_DARK : BLUE, 24);
      g.ring(ro.r, 0.14, cx, ro.y + 0.05, cz, GOLD, 28);
      dougongRing(cx, cz, ro.y - 0.3, ro.r * 1.02, 16);
      for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2 + Math.PI / 4;
        g.sphere(0.28, cx + Math.cos(a) * ro.r, ro.y + 0.55, cz + Math.sin(a) * ro.r, GOLD, 8);
      }
      for (let s = 0; s < 8; s++) {
        const a = s * Math.PI / 4;
        const bxx = cx + Math.cos(a) * ro.r;
        const bzz = cz + Math.sin(a) * ro.r;
        g.cone(0.16, 0.5, bxx, ro.y + 0.35, bzz, GOLD_DARK, 5);
      }
    }
    const topY = roofs[2].y + roofs[2].h;
    finial(cx, topY, cz, 48);
  }

  function circularMound(cx, cz) {
    const tiers = [
      { r: 8.6, y: 0, h: 1.3 },
      { r: 6.7, y: 1.3, h: 1.3 },
      { r: 4.9, y: 2.6, h: 1.3 },
    ];
    for (const t of tiers) {
      g.cyl(t.r, t.r, t.h, cx, t.y, cz, MARBLE, 20);
      g.cyl(t.r * 1.02, t.r * 1.02, 0.22, cx, t.y + t.h, cz, MARBLE_DARK, 20);
      balustradeRing(cx, cz, t.y + t.h, t.r + 0.1, Math.round(t.r * 1.4), 0.8, [Math.PI / 2, Math.PI * 1.5]);
    }
    g.cyl(0.9, 0.9, 0.14, cx, 3.9, cz, GOLD, 12);
    g.ring(1.6, 0.06, cx, 3.94, cz, GOLD, 20);
    g.ring(2.4, 0.06, cx, 3.94, cz, GOLD, 20);
    g.ring(3.2, 0.06, cx, 3.94, cz, GOLD, 20);
    for (let s = 0; s < 4; s++) {
      g.group({ x: cx, z: cz, ry: s * Math.PI / 2 }, () => {
        for (let i = 0; i < 4; i++) {
          g.box(3.4, 3.9 * (1 - i / 4) + 0.25, 0.75, 0, 0, 5.4 + i * 0.75 + 0.4, MARBLE, {});
        }
      });
    }
  }

  function echoWall(cx, cz) {
    const r = 6.4;
    g.cyl(r + 0.35, r + 0.35, 4.6, cx, 0, cz, RED, 24);
    g.cyl(r + 0.6, r + 0.6, 0.6, cx, 4.6, cz, BLUE, 24);
    g.ring(r + 0.6, 0.1, cx, 5.25, cz, GOLD, 28);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      g.box(0.4, 4.6, 0.4, cx + Math.cos(a) * (r + 0.5), 0, cz + Math.sin(a) * (r + 0.5), RED_DARK, {});
    }
    g.cyl(r - 0.7, r - 0.7, 0.12, cx, 4.5, cz, STONE, 24);
  }

  function imperialVault(cx, cz) {
    const floorY = 0.6;
    g.cyl(3.6, 3.6, 0.6, cx, 0, cz, MARBLE, 16);
    g.cyl(2.8, 2.8, 4.6, cx, floorY, cz, RED_HALL, 16);
    g.cyl(3.0, 3.0, 0.36, cx, floorY + 4.6, cz, GOLD, 16);
    g.cyl(3.0, 3.0, 0.6, cx, floorY + 1.4, cz, BEAM, 16);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      column(cx + Math.cos(a) * 3.05, floorY, cz + Math.sin(a) * 3.05, 4.5, 0.22);
    }
    g.cone(4.1, 3.6, cx, floorY + 4.6, cz, BLUE, 16);
    g.ring(4.1, 0.13, cx, floorY + 4.65, cz, GOLD, 24);
    g.sphere(0.75, cx, floorY + 4.6 + 3.6 + 0.5, cz, GOLD, 10);
    glass.sphere(0.6, cx, floorY + 4.6 + 3.6 + 0.5, cz, GLASS, 8);
    g.cyl(0.12, 0.26, 1.4, cx, floorY + 4.6 + 3.6 + 0.95, cz, GOLD, 8);
    g.cone(0.4, 1.0, cx, floorY + 4.6 + 3.6 + 1.35, cz, GOLD, 8);
  }

  function enclosure(half) {
    const h = 7.2;
    const W = 1.7;
    g.box(half * 2, h, W, 0, 0, -half, RED, {});
    g.box(half * 2, h, W, 0, 0, half, RED, {});
    g.box(W, h, half * 2, -half, 0, 0, RED, {});
    g.box(W, h, half * 2, half, 0, 0, RED, {});
    g.box(half * 2 + 0.6, 0.55, W + 0.6, 0, h, -half, BLUE, {});
    g.box(half * 2 + 0.6, 0.55, W + 0.6, 0, h, half, BLUE, {});
    g.box(W + 0.6, 0.55, half * 2 + 0.6, -half, h, 0, BLUE, {});
    g.box(W + 0.6, 0.55, half * 2 + 0.6, half, h, 0, BLUE, {});
    g.box(half * 2, 0.16, W + 0.1, 0, h - 0.18, -half, GOLD, {});
    g.box(half * 2, 0.16, W + 0.1, 0, h - 0.18, half, GOLD, {});
    g.box(W + 0.1, 0.16, half * 2, -half, h - 0.18, 0, GOLD, {});
    g.box(W + 0.1, 0.16, half * 2, half, h - 0.18, 0, GOLD, {});
    for (let x = -half + 4; x <= half - 4; x += 7) {
      g.box(0.8, h + 0.55, W + 0.4, x, 0, -half, RED_DARK, {});
      g.box(0.8, h + 0.55, W + 0.4, x, 0, half, RED_DARK, {});
    }
    for (let z = -half + 4; z <= half - 4; z += 7) {
      g.box(W + 0.4, h + 0.55, 0.8, -half, 0, z, RED_DARK, {});
      g.box(W + 0.4, h + 0.55, 0.8, half, 0, z, RED_DARK, {});
    }
  }

  function cornerTower(x, z, ry) {
    g.group({ x, z, ry }, () => {
      g.box(5.0, 6.4, 5.0, 0, 0, 0, RED_DARK, {});
      g.box(5.5, 0.6, 5.5, 0, 6.4, 0, BLUE, {});
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          g.box(0.7, 6.4, 0.7, sx * 2.1, 0, sz * 2.1, RED_DARK, {});
        }
      }
      g.hip(6.6, 6.6, 3.0, 0, 7.0, 0, BLUE, 0.5, {});
      g.hip(4.6, 4.6, 1.9, 0, 10.0, 0, BLUE_DARK, 0.4, {});
      g.sphere(0.4, 0, 12.0, 0, GOLD, 8);
    });
  }

  function lingxingGate(cx, cz, ry) {
    g.group({ x: cx, z: cz, ry }, () => {
      const w = 15;
      g.box(w, 0.9, 2.8, 0, 0, 0, MARBLE, {});
      g.box(w + 0.5, 0.4, 3.0, 0, 0.9, 0, MARBLE_DARK, {});
      const pillars = [-w / 2 + 0.5, -4.3, 0, 4.3, w / 2 - 0.5];
      for (const px of pillars) {
        g.box(0.72, 5.4, 0.72, px, 0.9, 0.5, MARBLE, {});
        g.box(0.9, 0.24, 0.9, px, 0.9, 0.5, MARBLE_DARK, {});
        g.box(0.9, 0.24, 0.9, px, 6.1, 0.5, MARBLE_DARK, {});
      }
      for (let i = -1; i <= 1; i++) {
        const ax = i * 4.3;
        g.arch(2.1, 0.5, 1.1, ax, 1.1, 0.6, MARBLE, 10, {});
        g.arch(2.1, 0.18, 1.25, ax, 1.1, 0.63, GOLD, 10, {});
        g.box(3.6, 0.4, 0.9, ax, 4.6, 0.55, MARBLE, {});
      }
      g.box(w, 0.7, 1.2, 0, 6.3, 0.5, MARBLE, {});
      g.box(w + 0.3, 0.3, 1.4, 0, 7.0, 0.5, MARBLE_DARK, {});
      for (let x = -w / 2 + 0.7; x <= w / 2 - 0.7; x += 1.15) {
        g.box(0.26, 0.85, 0.26, x, 7.3, 0.5, MARBLE, {});
        g.box(0.4, 0.14, 0.4, x, 8.15, 0.5, MARBLE, {});
      }
      g.box(w + 0.5, 0.16, 0.42, 0, 8.3, 0.5, MARBLE, {});
      for (let i = -1; i <= 1; i++) {
        g.hip(4.9, 2.6, 2.4, i * 4.3, 8.3, 0.5, BLUE, 0.25, {});
        g.sphere(0.3, i * 4.3, 9.4, 0.5, GOLD, 8);
      }
    });
  }

  function causeway(z0, z1, y, w) {
    const len = z1 - z0;
    const zc = (z0 + z1) / 2;
    g.box(w, y, len, 0, 0, zc, MARBLE, {});
    g.box(w + 0.5, 0.3, len, 0, y, zc, MARBLE_DARK, {});
    g.box(w * 0.4, 0.14, len, 0, y + 0.3, zc, STONE, {});
    for (let zz = z0 + 0.6; zz <= z1 - 0.6; zz += 1.3) {
      g.box(0.22, 0.85, 0.22, -w / 2 - 0.18, y + 0.3, zz, MARBLE, {});
      g.box(0.22, 0.85, 0.22, w / 2 + 0.18, y + 0.3, zz, MARBLE, {});
    }
    g.box(0.26, 0.15, len, -w / 2 - 0.18, y + 1.1, zc, MARBLE, {});
    g.box(0.26, 0.15, len, w / 2 + 0.18, y + 1.1, zc, MARBLE, {});
  }

  function cypress(x, z, s = 1) {
    g.cyl(0.16 * s, 0.24 * s, 1.1 * s, x, 0, z, TRUNK, 6);
    g.cone(1.15 * s, 2.8 * s, x, 0.8 * s, z, GREEN, 9);
    g.cone(0.85 * s, 2.4 * s, x, 2.3 * s, z, GREEN2, 9);
    g.cone(0.55 * s, 2.0 * s, x, 3.8 * s, z, GREEN, 9);
  }

  function lantern(x, y, z, s = 1) {
    g.cyl(0.1 * s, 0.1 * s, 1.5 * s, x, y, z, BRONZE, 6);
    g.box(0.6 * s, 0.8 * s, 0.6 * s, x, y + 1.5 * s, z, RED, {});
    glass.box(0.48 * s, 0.62 * s, 0.48 * s, x, y + 1.62 * s, z, GLASS, {});
    g.box(0.72 * s, 0.12 * s, 0.72 * s, x, y + 1.42 * s, z, GOLD, {});
    g.box(0.72 * s, 0.12 * s, 0.72 * s, x, y + 2.32 * s, z, GOLD, {});
    g.dome(0.16 * s, x, y + 2.44 * s, z, GOLD, 8);
  }

  function incense(x, y, z, s = 1) {
    g.cyl(0.5 * s, 0.75 * s, 1.0 * s, x, y, z, BRONZE, 10);
    g.cyl(0.4 * s, 0.5 * s, 0.8 * s, x, y + 1.0 * s, z, BRONZE, 10);
    g.box(1.25 * s, 0.26 * s, 1.25 * s, x, y + 1.8 * s, z, GOLD, {});
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      g.cyl(0.12 * s, 0.06 * s, 1.4 * s, x + Math.cos(a) * 0.6 * s, y, z + Math.sin(a) * 0.6 * s, GOLD_DARK, 6);
    }
  }

  function statue(x, y, z, col = MARBLE) {
    g.cyl(0.5, 0.6, 0.5, x, y, z, STONE, 8);
    g.box(0.85, 1.0, 0.7, x, y + 0.5, z, col, {});
    g.sphere(0.3, x, y + 1.7, z, col, 8);
    g.cyl(0.16, 0.16, 0.35, x, y + 1.9, z, col, 8);
  }

  function banner(x, y, z, col) {
    g.cyl(0.1, 0.16, 5.0, x, y, z, WOOD, 6);
    g.box(1.6, 2.2, 0.06, x, y + 2.4, z, col, {});
    g.box(0.5, 0.14, 0.1, x, y + 4.9, z, GOLD, {});
  }

  function fountain(x, z, s = 1) {
    g.cyl(2.2 * s, 2.6 * s, 0.5 * s, x, 0, z, STONE, 12);
    g.cyl(2.3 * s, 2.3 * s, 0.16 * s, x, 0.5 * s, z, MARBLE_DARK, 12);
    g.cyl(1.1 * s, 0.7 * s, 1.6 * s, x, 0.5 * s, z, BRONZE, 10);
    g.dome(0.6 * s, x, 2.1 * s, z, BRONZE, 10);
    g.sphere(0.24 * s, x, 2.8 * s, z, GOLD, 8);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      g.cyl(0.14 * s, 0.05 * s, 0.9 * s, x + Math.cos(a) * 1.4 * s, 0.66 * s, z + Math.sin(a) * 1.4 * s, MARBLE, 6);
    }
  }

  function stele(x, z, col = MARBLE) {
    g.box(1.1, 0.5, 2.2, x, 0, z, STONE, {});
    g.box(0.9, 2.6, 0.35, x, 0.5, z, col, {});
    g.box(1.2, 0.5, 0.5, x, 2.9, z, MARBLE_DARK, {});
    g.cone(1.0, 0.7, x, 3.4, z, GOLD, 8);
  }

  const HALF = 38;

  g.box(HALF * 2, 0.3, HALF * 2, 0, -0.2, 0, PAVE, {});
  enclosure(HALF);
  cornerTower(34, 34, Math.PI / 4);
  cornerTower(34, -34, Math.PI / 4 + Math.PI / 2);
  cornerTower(-34, 34, Math.PI / 4 - Math.PI / 2);
  cornerTower(-34, -34, Math.PI / 4 + Math.PI);

  lingxingGate(0, HALF, 0);
  lingxingGate(0, -HALF, Math.PI);
  lingxingGate(HALF, 0, Math.PI / 2);
  lingxingGate(-HALF, 0, -Math.PI / 2);

  hallOfPrayer(0, -19);
  causeway(-6, 6, 3.2, 5.2);
  echoWall(0, 13);
  imperialVault(0, 13);
  circularMound(0, 26);

  for (let z = -34; z <= 34; z += 5) { cypress(-15, z, 0.95); cypress(15, z, 0.95); }
  for (let z = -34; z <= 34; z += 5) { cypress(-23, z, 1.0); cypress(23, z, 1.0); }
  for (let z = -32; z <= 32; z += 6) { cypress(-29, z, 0.9); cypress(29, z, 0.9); }
  for (let z = -30; z <= 30; z += 5) { cypress(-11, z, 0.85); cypress(11, z, 0.85); }
  cypress(-7, -4, 0.85); cypress(7, -4, 0.85);
  cypress(-7, 2, 0.85); cypress(7, 2, 0.85);
  cypress(-7, 21, 0.85); cypress(7, 21, 0.85);

  lantern(-4, 0, -30, 1); lantern(4, 0, -30, 1);
  lantern(-4, 0, 20, 1); lantern(4, 0, 20, 1);
  lantern(-8, 0, 1, 0.9); lantern(8, 0, 1, 0.9);
  lantern(-8, 0, -13, 0.9); lantern(8, 0, -13, 0.9);
  incense(-10, 0, -30, 1.1); incense(10, 0, -30, 1.1);
  incense(-6, 0, 32, 0.9); incense(6, 0, 32, 0.9);
  incense(0, 0, -37, 1.2);

  statue(-12, 0, -28, MARBLE); statue(12, 0, -28, MARBLE);
  statue(-12, 0, -25, MARBLE_DARK); statue(12, 0, -25, MARBLE_DARK);
  statue(-14, 0, 5, MARBLE); statue(14, 0, 5, MARBLE_DARK);
  statue(-14, 0, 11, MARBLE_DARK); statue(14, 0, 11, MARBLE);
  banner(-18, 0, -12, RED); banner(18, 0, -12, BLUE);
  banner(-18, 0, -6, BLUE); banner(18, 0, -6, RED);
  banner(-18, 0, 8, RED); banner(18, 0, 8, BLUE);
  banner(-18, 0, 14, BLUE); banner(18, 0, 14, RED);

  fountain(-10, -8, 1); fountain(10, -8, 1);
  fountain(-10, 18, 0.9); fountain(10, 18, 0.9);
  stele(-9, 0, MARBLE); stele(9, 0, MARBLE_DARK);
  stele(-9, 27, MARBLE_DARK); stele(9, 27, MARBLE);
  stele(0, -32, MARBLE);

  const solid = g.build();
  const glassGeo = glass.build();
  return {
    solid,
    glass: glassGeo,
    name: '天坛',
    height: 48,
    radius: 40,
  };
}
