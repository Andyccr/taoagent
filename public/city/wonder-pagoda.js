import { createGeo } from './geo.js';

export function buildGreatPagoda() {
  const geo = createGeo();
  const glassGeo = createGeo();

  const MARBLE = 0xe8e2d4;
  const MARBLE_DARK = 0xcfc6b2;
  const PAVE = 0xb9b3a5;
  const PAVE_DARK = 0x9a9488;
  const WALL = 0xd8c9a8;
  const RED = 0xa8322a;
  const RED_DARK = 0x76201c;
  const ROOF = 0x2f5a4a;
  const ROOF_DARK = 0x224438;
  const GOLD = 0xd9b44a;
  const GOLD_DARK = 0xa8862c;
  const WOOD = 0x6b4a2f;
  const BARK = 0x5b4530;
  const BRONZE = 0x6f6047;
  const STONE = 0x8f8b80;
  const STONE_DARK = 0x726e64;
  const CYPRESS = 0x2f5233;
  const GINKGO = 0xd8b23a;
  const GLASS = 0x7fb6c9;
  const FLAG_COLORS = [0xb8302a, 0xd9b44a, 0x2f5a8a, 0x3f7a45];

  const OCT = 8;
  const ROT = -Math.PI / 8;
  const IR = Math.cos(Math.PI / 8);
  const SIDE = 2 * Math.sin(Math.PI / 8);

  const octCyl = (rTop, rBot, h, x, y, z, hex) => geo.cyl(rTop, rBot, h, x, y, z, hex, OCT, { ry: ROT });

  function balustrade(R, y, hex, gapW) {
    const ir = R * IR;
    const len = R * SIDE;
    const railH = 1.0;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      const cx = Math.sin(a) * ir;
      const cz = Math.cos(a) * ir;
      const tx = Math.cos(a);
      const tz = -Math.sin(a);
      const hasGap = k % 2 === 0;
      const spans = hasGap ? [[-len / 2, -gapW / 2], [gapW / 2, len / 2]] : [[-len / 2, len / 2]];
      for (const [s0, s1] of spans) {
        const segLen = s1 - s0;
        if (segLen < 0.2) continue;
        const mid = (s0 + s1) / 2;
        const px = cx + tx * mid;
        const pz = cz + tz * mid;
        geo.box(segLen, 0.2, 0.24, px, y + railH - 0.2, pz, hex, { ry: a });
        geo.box(segLen, 0.12, 0.16, px, y + 0.46, pz, hex, { ry: a });
        const n = Math.max(2, Math.round(segLen / 2.1));
        for (let j = 0; j <= n; j++) {
          const t = s0 + segLen * j / n;
          geo.box(0.2, railH, 0.2, cx + tx * t, y, cz + tz * t, hex);
        }
      }
    }
  }

  function stairway(a, width, outerR, innerR, baseY, topY, steps) {
    geo.group({ ry: a }, () => {
      const run = outerR - innerR;
      const d = run / steps;
      for (let i = 0; i < steps; i++) {
        const z = outerR - d * (i + 0.5);
        const top = baseY + (topY - baseY) * (i + 1) / steps;
        geo.box(width, top - baseY, d, 0, baseY, z, MARBLE_DARK);
        for (const s of [-1, 1]) {
          geo.box(0.32, top - baseY + 0.7, d, s * (width / 2 + 0.16), baseY, z, MARBLE);
        }
      }
    });
  }

  function cypress(x, z, s) {
    const y = 0.3;
    geo.cyl(0.2 * s, 0.34 * s, 1.6 * s, x, y, z, BARK, 6);
    for (let j = 0; j < 3; j++) {
      geo.cone((1.7 - j * 0.35) * s, (2.1 - j * 0.15) * s, x, y + 1.1 * s + j * 1.25 * s, z, CYPRESS, 7);
    }
  }

  function ginkgo(x, z, s) {
    const y = 0.3;
    geo.cyl(0.24 * s, 0.42 * s, 2.2 * s, x, y, z, BARK, 6);
    for (let j = 0; j < 3; j++) {
      const ox = Math.sin(j * 2.1) * 0.45 * s;
      const oz = Math.cos(j * 2.1) * 0.45 * s;
      geo.sphere((1.5 - j * 0.28) * s, x + ox, y + 2.1 * s + j * 0.9 * s, z + oz, GINKGO, 7);
    }
  }

  function stoneLantern(x, z) {
    const y = 0.3;
    geo.box(1.1, 0.35, 1.1, x, y, z, STONE_DARK);
    geo.cyl(0.18, 0.24, 1.6, x, y + 0.35, z, STONE, 6);
    geo.box(0.85, 0.2, 0.85, x, y + 1.95, z, STONE);
    geo.box(0.68, 0.8, 0.68, x, y + 2.15, z, STONE_DARK);
    glassGeo.box(0.46, 0.52, 0.46, x, y + 2.3, z, GLASS);
    geo.cone(0.68, 0.6, x, y + 2.95, z, STONE, 4);
    geo.sphere(0.14, x, y + 3.62, z, GOLD, 5);
  }

  function incenseBurner(x, z) {
    const y = 0.3;
    geo.cyl(1.0, 1.2, 0.4, x, y, z, STONE_DARK, 8);
    for (let a = 0; a < 3; a++) {
      const ang = a * Math.PI * 2 / 3 + 0.5;
      geo.cyl(0.15, 0.1, 1.0, x + Math.cos(ang) * 0.8, y + 0.4, z + Math.sin(ang) * 0.8, BRONZE, 6);
    }
    geo.cyl(1.2, 0.9, 1.0, x, y + 1.4, z, BRONZE, 8);
    geo.cyl(0.95, 1.18, 0.6, x, y + 2.4, z, BRONZE, 8);
    geo.dome(0.88, x, y + 3.0, z, BRONZE, 8);
    geo.sphere(0.2, x, y + 3.9, z, GOLD, 5);
    for (const s of [-1, 1]) {
      geo.box(0.22, 0.7, 0.22, x + s * 1.18, y + 2.55, z, BRONZE);
    }
  }

  function lion(x, z, baseY) {
    geo.box(1.5, 0.55, 1.5, x, baseY, z, STONE);
    geo.box(0.95, 0.95, 0.8, x, baseY + 0.55, z, STONE_DARK);
    geo.sphere(0.46, x, baseY + 1.7, z, STONE_DARK, 6);
    for (const s of [-1, 1]) {
      geo.box(0.22, 0.3, 0.18, x + s * 0.36, baseY + 2.02, z + 0.18, STONE);
    }
  }

  function flagLine(x1, z1, x2, z2, n) {
    const y = 0.3;
    const top = 4.4;
    geo.cyl(0.12, 0.2, top, x1, y, z1, WOOD, 6);
    geo.cyl(0.12, 0.2, top, x2, y, z2, WOOD, 6);
    const dx = x2 - x1;
    const dz = z2 - z1;
    const ry = Math.atan2(dx, dz) - Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = x1 + dx * t;
      const pz = z1 + dz * t;
      const sag = Math.sin(t * Math.PI) * 0.55;
      geo.box(0.5, 0.7, 0.08, px, y + top - 0.75 - sag, pz, FLAG_COLORS[i % FLAG_COLORS.length], { ry });
    }
  }

  // Paving and forecourt base
  geo.box(55, 0.3, 55, 0, 0, 0, PAVE);
  for (const s of [-1, 1]) {
    geo.box(54, 0.08, 1.1, 0, 0.3, s * 26.5, PAVE_DARK);
    geo.box(1.1, 0.08, 54, s * 26.5, 0.3, 0, PAVE_DARK);
  }

  // Two-tier octagonal marble plinth
  octCyl(15.5, 15.9, 1.5, 0, 0.3, 0, MARBLE);
  octCyl(13.2, 13.5, 1.5, 0, 1.8, 0, MARBLE_DARK);
  octCyl(15.6, 15.6, 0.16, 0, 1.64, 0, MARBLE);
  octCyl(13.3, 13.3, 0.16, 0, 3.14, 0, MARBLE);
  balustrade(15.1, 1.8, MARBLE, 7.2);
  balustrade(12.9, 3.3, MARBLE, 7.2);
  for (let k = 0; k < 4; k++) stairway(k * Math.PI / 2, 7, 20.5, 13.0, 0.3, 3.3, 12);

  // Thirteen octagonal storeys
  const N = 13;
  let y = 3.3;
  let roofTop = y;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const r = 11.8 - 7.6 * t;
    const bh = 6.4 - 2.0 * t;
    const eh = 2.8 - 0.8 * t;
    const ir = r * IR;
    const fl = r * SIDE;

    // Balcony ring and body
    octCyl(r + 1.0, r + 1.1, 0.45, 0, y - 0.25, 0, MARBLE_DARK);
    octCyl(r * 0.98, r * 1.02, bh, 0, y, 0, WALL);
    octCyl(r + 0.15, r + 0.15, 0.5, 0, y + 0.1, 0, RED_DARK);
    octCyl(r + 0.2, r + 0.2, 0.55, 0, y + bh - 0.55, 0, RED);

    // Eight corner columns
    for (let k = 0; k < 8; k++) {
      const av = k * Math.PI / 4 - Math.PI / 8;
      geo.box(0.75, bh, 0.75, Math.sin(av) * r * 0.99, y, Math.cos(av) * r * 0.99, RED_DARK, { ry: av });
    }

    // Alternating doors and windows
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      const fd = ir + 0.06;
      const fx = Math.sin(a) * fd;
      const fz = Math.cos(a) * fd;
      const tx = Math.cos(a);
      const tz = -Math.sin(a);
      const isDoor = (i === 0 && k === 0) || (i + k) % 2 === 1;
      if (isDoor) {
        const dh = bh * 0.62;
        geo.box(0.35, dh, 0.3, fx - tx * 0.85, y + bh * 0.06, fz - tz * 0.85, RED_DARK, { ry: a });
        geo.box(0.35, dh, 0.3, fx + tx * 0.85, y + bh * 0.06, fz + tz * 0.85, RED_DARK, { ry: a });
        geo.box(2.05, 0.35, 0.35, fx, y + bh * 0.06 + dh, fz, GOLD_DARK, { ry: a });
        glassGeo.box(1.25, dh - 0.2, 0.1, fx + Math.sin(a) * 0.16, y + bh * 0.06 + 0.1, fz + Math.cos(a) * 0.16, GLASS, { ry: a });
      } else {
        const wh = bh * 0.46;
        for (const s of [-1, 1]) {
          const ox = tx * s * 1.55;
          const oz = tz * s * 1.55;
          geo.box(1.5, wh, 0.28, fx + ox, y + bh * 0.16, fz + oz, RED_DARK, { ry: a });
          geo.box(1.7, 0.16, 0.42, fx + ox, y + bh * 0.16 - 0.16, fz + oz, GOLD_DARK, { ry: a });
          glassGeo.box(1.15, wh - 0.25, 0.1, fx + ox + Math.sin(a) * 0.15, y + bh * 0.16 + 0.12, fz + oz + Math.cos(a) * 0.15, GLASS, { ry: a });
        }
      }
    }

    // Balcony railing
    const rr = r + 0.88;
    const rir = rr * IR;
    const rfl = rr * SIDE;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      const cx = Math.sin(a) * rir;
      const cz = Math.cos(a) * rir;
      const tx = Math.cos(a);
      const tz = -Math.sin(a);
      geo.box(rfl, 0.16, 0.2, cx, y + 0.92, cz, RED_DARK, { ry: a });
      for (let j = 0; j < 3; j++) {
        const off = -rfl / 2 + rfl * j / 2;
        geo.box(0.16, 0.95, 0.16, cx + tx * off, y + 0.2, cz + tz * off, RED_DARK);
      }
    }

    // Dougong bracket band under the eave
    octCyl(r + 0.35, r + 0.35, 0.35, 0, y + bh - 0.95, 0, RED_DARK);
    const by = y + bh - 0.82;
    const bd = ir + 0.25;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      const tx = Math.cos(a);
      const tz = -Math.sin(a);
      for (let j = -1; j <= 1; j++) {
        const off = j * fl * 0.29;
        const bx = Math.sin(a) * bd + tx * off;
        const bz = Math.cos(a) * bd + tz * off;
        geo.box(0.55, 0.35, 1.25, bx, by, bz, RED_DARK, { ry: a });
        geo.box(1.05, 0.42, 0.4, bx, by + 0.3, bz, GOLD_DARK, { ry: a });
      }
    }

    // Wide flared dark-green eave
    const eaveR = r + 3.2;
    octCyl(r * 0.58, eaveR, eh, 0, y + bh, 0, ROOF);
    octCyl(eaveR * 1.03, eaveR * 0.98, 0.22, 0, y + bh - 0.02, 0, ROOF_DARK);
    octCyl(eaveR * 0.99, eaveR * 0.99, 0.18, 0, y + bh - 0.2, 0, RED_DARK);
    octCyl(eaveR * 1.02, eaveR * 1.02, 0.16, 0, y + bh + 0.05, 0, GOLD);

    // Eave corners: upturned tips, ridge beasts, hanging bells
    for (let k = 0; k < 8; k++) {
      const av = k * Math.PI / 4 - Math.PI / 8;
      const ex = Math.sin(av) * eaveR * 0.99;
      const ez = Math.cos(av) * eaveR * 0.99;
      geo.cone(0.3, 1.0, ex, y + bh + 0.08, ez, GOLD, 4);
      const fr = 0.55;
      const rx = Math.sin(av) * (r * 0.58 * (1 - fr) + eaveR * fr);
      const rz = Math.cos(av) * (r * 0.58 * (1 - fr) + eaveR * fr);
      geo.cone(0.18, 0.55, rx, y + bh + eh * (1 - fr), rz, GOLD_DARK, 4);
      geo.box(0.07, 0.5, 0.07, ex, y + bh - 0.5, ez, GOLD_DARK);
      geo.cyl(0.26, 0.12, 0.5, ex, y + bh - 1.0, ez, GOLD, 6);
      geo.sphere(0.08, ex, y + bh - 1.06, ez, GOLD_DARK, 4);
    }

    roofTop = y + bh + eh;
    y += bh + eh * 0.72;
  }

  // Gilded spire: lotus base, thirteen rings, pearl finial
  const sb = roofTop;
  octCyl(3.4, 4.0, 0.7, 0, sb, 0, GOLD_DARK);
  octCyl(2.8, 3.4, 0.8, 0, sb + 0.7, 0, GOLD);
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    geo.cone(0.55, 1.4, Math.sin(a) * 2.7, sb + 0.9, Math.cos(a) * 2.7, GOLD, 6);
  }
  octCyl(2.2, 2.8, 0.7, 0, sb + 1.5, 0, GOLD);
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8;
    geo.cone(0.4, 1.0, Math.sin(a) * 2.0, sb + 1.7, Math.cos(a) * 2.0, GOLD, 6);
  }
  octCyl(1.6, 2.2, 0.6, 0, sb + 2.2, 0, GOLD_DARK);
  octCyl(0.55, 0.8, 3.2, 0, sb + 2.8, 0, GOLD);
  for (let j = 0; j < 13; j++) {
    const ry = sb + 6.0 + j * 1.15;
    const rr = 2.3 - j * 0.115;
    geo.ring(rr, 0.16, 0, ry, 0, GOLD, 10);
    octCyl(rr * 0.6, rr * 0.6, 0.14, 0, ry - 0.07, 0, GOLD_DARK);
  }
  octCyl(0.2, 0.55, 3.0, 0, sb + 19.8, 0, GOLD);
  geo.cone(0.9, 3.0, 0, sb + 22.8, 0, GOLD, 8);
  geo.sphere(0.85, 0, sb + 26.0, 0, GOLD, 7);
  geo.sphere(1.15, 0, sb + 27.5, 0, GOLD, 8);

  // Gate hall on the +z axis
  const gz = 23.7;
  const gBase = 1.0;
  geo.box(18, 0.7, 6.4, 0, 0.3, gz, STONE);
  for (const sx of [-1, 1]) {
    geo.box(7, 3.6, 4.6, sx * 5.5, gBase, gz, WALL);
    for (const ox of [-3.2, 3.2]) {
      for (const oz of [-2.0, 2.0]) {
        geo.box(0.55, 3.6, 0.55, sx * 5.5 + ox, gBase, gz + oz, RED_DARK);
      }
    }
    glassGeo.box(2.4, 2.0, 0.12, sx * 5.5, gBase + 1.1, gz + 2.31, GLASS);
    geo.box(2.8, 0.3, 0.2, sx * 5.5, gBase + 3.0, gz + 2.31, RED_DARK);
  }
  geo.box(4.2, 1.0, 4.6, 0, gBase + 2.6, gz, RED_DARK);
  geo.box(2.2, 0.8, 0.2, 0, gBase + 2.7, gz + 2.4, GOLD);
  for (let x = -8; x <= 8; x += 2) {
    geo.box(0.5, 0.35, 0.9, x, gBase + 3.55, gz + 2.2, RED_DARK);
    geo.box(0.5, 0.35, 0.9, x, gBase + 3.55, gz - 2.2, RED_DARK);
  }
  geo.hip(19.5, 7.4, 2.4, 0, gBase + 3.6, gz, ROOF, 0.6);
  for (const sx of [-1, 1]) {
    geo.cone(0.35, 1.1, sx * 9.2, gBase + 4.2, gz, GOLD, 4);
    geo.sphere(0.3, sx * 9.2, gBase + 5.4, gz, GOLD_DARK, 5);
  }
  geo.box(6, 0.35, 1.0, 0, 0.3, gz + 3.5, STONE);
  lion(-3.2, 26.5, 1.0);
  lion(3.2, 26.5, 1.0);

  // Side halls flanking the courtyard
  for (const sx of [-1, 1]) {
    const x = sx * 23;
    const fy = 1.0;
    geo.box(5.6, 0.7, 15, x, 0.3, 0, STONE);
    geo.box(4.6, 3.2, 13.4, x, fy, 0, WALL);
    for (let z = -6; z <= 6; z += 3) {
      for (const ox of [-2.0, 2.0]) geo.box(0.5, 3.2, 0.5, x + ox, fy, z, RED_DARK);
    }
    geo.gable(16.5, 2.2, 6.6, x, fy + 3.2, 0, ROOF, { ry: Math.PI / 2 });
    glassGeo.box(0.12, 1.8, 2.4, x - sx * 2.31, fy + 1.1, 0, GLASS);
    geo.box(0.2, 0.3, 2.8, x - sx * 2.31, fy + 3.0, 0, GOLD_DARK);
    for (const z of [-7.8, 7.8]) {
      geo.cone(0.3, 0.9, x, fy + 3.3, z, GOLD_DARK, 4);
    }
  }

  // Drum and bell towers
  for (const sx of [-1, 1]) {
    const x = sx * 20;
    const z = 18;
    const isDrum = sx < 0;
    const fy = 1.1;
    geo.box(5, 0.8, 5, x, 0.3, z, STONE);
    geo.box(4.2, 3.0, 4.2, x, fy, z, WALL);
    for (const ox of [-1.9, 1.9]) {
      for (const oz of [-1.9, 1.9]) geo.box(0.45, 3.0, 0.45, x + ox, fy, z + oz, RED_DARK);
    }
    geo.hip(5.6, 5.6, 1.4, x, fy + 3.0, z, ROOF, 0.6);
    const y2 = fy + 4.2;
    geo.box(3.0, 2.2, 3.0, x, y2, z, WALL);
    for (const ox of [-1.3, 1.3]) {
      for (const oz of [-1.3, 1.3]) geo.box(0.35, 2.2, 0.35, x + ox, y2, z + oz, RED_DARK);
    }
    geo.hip(4.4, 4.4, 1.4, x, y2 + 2.2, z, ROOF, 0.6);
    geo.cyl(0.18, 0.32, 1.2, x, y2 + 3.6, z, GOLD, 6);
    geo.sphere(0.34, x, y2 + 4.8, z, GOLD, 6);
    if (isDrum) {
      geo.cyl(0.85, 0.85, 1.2, x, y2 + 0.75, z, RED, 8, { rz: Math.PI / 2 });
      geo.cyl(0.9, 0.9, 0.12, x - 0.62, y2 + 0.75, z, GOLD_DARK, 8, { rz: Math.PI / 2 });
      geo.cyl(0.9, 0.9, 0.12, x + 0.62, y2 + 0.75, z, GOLD_DARK, 8, { rz: Math.PI / 2 });
    } else {
      geo.cyl(0.62, 0.3, 0.95, x, y2 + 0.55, z, BRONZE, 8);
      geo.sphere(0.16, x, y2 + 0.45, z, GOLD_DARK, 5);
    }
  }

  // Courtyard ornaments
  for (const s of [-1, 1]) {
    incenseBurner(s * 6.5, 18.5);
    stoneLantern(s * 17.5, 13);
    stoneLantern(s * 17.5, -13);
  }
  cypress(-12, 25.5, 1.0);
  cypress(12, 25.5, 1.0);
  cypress(-13, -25, 1.1);
  cypress(13, -25, 1.1);
  ginkgo(-24.5, 23, 1.0);
  ginkgo(24.5, 23, 1.0);
  ginkgo(-24.5, -23, 1.1);
  ginkgo(24.5, -23, 1.1);
  flagLine(-18.5, -10, -18.5, 10, 12);
  flagLine(18.5, -10, 18.5, 10, 12);
  flagLine(-9, -24, 9, -24, 12);

  const solid = geo.build();
  const glass = glassGeo.build();

  return {
    solid,
    glass,
    name: '万佛塔',
    radius: 27.5,
    height: sb + 28.65,
  };
}
