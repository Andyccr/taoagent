import { createGeo } from './geo.js';

export function buildColossus() {
  const g = createGeo();
  const glass = createGeo();
  const TAU = Math.PI * 2;
  const PZ = -2;
  const C = {
    rock1: 0x8a8175, rock2: 0x746d62, rock3: 0x625d54, rock4: 0x9a9183, rock5: 0x555149,
    marble: 0xe8e1d0, marble2: 0xd9d0bb, marble3: 0xc8bda4, marbleEdge: 0xf1ebdd,
    bronze: 0xb5874a, bronzeLight: 0xc99a5b, bronzeDark: 0x7e5a30,
    cloth: 0x96713f, clothDark: 0x6c4d27, gold: 0xd8ab55, goldLight: 0xe7c273,
    quay: 0xb0a58e, quayDark: 0x8f8470, quayLight: 0xc4b99f,
    wood: 0x6b4a2a, woodDark: 0x50351f,
    hull: 0x6b4f35, hull2: 0x7c5e40, hull3: 0x8a6c49,
    sail: 0xded2b8, sail2: 0xc9bc9f, rope: 0x463626,
    soil: 0x4a3b2b, leaf1: 0x556b45, leaf2: 0x667a50, leaf3: 0x7b8a5e,
    door: 0x2d2820,
  };

  let seed = 0x5eed1234;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();

  const limb = (gg, x1, y1, x2, y2, z, r1, r2, hex, seg = 9) => {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    gg.cyl(r2, r1, L, (x1 + x2) / 2, (y1 + y2) / 2 - L / 2, z, hex, seg, { rz: Math.atan2(-dx, dy) });
  };
  const line = (gg, x, y1, z1, y2, z2, r, hex, seg = 4) => {
    const dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dy, dz);
    gg.cyl(r, r, L, x, (y1 + y2) / 2 - L / 2, (z1 + z2) / 2, hex, seg, { rx: Math.atan2(dz, dy) });
  };

  // --- Rocky islet, waterline at y = 0 ---
  const rim = [];
  for (let i = 0; i < 22; i++) {
    const a = TAU * i / 22;
    const j = rr(0.9, 1.06);
    rim.push([Math.cos(a) * 18.2 * j, Math.sin(a) * 14.8 * j - 3]);
  }
  g.prism(rim, 3.2, -0.4, C.rock2);
  const cap = rim.map(([x, z]) => [x * 0.86, (z + 3) * 0.86 - 3]);
  g.prism(cap, 1.0, 2.6, C.rock1);
  g.prism(rim.map(([x, z]) => [x * 0.97, (z + 3) * 0.97 - 3]), 0.35, -0.4, C.rock5);

  for (let i = 0; i < 48; i++) {
    const a = TAU * i / 48 + rr(-0.06, 0.06);
    const rx = rr(12.8, 17.2), rz = rx * rr(0.7, 0.86);
    const cx = Math.cos(a) * rx, cz = Math.sin(a) * rz - 3;
    if (cz > 8.2 && Math.abs(cx) < 6.8) continue;
    const r = rr(1.1, 2.7);
    const y = Math.max(r - 0.35, rr(1.2, 3.2));
    g.sphere(r, cx, y, cz, i % 3 === 0 ? C.rock3 : i % 3 === 1 ? C.rock2 : C.rock4, 6 + (i % 3));
    if (i % 2 === 0) g.cone(rr(0.7, 1.2) * r, rr(1.4, 3.1), cx + rr(-0.5, 0.5), y + rr(-0.2, 0.5), cz + rr(-0.5, 0.5), i % 4 ? C.rock1 : C.rock3, 6, { rx: rr(-0.18, 0.18), rz: rr(-0.2, 0.2) });
  }
  for (let i = 0; i < 30; i++) {
    const a = TAU * i / 30 + rr(-0.08, 0.08);
    const rx = rr(15.2, 18.6), rz = rx * rr(0.7, 0.86);
    const cx = Math.cos(a) * rx, cz = Math.sin(a) * rz - 3;
    const r = rr(1.2, 2.7);
    if (Math.abs(cx) + r > 21.6 || cz > 8.0 && Math.abs(cx) < 6.8) continue;
    g.sphere(r, cx, r * rr(0.82, 0.92), cz, i % 2 ? C.rock3 : C.rock1, 6);
    g.cyl(r * 1.05, r * 1.38, rr(0.5, 1.1), cx, -0.4, cz, i % 3 ? C.rock2 : C.rock5, 7);
  }
  for (let i = 0; i < 18; i++) {
    const a = TAU * i / 18 + 0.2;
    const rr2 = rr(7.0, 11.0);
    const cx = Math.cos(a) * rr2, cz = Math.sin(a) * rr2 * 0.78 - 3;
    g.sphere(rr(0.8, 1.7), cx, rr(3.0, 3.7), cz, i % 2 ? C.rock4 : C.rock3, 6);
  }
  for (let i = 0; i < 26; i++) {
    const a = TAU * i / 26 + 0.1;
    const rx = rr(14.4, 17.8), rz = rx * rr(0.72, 0.88);
    const cx = Math.cos(a) * rx, cz = Math.sin(a) * rz - 3;
    if (cz > 8.2 && Math.abs(cx) < 6.8) continue;
    const s2 = rr(0.8, 1.8);
    const y = Math.max(s2 - 0.35, rr(0.6, 2.4));
    g.sphere(s2, cx, y, cz, i % 2 ? C.rock2 : C.rock4, 8);
    g.cone(s2 * rr(0.7, 1.1), s2 * rr(1.6, 2.8), cx, y + rr(-0.2, 0.3), cz, C.rock1, 6, { rx: rr(-0.2, 0.2), rz: rr(-0.25, 0.25) });
  }

  // --- Marble pedestal and colossal bronze Helios ---
  g.group({ z: PZ }, (p) => {
    p.box(21, 0.8, 19, 0, 3.6, 0, C.marble2);
    p.box(18.6, 0.8, 17, 0, 4.4, 0, C.marble);
    p.box(16, 0.9, 15, 0, 5.2, 0, C.marble2);
    p.box(13, 0.7, 12, 0, 6.1, 0, C.marble3);
    p.box(11, 7.6, 10, 0, 6.8, 0, C.marble);

    // Broad stair from the pier up onto the rock terrace.
    for (let i = 0; i < 6; i++) p.box(8.2, 0.43, 1.1, 0, 1.0 + i * 0.43, 15.9 - i * 0.62, C.marble2);
    for (let i = 0; i < 5; i++) p.box(6.2, 0.2, 1.4, 0, 3.6 + i * 0.15, 13.1 - i * 0.72, C.marble3);

    // Corner pilasters and capitals.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        p.box(0.9, 7.3, 0.9, 5.15 * sx, 6.9, 4.58 * sz, C.marble3);
        p.box(1.15, 0.35, 1.15, 5.15 * sx, 6.8, 4.58 * sz, C.marble2);
        p.box(1.15, 0.4, 1.15, 5.15 * sx, 14.0, 4.58 * sz, C.marble2);
        p.box(1.3, 0.22, 1.3, 5.15 * sx, 14.4, 4.58 * sz, C.marbleEdge);
      }
    }

    const band = (y, h, gap) => {
      p.box(11.5, h, 0.45, 0, y, -5.02, C.marble3);
      p.box(0.45, h, 10.5, 5.52, y, 0, C.marble3);
      p.box(0.45, h, 10.5, -5.52, y, 0, C.marble3);
      if (gap) {
        p.box(3.85, h, 0.5, -3.65, y, 5.02, C.marble3);
        p.box(3.85, h, 0.5, 3.65, y, 5.02, C.marble3);
      } else {
        p.box(11.5, h, 0.5, 0, y, 5.02, C.marble3);
      }
      for (let i = 0; i < 12; i++) {
        const x = -4.95 + i * 0.9;
        if (gap && Math.abs(x) < 1.9) continue;
        p.box(0.52, h * 0.62, 0.2, x, y + h * 0.19, 5.34, i % 2 ? C.marbleEdge : C.marble2);
        p.box(0.52, h * 0.62, 0.2, x, y + h * 0.19, -5.34, i % 2 ? C.marble2 : C.marbleEdge);
      }
      for (let i = 0; i < 11; i++) {
        const z = -4.5 + i * 0.9;
        p.box(0.2, h * 0.62, 0.52, 5.84, y + h * 0.19, z, i % 2 ? C.marbleEdge : C.marble2);
        p.box(0.2, h * 0.62, 0.52, -5.84, y + h * 0.19, z, i % 2 ? C.marble2 : C.marbleEdge);
        p.sphere(0.16, 5.98, y + h * 0.9, z, i % 2 ? C.marbleEdge : C.marble2, 5);
        p.sphere(0.16, -5.98, y + h * 0.9, z, i % 2 ? C.marble2 : C.marbleEdge, 5);
      }
      for (let i = 0; i < 12; i++) {
        const x = -4.95 + i * 0.9;
        if (gap && Math.abs(x) < 1.9) continue;
        p.sphere(0.16, x, y + h * 0.9, 5.42, i % 2 ? C.marbleEdge : C.marble2, 5);
        p.sphere(0.16, x, y + h * 0.9, -5.42, i % 2 ? C.marble2 : C.marbleEdge, 5);
      }
      for (let i = 0; i < 22; i++) {
        const x = -5.3 + i * 0.505;
        p.box(0.3, 0.18, 0.3, x, y - 0.2, 5.36, C.marbleEdge);
        p.box(0.3, 0.18, 0.3, x, y - 0.2, -5.36, C.marbleEdge);
      }
    };
    band(8.0, 1.0, true);
    band(11.6, 1.0, false);

    // Small votive door on the +z face.
    p.box(2.15, 3.3, 0.35, 0, 6.9, 5.06, C.door);
    p.box(0.42, 3.6, 0.6, -1.34, 6.8, 5.2, C.marble3);
    p.box(0.42, 3.6, 0.6, 1.34, 6.8, 5.2, C.marble3);
    p.box(3.3, 0.5, 0.8, 0, 10.3, 5.2, C.marble2);
    p.arch(1.35, 0.4, 0.55, 0, 10.55, 5.2, C.marbleEdge, 8);
    p.sphere(0.16, 0.7, 8.3, 5.28, C.gold, 6);
    p.box(2.8, 0.35, 1.0, 0, 6.55, 5.45, C.marble2);

    // Cornice stack and statue plinth.
    p.box(12.4, 0.6, 11.4, 0, 14.4, 0, C.marble2);
    p.box(13.4, 0.5, 12.4, 0, 15.0, 0, C.marble3);
    p.box(10.5, 0.8, 9.5, 0, 15.5, 0, C.marble);
    p.box(8.6, 0.5, 7.8, 0, 16.3, 0, C.marble2);
    p.box(7.2, 0.5, 6.4, 0, 16.8, 0, C.marble3);
    for (let i = 0; i < 9; i++) p.box(0.55, 0.38, 0.55, -4.8 + i * 1.2, 16.3, 3.65, i % 2 ? C.marbleEdge : C.marble3);
    for (let i = 0; i < 9; i++) p.box(0.55, 0.38, 0.55, -4.8 + i * 1.2, 16.3, -3.65, i % 2 ? C.marble3 : C.marbleEdge);

    // Balustrade and corner urns on the pedestal cap.
    for (const z of [-4.35, 4.35]) {
      p.box(10.1, 0.14, 0.2, 0, 16.35, z, C.marble3);
      p.box(10.1, 0.14, 0.2, 0, 17.18, z, C.marbleEdge);
      for (let i = 0; i < 11; i++) p.box(0.18, 0.76, 0.18, -4.5 + i * 0.9, 16.45, z, C.marble2);
    }
    for (const x of [-4.95, 4.95]) {
      p.box(0.2, 0.14, 9.0, x, 16.35, 0, C.marble3);
      p.box(0.2, 0.14, 9.0, x, 17.18, 0, C.marbleEdge);
      for (let i = 0; i < 10; i++) p.box(0.18, 0.76, 0.18, x, 16.45, -4.05 + i * 0.9, C.marble2);
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        p.box(0.7, 0.22, 0.7, 6.0 * sx, 15.5, 5.5 * sz, C.marble3);
        p.cyl(0.32, 0.22, 1.1, 6.0 * sx, 15.72, 5.5 * sz, C.marble2, 8);
        p.sphere(0.38, 6.0 * sx, 17.0, 5.5 * sz, C.marble, 7);
        p.cone(0.22, 0.55, 6.0 * sx, 17.28, 5.5 * sz, C.gold, 6);
      }
    }

    const F = 17.3;
    // Feet, legs and knee joints.
    for (const s of [-1, 1]) {
      p.box(2.7, 0.75, 4.2, s * 2.2, F, 0.55, C.bronzeDark);
      p.box(2.8, 0.18, 0.9, s * 2.2, F + 0.75, 2.45, C.bronzeLight);
      p.box(0.55, 0.45, 0.7, s * 2.2, F + 0.32, -1.25, C.bronzeDark);
      p.cyl(0.8, 0.95, 1.0, s * 2.2, F + 0.25, 0.0, C.bronze, 8);
      p.sphere(0.85, s * 2.2, F + 1.15, 0.15, C.bronze, 8);
      limb(p, s * 2.2, F + 1.25, s * 2.35, 30.8, 0.15, 0.8, 1.25, C.bronze, 10);
      p.sphere(1.25, s * 2.35, 30.9, 0.2, C.bronze, 10);
      p.sphere(1.05, s * 2.3, 25.8, 0.55, C.bronze, 8);
      limb(p, s * 2.35, 30.9, s * 2.05, 41.7, 0.0, 1.25, 1.75, C.bronze, 10);
      p.sphere(1.5, s * 2.0, 40.5, 0.1, C.bronze, 9);
    }

    // Short tunic with vertical folds, belt and buckle.
    p.cyl(3.0, 4.4, 7.4, 0, 35.0, 0, C.cloth, 12);
    p.cyl(4.35, 4.6, 0.45, 0, 34.8, 0, C.clothDark, 12);
    for (let i = 0; i < 12; i++) {
      const a = TAU * i / 12;
      p.box(0.34, 6.6, 0.4, Math.sin(a) * 3.85, 35.2, Math.cos(a) * 3.85, i % 2 ? C.clothDark : C.cloth, { ry: a });
    }
    p.cyl(3.25, 3.25, 0.65, 0, 41.8, 0, C.bronzeDark, 12);
    p.box(0.9, 0.55, 0.32, 0, 41.85, 3.22, C.gold);
    p.sphere(0.18, 0, 42.1, 3.4, C.goldLight, 6);

    // Torso, chest, abdomen and shoulders.
    p.cyl(3.85, 3.0, 12.0, 0, 42.3, 0, C.bronze, 12);
    p.sphere(1.35, -1.45, 51.8, 1.55, C.bronze, 10);
    p.sphere(1.35, 1.45, 51.8, 1.55, C.bronze, 10);
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) p.box(0.55, 0.7, 0.35, s * 0.55, 45.2 + i * 1.5, 2.85, C.bronzeDark);
    }
    p.sphere(0.13, 0, 44.7, 2.98, C.bronzeDark, 6);
    p.sphere(1.8, -3.65, 53.4, 0, C.bronze, 10);
    p.sphere(1.8, 3.65, 53.4, 0, C.bronze, 10);
    p.sphere(1.05, -1.9, 54.1, 0.2, C.bronze, 8);
    p.sphere(1.05, 1.9, 54.1, 0.2, C.bronze, 8);
    p.cyl(1.35, 1.55, 2.6, 0, 54.0, 0, C.bronze, 10);

    // Head, hair, beard and face.
    p.sphere(2.35, 0, 59.0, 0.1, C.bronze, 12);
    p.sphere(1.55, 0, 57.4, 0.9, C.bronze, 10);
    p.sphere(1.25, 0, 56.7, 1.7, C.bronzeDark, 8);
    p.box(0.5, 0.85, 0.55, 0, 58.9, 2.35, C.bronzeDark);
    p.box(1.8, 0.28, 0.4, 0, 59.6, 2.2, C.bronzeDark);
    p.box(0.38, 0.22, 0.14, -0.75, 59.1, 2.3, C.door);
    p.box(0.38, 0.22, 0.14, 0.75, 59.1, 2.3, C.door);
    p.sphere(0.55, -2.2, 59.0, 0.1, C.bronze, 7);
    p.sphere(0.55, 2.2, 59.0, 0.1, C.bronze, 7);
    p.dome(2.42, 0, 59.25, 0.1, C.bronzeDark, 10);
    p.sphere(1.1, 0, 58.2, -1.9, C.bronzeDark, 8);
    p.cyl(2.55, 2.7, 0.5, 0, 61.2, 0.1, C.gold, 12);
    for (let i = 0; i < 7; i++) {
      const a = TAU * i / 7;
      p.cone(0.42, 4.2 + (i % 3) * 0.5, Math.sin(a) * 2.25, 61.7, Math.cos(a) * 2.25 + 0.1, i % 2 ? C.gold : C.goldLight, 6, { rx: 0.16 * Math.cos(a), rz: -0.16 * Math.sin(a) });
    }

    // Raised right arm and torch.
    limb(p, -3.65, 53.2, -6.1, 59.8, 0.2, 1.55, 1.1, C.bronze, 10);
    p.sphere(1.35, -4.9, 56.7, 0.2, C.bronze, 9);
    p.sphere(1.1, -6.1, 59.9, 0.25, C.bronze, 9);
    limb(p, -6.1, 59.9, -5.55, 65.0, 0.65, 1.1, 0.78, C.bronze, 10);
    p.sphere(0.95, -5.55, 65.6, 0.7, C.bronze, 9);
    p.sphere(0.7, -5.55, 66.1, 0.7, C.bronzeDark, 7);
    for (let i = 0; i < 3; i++) p.box(0.22, 0.75, 0.22, -5.85 + i * 0.3, 65.2, 1.05, C.bronzeDark);
    p.cyl(0.26, 0.34, 6.9, -5.55, 62.3, 0.7, C.bronzeDark, 8);
    p.ring(0.34, 0.08, -5.55, 64.2, 0.7, C.gold, 10);
    p.cyl(1.0, 0.6, 1.2, -5.55, 69.2, 0.7, C.bronzeDark, 10);
    p.cyl(1.12, 0.9, 0.25, -5.55, 70.4, 0.7, C.gold, 10);
    for (let i = 0; i < 4; i++) {
      const a = TAU * i / 4 + 0.4;
      p.cone(0.22, 0.9, -5.55 + Math.sin(a) * 0.7, 70.4, 0.7 + Math.cos(a) * 0.7, C.gold, 5);
    }

    // Left arm holding spear, with cloak falling behind.
    limb(p, 3.65, 53.2, 5.1, 46.0, 0.15, 1.55, 1.1, C.bronze, 10);
    p.sphere(1.3, 4.6, 50.5, 0.1, C.bronze, 9);
    p.sphere(1.1, 5.1, 46.0, 0.2, C.bronze, 9);
    limb(p, 5.1, 46.0, 4.5, 38.8, 0.5, 1.1, 0.78, C.bronze, 10);
    p.sphere(0.95, 4.5, 38.2, 0.5, C.bronze, 9);
    p.cyl(0.17, 0.21, 39.5, 4.9, 17.6, 0.6, C.wood, 6);
    p.cone(0.38, 3.2, 4.9, 57.1, 0.6, C.gold, 6);
    p.sphere(0.28, 4.9, 60.1, 0.6, C.gold, 6);
    p.ring(0.25, 0.07, 4.9, 57.0, 0.6, C.bronzeDark, 8);
    p.cyl(2.15, 3.8, 24, 3.1, 29.0, -1.9, C.clothDark, 10, { sz: 0.42 });
    p.cyl(3.9, 4.0, 0.5, 3.1, 28.7, -1.9, C.cloth, 10, { sz: 0.42 });
    p.box(3.6, 1.1, 1.6, 3.4, 52.5, -0.6, C.cloth);
    for (let i = 0; i < 5; i++) {
      p.box(0.35, 23, 0.35, 1.7 + i * 0.7, 29.3, -2.1, i % 2 ? C.clothDark : C.cloth, { rz: 0.02 * (i - 2) });
    }
  });

  // Glass fire in the raised brazier.
  glass.sphere(1.0, -5.55, 70.6, PZ + 0.7, 0xffd27a, 8);
  glass.cone(0.78, 2.0, -5.55, 69.9, PZ + 0.7, 0xff9f3d, 8);
  glass.sphere(0.45, -5.55, 71.4, PZ + 0.7, 0xfff1c0, 6);

  // --- Ceremonial harbour pier on the +z side ---
  g.box(7, 1, 9.2, 0, -0.05, 16.5, C.quay);
  g.box(11, 1, 4, 0, -0.05, 19, C.quay);
  g.box(7.4, 0.18, 9.4, 0, 0.95, 16.5, C.quayLight);
  g.box(11.4, 0.18, 4.2, 0, 0.95, 19, C.quayLight);
  g.box(0.35, 0.3, 9.4, -3.55, 0.95, 16.5, C.quayDark);
  g.box(0.35, 0.3, 9.4, 3.55, 0.95, 16.5, C.quayDark);
  g.box(11.4, 0.3, 0.35, 0, 0.95, 20.95, C.quayDark);
  for (let i = 0; i < 10; i++) {
    g.box(6.2, 0.05, 0.34, 0, 1.13, 12.5 + i * 0.86, i % 2 ? C.quay : C.quayDark);
  }
  for (let i = 0; i < 4; i++) {
    g.box(9.6, 0.05, 0.34, 0, 1.13, 17.4 + i * 0.86, i % 2 ? C.quayDark : C.quay);
  }

  const bollard = (x, z) => {
    g.cyl(0.22, 0.3, 0.8, x, 1.13, z, C.quayDark, 8);
    g.sphere(0.26, x, 1.95, z, C.quayDark, 6);
    g.ring(0.19, 0.06, x, 1.62, z, C.bronzeDark, 8);
  };
  for (const z of [12.6, 14.6, 16.6, 18.6, 20.4]) { bollard(-3.25, z); bollard(3.25, z); }
  bollard(-5.2, 20.4);
  bollard(5.2, 20.4);

  const lamp = (x, z, y0) => {
    g.cyl(0.3, 0.4, 0.55, x, y0, z, C.quayDark, 8);
    g.cyl(0.12, 0.18, 2.5, x, y0 + 0.45, z, C.bronzeDark, 8);
    g.ring(0.24, 0.07, x, y0 + 2.55, z, C.gold, 8);
    g.box(0.74, 0.1, 0.74, x, y0 + 2.55, z, C.bronzeDark);
    g.box(0.74, 0.1, 0.74, x, y0 + 3.3, z, C.bronzeDark);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(0.08, 0.68, 0.08, x + 0.27 * sx, y0 + 2.65, z + 0.27 * sz, C.bronzeDark);
    g.cone(0.58, 0.55, x, y0 + 3.4, z, C.bronzeDark, 8);
    g.sphere(0.13, x, y0 + 4.0, z, C.gold, 6);
    glass.box(0.5, 0.6, 0.5, x, y0 + 2.65, z, 0xffd58a);
  };
  lamp(-2.65, 13.4, 1.13);
  lamp(2.65, 13.4, 1.13);
  lamp(-2.65, 16.4, 1.13);
  lamp(2.65, 16.4, 1.13);

  const banner = (x, z) => {
    g.cyl(0.09, 0.14, 6.0, x, 1.13, z, C.wood, 6);
    g.sphere(0.16, x, 7.2, z, C.gold, 6);
    g.box(0.1, 0.1, 1.8, x, 6.7, z + 0.8, C.wood);
    g.box(0.08, 2.2, 1.5, x, 4.55, z + 0.82, C.cloth);
    g.box(0.1, 0.22, 1.58, x, 6.62, z + 0.82, C.gold);
    g.box(0.1, 0.16, 1.58, x, 4.45, z + 0.82, C.clothDark);
  };
  banner(-3.0, 18.8);
  banner(3.0, 18.8);

  // Gangplanks to the two galleys.
  g.box(6.9, 0.14, 0.8, -6.95, 1.16, 16.2, C.wood);
  g.box(6.9, 0.14, 0.8, 6.95, 1.16, 16.2, C.wood);
  for (const s of [-1, 1]) {
    g.box(0.14, 0.5, 0.14, s * 4.1, 1.13, 16.2, C.woodDark);
    g.box(0.14, 0.5, 0.14, s * 9.0, 1.13, 16.2, C.woodDark);
    g.box(0.08, 0.08, 0.5, s * 3.4, 1.6, 16.2, C.rope);
  }

  const guardian = (x, z) => {
    g.box(2.2, 0.7, 2.2, x, 1.13, z, C.marble2);
    g.box(1.6, 0.8, 1.6, x, 1.83, z, C.marble);
    g.box(1.2, 0.4, 1.2, x, 2.63, z, C.bronzeDark);
    g.box(0.45, 1.2, 0.4, x - 0.35, 3.03, z, C.bronze);
    g.box(0.45, 1.2, 0.4, x + 0.35, 3.03, z, C.bronze);
    g.box(1.1, 1.3, 0.6, x, 4.23, z, C.bronze);
    g.sphere(0.48, x, 5.75, z, C.bronze, 8);
    g.box(0.18, 1.8, 0.5, x - 0.35, 4.2, z - 0.45, C.bronzeDark, { rz: 0.35 });
    g.box(0.18, 1.8, 0.5, x + 0.35, 4.2, z - 0.45, C.bronzeDark, { rz: -0.35 });
    g.cyl(0.06, 0.08, 4.2, x + 0.92, 2.6, z, C.wood, 5);
    g.cone(0.14, 0.6, x + 0.92, 6.8, z, C.gold, 5);
  };
  guardian(-4.9, 19.5);
  guardian(4.9, 19.5);

  // Garden beds and olives on the rock terrace.
  const tree = (x, z) => {
    g.box(3.0, 0.5, 3.0, x, 3.6, z, C.marble3);
    g.box(3.1, 0.2, 3.1, x, 4.1, z, C.marbleEdge);
    g.box(2.3, 0.2, 2.3, x, 4.15, z, C.soil);
    g.cyl(0.32, 0.5, 3.0, x, 4.25, z, C.wood, 7);
    g.sphere(1.5, x - 0.8, 7.2, z + 0.35, C.leaf1, 7);
    g.sphere(1.65, x + 0.75, 7.6, z - 0.2, C.leaf2, 7);
    g.sphere(1.35, x + 0.1, 8.2, z + 0.65, C.leaf3, 7);
    g.sphere(1.2, x - 0.35, 7.9, z - 0.8, C.leaf2, 7);
    g.cone(1.1, 1.8, x, 8.0, z, C.leaf1, 7);
  };
  tree(-13.5, -9);
  tree(13.5, -9);
  tree(-13.5, 1);
  tree(13.5, 1);

  const rockBrazier = (x, z, y0) => {
    g.cyl(0.62, 0.85, 0.5, x, y0, z, C.bronzeDark, 8);
    g.cyl(0.28, 0.36, 1.2, x, y0 + 0.5, z, C.bronzeDark, 7);
    g.cyl(0.85, 0.5, 0.7, x, y0 + 1.7, z, C.bronze, 8);
    g.ring(0.88, 0.1, x, y0 + 2.4, z, C.gold, 8);
    glass.sphere(0.62, x, y0 + 2.5, z, 0xffc35c, 7);
    glass.cone(0.5, 1.0, x, y0 + 2.35, z, 0xff9f3d, 6);
  };
  rockBrazier(-5.6, 8.6, 3.6);
  rockBrazier(5.6, 8.6, 3.6);

  // --- Two moored galleys ---
  const galley = (cx, cz, ry, fullSail) => {
    g.group({ x: cx, z: cz, ry }, (s) => {
      const hull = [[-1.95, -4.8], [-1.2, -5.4], [1.2, -5.4], [1.95, -4.8], [2.2, -1.5], [1.6, 4.4], [0, 5.4], [-1.6, 4.4], [-2.2, -1.5]];
      s.prism(hull, 1.4, -0.2, C.hull);
      s.box(3.5, 0.22, 8.2, 0, 1.0, 0, C.hull3);
      s.box(0.18, 0.32, 8.0, -1.75, 1.15, -0.2, C.hull2);
      s.box(0.18, 0.32, 8.0, 1.75, 1.15, -0.2, C.hull2);
      s.box(2.8, 0.9, 2.2, 0, 1.2, -3.5, C.hull2);
      s.box(3.0, 0.18, 2.4, 0, 2.1, -3.5, C.hull3);
      s.cyl(0.16, 0.28, 3.0, 0, 1.2, 4.7, C.hull2, 6);
      s.sphere(0.42, 0, 4.3, 4.7, C.hull3, 7);
      s.cone(0.3, 0.9, 0, 4.6, 4.7, C.gold, 6);
      s.cyl(0.15, 0.24, 7.6, 0, 1.2, 0.4, C.wood, 6);
      s.box(4.6, 0.14, 0.14, 0, 7.0, 0.4, C.wood);
      if (fullSail) {
        s.box(4.0, 3.1, 0.1, 0, 3.3, 0.45, C.sail);
        s.gable(4.1, 0.9, 1.0, 0, 6.4, 0.45, C.sail2);
      } else {
        s.box(4.2, 0.5, 0.18, 0, 6.8, 0.4, C.sail2);
      }
      line(s, 0, 8.6, 0.4, 1.2, 4.8, 0.035, C.rope, 4);
      line(s, 0, 8.6, 0.4, 1.2, -4.6, 0.035, C.rope, 4);
      for (let i = 0; i < 7; i++) {
        const z = -3.0 + i * 1.0;
        for (const side of [-1, 1]) {
          s.box(3.1, 0.11, 0.16, side * 2.7, 1.0, z, C.wood, { rz: side * 0.18 });
          s.box(0.55, 0.16, 0.26, side * 4.15, 0.55, z, C.woodDark, { rz: side * 0.18 });
        }
      }
    });
  };
  galley(-12.6, 15.6, 0, true);
  galley(12.6, 15.6, Math.PI, false);

  return {
    solid: g.build(),
    glass: glass.build(),
    name: '太阳神巨像',
    height: 72,
    radius: 22,
  };
}


