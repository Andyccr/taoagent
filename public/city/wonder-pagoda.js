import { createGeo } from './geo.js';

export function buildGreatPagoda() {
  const geo = createGeo();

  const STONE = '#9aa0a6';
  const STONE_DARK = '#7c828a';
  const RED = '#b53030';
  const RED_DARK = '#8c2020';
  const ROOF = '#4a4238';
  const ROOF_RIM = '#5a5145';
  const GOLD = '#d4af37';
  const GOLD_DARK = '#a8852a';
  const WOOD = '#6b4226';
  const LANTERN = '#e33c2e';
  const BRONZE = '#7d6a4f';

  const storeys = 10;
  const terraceH = 6.5;
  const firstHalf = 17;
  const lastHalf = 6;
  const bodyH = 4.6;
  const roofH = 1.7;

  // --- Stone terrace (two tiers) ---
  geo.box(44, 3, 44, 0, 0, 0, STONE);
  geo.box(36, 3.5, 36, 0, 3, 0, STONE_DARK);

  // Balustrade around the upper terrace (half = 18).
  const bHalf = 18;
  const railH = 1.1;
  const railY = terraceH - railH;
  geo.box(bHalf * 2 + 0.8, 0.3, 0.4, 0, terraceH + 0.9, -bHalf, STONE);
  geo.box(bHalf * 2 + 0.8, 0.3, 0.4, 0, terraceH + 0.9, bHalf, STONE);
  geo.box(0.4, 0.3, bHalf * 2 + 0.8, -bHalf, terraceH + 0.9, 0, STONE);
  geo.box(0.4, 0.3, bHalf * 2 + 0.8, bHalf, terraceH + 0.9, 0, STONE);
  for (let s = -bHalf + 1; s <= bHalf - 1; s += 1.7) {
    geo.box(0.5, railH, 0.5, s, railY, -bHalf, STONE_DARK);
    geo.box(0.5, railH, 0.5, s, railY, bHalf, STONE_DARK);
    geo.box(0.5, railH, 0.5, -bHalf, railY, s, STONE_DARK);
    geo.box(0.5, railH, 0.5, bHalf, railY, s, STONE_DARK);
  }

  // Stairs descending on +z from the terrace down to the ground.
  const stepN = 9;
  const stepW = 12;
  const stepD = 1.1;
  for (let i = 0; i < stepN; i++) {
    const z = bHalf + 0.6 + i * stepD;
    geo.box(stepW, terraceH * (1 - i / stepN), stepD, 0, 0, z, STONE_DARK);
  }
  geo.box(0.5, 1.2, stepN * stepD, -stepW / 2 - 0.4, 0, bHalf + 0.6 + stepN * stepD / 2 - 0.55, STONE);
  geo.box(0.5, 1.2, stepN * stepD, stepW / 2 + 0.4, 0, bHalf + 0.6 + stepN * stepD / 2 - 0.55, STONE);

  // --- Pagoda storeys ---
  let y = terraceH;
  for (let i = 0; i < storeys; i++) {
    const t = i / (storeys - 1);
    const half = firstHalf - t * (firstHalf - lastHalf);
    const hw = half * 2;

    // Body.
    geo.box(hw, bodyH, hw, 0, y, 0, RED);

    // Four corner columns.
    const cp = half - 1.4;
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      geo.box(1.4, bodyH, 1.4, cp * sx, y, cp * sz, RED_DARK);
    }

    // Balcony railing around the storey.
    const bh = half + 0.55;
    const railH2 = 0.9;
    for (let s = -bh + 1.2; s <= bh - 1.2; s += 2.8) {
      geo.box(0.22, railH2, 0.22, s, y, -bh, RED_DARK);
      geo.box(0.22, railH2, 0.22, s, y, bh, RED_DARK);
      geo.box(0.22, railH2, 0.22, -bh, y, s, RED_DARK);
      geo.box(0.22, railH2, 0.22, bh, y, s, RED_DARK);
    }
    geo.box(bh * 2 + 0.22, 0.16, 0.24, 0, y + railH2 - 0.16, -bh, WOOD);
    geo.box(bh * 2 + 0.22, 0.16, 0.24, 0, y + railH2 - 0.16, bh, WOOD);
    geo.box(0.24, 0.16, bh * 2 + 0.22, -bh, y + railH2 - 0.16, 0, WOOD);
    geo.box(0.24, 0.16, bh * 2 + 0.22, bh, y + railH2 - 0.16, 0, WOOD);

    // Door on the front (+z) side at ground storey; windows on the others.
    for (let side = 0; side < 4; side++) {
      const ry = side * (Math.PI / 2);
      const zz = half + 0.2;
      const isDoor = i === 0 && side === 0;
      if (isDoor) {
        geo.group({ ry }, () => {
          geo.arch(1.6, 0.7, 0.5, 0, y + 1.4, zz, WOOD, 8);
        });
      } else {
        for (let w = -1; w <= 1; w += 2) {
          geo.group({ ry }, () => {
            geo.box(1.1, 1.6, 0.4, w * (half * 0.55), y + bodyH * 0.55, zz, WOOD);
          });
        }
      }
    }

    // Beam ring + brackets under the eave.
    geo.box(hw + 1.2, 0.5, hw + 1.2, 0, y + bodyH - 0.25, 0, WOOD);
    const brk = half + 0.4;
    for (let s = -half; s <= half; s += half * 0.5) {
      if (Math.abs(s) > half - 0.4) continue;
      geo.box(0.7, 0.6, 0.7, s, y + bodyH - 0.6, -brk, RED_DARK);
      geo.box(0.7, 0.6, 0.7, s, y + bodyH - 0.6, brk, RED_DARK);
      geo.box(0.7, 0.6, 0.7, -brk, y + bodyH - 0.6, s, RED_DARK);
      geo.box(0.7, 0.6, 0.7, brk, y + bodyH - 0.6, s, RED_DARK);
    }

    // Second bracket row tucked closer to the body.
    const brk2 = half + 0.15;
    for (let s = -half; s <= half; s += half * 0.32) {
      if (Math.abs(s) > half - 0.3) continue;
      geo.box(0.45, 0.35, 0.45, s, y + bodyH - 0.95, -brk2, GOLD_DARK);
      geo.box(0.45, 0.35, 0.45, s, y + bodyH - 0.95, brk2, GOLD_DARK);
      geo.box(0.45, 0.35, 0.45, -brk2, y + bodyH - 0.95, s, GOLD_DARK);
      geo.box(0.45, 0.35, 0.45, brk2, y + bodyH - 0.95, s, GOLD_DARK);
    }

    // Flared hip roof.
    geo.hip(hw + 1.6, hw + 1.6, roofH, 0, y + bodyH, 0, i % 2 ? ROOF : ROOF_RIM, 0.7);

    // Gold ornaments on the upturned eave corners.
    const eh = half + 1.3;
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const cy = y + bodyH + roofH * 0.55;
      geo.sphere(0.5, eh * sx, cy, eh * sz, GOLD, 6);
      geo.cone(0.26, 1.0, eh * sx, cy + 0.3, eh * sz, GOLD, 6);
      geo.cone(0.18, 0.4, eh * sx, cy - 0.7, eh * sz, GOLD_DARK, 6);
    }

    y += bodyH + roofH * 0.85;
  }

  // --- Gold finial spire on the top roof ---
  const top = y;
  geo.cyl(0.7, 0.9, 3, 0, top, 0, GOLD, 8);
  geo.sphere(1.4, 0, top + 3, 0, GOLD, 10);
  for (let i = 0; i < 4; i++) {
    geo.ring(1.1, 0.18, 0, top + 3.6 + i * 0.55, 0, GOLD_DARK, 16);
  }
  geo.cyl(0.12, 0.35, 6, 0, top + 4.4, 0, GOLD, 8);
  geo.cone(0.8, 2.4, 0, top + 10.4, 0, GOLD, 10);

  // Tiered gilded spire above the top roof.
  for (let i = 0; i < 5; i++) {
    const sy = top + 12.8 + i * 1.3;
    const sr = 1.45 - i * 0.22;
    geo.cyl(sr * 0.72, sr, 0.5, 0, sy, 0, i % 2 ? GOLD_DARK : GOLD, 8);
    geo.ring(sr * 1.12, 0.14, 0, sy + 0.55, 0, GOLD, 10);
  }
  geo.cone(0.55, 2.6, 0, top + 19.5, 0, GOLD, 8);
  geo.sphere(0.55, 0, top + 22.3, 0, GOLD, 8);

  // --- Ceremonial plaza: lanterns at terrace corners, incense burner on the front. ---
  const lanternPost = (x, z) => {
    geo.cyl(0.35, 0.45, 2.2, x, terraceH, z, BRONZE, 8);
    geo.box(1.6, 0.4, 0.5, x, terraceH + 1.4, z, GOLD_DARK);
    geo.box(0.5, 0.4, 1.6, x, terraceH + 1.4, z, GOLD_DARK);
    geo.box(1.3, 1.4, 1.3, x, terraceH + 2.1, z, LANTERN);
    geo.cyl(0.5, 0.5, 0.3, x, terraceH + 3.0, z, GOLD, 8);
  };
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    lanternPost((bHalf - 3) * sx, (bHalf - 3) * sz);
  }

  // Incense burner (tripod) on the plaza floor, just inside the +z stair top.
  const ibx = 0, ibz = bHalf - 4;
  geo.cyl(1.2, 1.5, 1.4, ibx, terraceH, ibz, BRONZE, 10);
  geo.cyl(0.9, 1.1, 0.9, ibx, terraceH + 1.4, ibz, BRONZE, 10);
  for (let a = 0; a < 3; a++) {
    const ang = a * (Math.PI * 2 / 3);
    geo.cyl(0.22, 0.12, 1.6, ibx + Math.cos(ang) * 1.2, terraceH, ibz + Math.sin(ang) * 1.2, GOLD_DARK, 6);
  }

  const solid = geo.build();

  return {
    solid,
    glass: null,
    name: '万佛塔',
    radius: 22,
    height: 102,
  };
}
