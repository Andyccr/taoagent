import { createGeo } from './geo.js';

export function buildHangingGardens() {
  const g = createGeo();

  const MUD = 0xc9a26b;
  const MUD_DARK = 0xa87f4d;
  const MUD_LIGHT = 0xd9b785;
  const BLUE = 0x2e5c9a;
  const BLUE_DARK = 0x234a78;
  const GOLD = 0xd9a441;
  const GOLD_DARK = 0xae7c28;
  const STONE = 0x94897a;
  const GREEN = 0x2f6b2f;
  const GREEN2 = 0x3b7d3b;
  const GREEN3 = 0x24551f;
  const PALM = 0x4d8a3c;
  const TRUNK = 0x6d4a2a;
  const RED = 0xb5443b;
  const PINK = 0xc96a86;
  const YELLOW = 0xe0b94a;
  const WATER = 0x9fd3e8;
  const WATER_DARK = 0x6f9fc0;

  let seed = 1337;
  function rnd() {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  }

  function palm(x, y, z, s = 1) {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const h = 1.1 * s;
      g.cyl(0.17 * s + i * 0.02 * s, 0.23 * s + i * 0.02 * s, h, x, y + i * h, z, TRUNK, 6);
    }
    const top = y + n * 1.1 * s;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      g.group({ x, y: top, z, ry: a }, () => {
        g.box(1.7 * s, 0.11 * s, 0.42 * s, 0.85 * s, -0.22 * s, 0, PALM, { rz: -0.55 });
      });
    }
    g.sphere(0.34 * s, x, top + 0.08 * s, z, PALM, 6);
  }

  function cypress(x, y, z, s = 1) {
    g.cyl(0.14 * s, 0.2 * s, 0.7 * s, x, y, z, TRUNK, 6);
    g.cone(0.9 * s, 2.0 * s, x, y + 0.4 * s, z, GREEN, 8);
    g.cone(0.65 * s, 1.8 * s, x, y + 1.7 * s, z, GREEN2, 8);
    g.cone(0.4 * s, 1.5 * s, x, y + 2.9 * s, z, GREEN, 8);
  }

  function bush(x, y, z, s = 1) {
    g.sphere(0.55 * s, x, y + 0.42 * s, z, GREEN2, 5);
    g.sphere(0.36 * s, x + 0.3 * s, y + 0.6 * s, z + 0.15 * s, GREEN, 5);
  }

  function vine(x, yTop, z, s = 1) {
    const h = 2.4 * s;
    g.box(0.5 * s, h, 0.26 * s, x, yTop - h / 2, z, GREEN2, {});
    g.box(0.38 * s, h * 0.75, 0.2 * s, x + 0.42 * s, yTop - h * 0.37, z - 0.04, GREEN, {});
    g.box(0.34 * s, h * 0.6, 0.18 * s, x - 0.4 * s, yTop - h * 0.3, z - 0.06, GREEN3, {});
  }

  function parapet(w, d, top, front) {
    const back = front - d;
    const pt = 0.7;
    const ph = 1.1;
    g.box(w, ph, pt, 0, top, front - pt / 2, BLUE, {});
    g.box(w, ph, pt, 0, top, back + pt / 2, BLUE, {});
    g.box(pt, ph, d - pt * 2, -w / 2 + pt / 2, top, front - d / 2, BLUE, {});
    g.box(pt, ph, d - pt * 2, w / 2 - pt / 2, top, front - d / 2, BLUE, {});
    g.box(w + 0.24, 0.16, pt + 0.24, 0, top + ph, front - pt / 2, GOLD, {});
    g.box(w + 0.24, 0.16, pt + 0.24, 0, top + ph, back + pt / 2, GOLD, {});
    const n = Math.max(6, Math.floor(w / 2.4));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n);
      g.box(0.36, 0.36, 0.18, x, top + ph / 2, front - pt / 2 + 0.08, GOLD, {});
    }
    g.box(w - 3.5, 0.42, 0.14, 0, top + 0.32, front - pt / 2 - 0.05, GOLD_DARK, {});
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n);
      g.box(0.2, 0.34, 0.12, x, top + 0.32, front - pt / 2 - 0.08, GOLD, {});
    }
  }

  function arcade(w, d, y, h, front) {
    const back = front - d;
    const sp = 3.6;
    for (let x = -w / 2 + 2.0; x <= w / 2 - 2.0; x += sp) {
      g.box(1.0, h - 0.7, 0.72, x, y + (h - 0.7) / 2, front - 0.36, MUD_DARK, {});
      g.box(1.22, 0.5, 0.9, x, y + h - 1.35, front - 0.36, BLUE, {});
    }
    for (let z = front - 2.0; z >= back + 2.0; z -= sp) {
      g.box(0.72, h - 0.7, 1.0, -w / 2 + 0.36, y + (h - 0.7) / 2, z, MUD_DARK, {});
      g.box(0.72, h - 0.7, 1.0, w / 2 - 0.36, y + (h - 0.7) / 2, z, MUD_DARK, {});
    }
  }

  function greenery(w, d, top, front) {
    const back = front - d;
    for (let x = -w / 2 + 2.8; x <= w / 2 - 2.8; x += 5.0) {
      palm(x, top, back + 1.8, 0.85 + rnd() * 0.4);
    }
    for (const sx of [-w / 2 + 3.4, w / 2 - 3.4]) {
      for (let z = front - 2.8; z >= back + 3; z -= 4.5) {
        cypress(sx, top, z, 0.65 + rnd() * 0.3);
      }
    }
    const nb = Math.floor((w * d) / 90);
    for (let i = 0; i < nb; i++) {
      const x = (rnd() * 2 - 1) * (w / 2 - 2.4);
      const z = back + 2.4 + rnd() * (d - 4.8);
      bush(x, top, z, 0.7 + rnd() * 0.6);
    }
    const nf = Math.floor(w / 1.6);
    for (let i = 0; i < nf; i++) {
      const x = -w / 2 + 1.2 + i * (w / nf);
      g.box(0.52, 0.42, 0.52, x, top, front - 0.95, [RED, PINK, YELLOW][i % 3], {});
    }
    const nv = Math.floor(w / 3.0);
    for (let i = 0; i < nv; i++) {
      const x = -w / 2 + 1.4 + i * (w / nv);
      vine(x, top + ph, front - 0.15, 0.8 + rnd() * 0.5);
    }
  }

  function lion(x, y, z, ry, s = 1) {
    g.group({ x, y, z, ry }, () => {
      g.box(2.4 * s, 0.7 * s, 1.0 * s, 0, 0.85 * s, 0, STONE, {});
      g.box(2.0 * s, 0.75 * s, 1.0 * s, 0, 0.3 * s, 0, STONE, {});
      g.box(0.75 * s, 0.9 * s, 0.8 * s, 1.35 * s, 1.2 * s, 0, STONE, {});
      g.box(1.0 * s, 1.1 * s, 0.92 * s, 0.95 * s, 1.2 * s, 0, STONE, {});
      g.box(0.8 * s, 0.62 * s, 0.78 * s, -1.15 * s, 0.8 * s, 0, STONE, {});
    });
  }

  function grandStaircase(w, z0, z1, y1) {
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const f = i / steps;
      const zBottom = z0 + (z1 - z0) * f;
      const h = y1 * (f + 1 / steps);
      const d = (z0 - z1) / steps + 0.06;
      g.box(w, h, d, 0, 0, zBottom - d / 2, STONE, {});
    }
    const mid = (z0 + z1) / 2;
    g.box(0.7, y1 + 0.4, Math.abs(z1 - z0), -w / 2 - 0.35, 0, mid, MUD, {});
    g.box(0.7, y1 + 0.4, Math.abs(z1 - z0), w / 2 + 0.35, 0, mid, MUD, {});
    g.box(0.9, 0.3, Math.abs(z1 - z0), -w / 2 - 0.35, y1, mid, GOLD, {});
    g.box(0.9, 0.3, Math.abs(z1 - z0), w / 2 + 0.35, y1, mid, GOLD, {});
  }

  function ishtarGate(z) {
    g.group({ z }, () => {
      g.box(6.4, 16, 3.2, -7.2, 0, 0, BLUE, {});
      g.box(6.4, 16, 3.2, 7.2, 0, 0, BLUE, {});
      g.box(15.4, 4.5, 2.6, 0, 11.5, 0, BLUE, {});
      g.box(15.4, 1.2, 2.9, 0, 16, 0, BLUE_DARK, {});
      g.arch(3.4, 0.8, 2.6, 0, 1.1, 0.1, BLUE_DARK, 10, {});
      g.arch(3.0, 0.18, 2.7, 0, 1.1, 0.12, GOLD, 10, {});
      for (const sx of [-7.2, 7.2]) {
        for (let y = 2.2; y <= 10; y += 2.0) {
          g.box(1.3, 1.1, 0.3, sx, y, 1.7, GOLD, {});
        }
      }
      for (let x = -5.4; x <= 5.4; x += 1.8) {
        g.box(0.9, 1.0, 0.25, x, 2.6, 1.7, GOLD, {});
      }
      for (let x = -7.6; x <= 7.6; x += 1.7) {
        g.box(0.8, 0.85, 0.85, x, 17.6, 0, BLUE_DARK, {});
      }
      g.box(17.6, 0.5, 3.2, 0, 0, 0, STONE, {});
    });
  }

  function pumpTower(x, z) {
    const top = 40;
    g.box(3.6, top, 3.6, x, 0, z, MUD, {});
    for (let y = 4; y < top; y += 8) g.box(3.85, 0.8, 3.85, x, y, z, BLUE, {});
    g.cyl(1.8, 1.8, 0.55, x, top - 1.8, z, GOLD, 16, { rx: Math.PI / 2 });
    g.cyl(0.24, 0.24, 0.6, x, top - 1.8, z, GOLD_DARK, 6, { rx: Math.PI / 2 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + Math.PI / 4;
      g.box(0.16, 0.16, 1.7, x, top - 1.8, z, GOLD_DARK, { rz: a });
    }
    g.box(4.4, 1.5, 4.4, x, top, z, BLUE_DARK, {});
    g.box(4.6, 0.3, 4.6, x, top + 1.5, z, GOLD, {});
    g.box(0.6, top, 0.6, x, 0, z, WATER, {});
  }

  const ph = 1.1;
  const H = 6;
  const terraces = [
    { w: 70, d: 58, y: 0, front: 26 },
    { w: 62, d: 50, y: 6, front: 24 },
    { w: 54, d: 42, y: 12, front: 22 },
    { w: 46, d: 34, y: 18, front: 20 },
    { w: 38, d: 26, y: 24, front: 18 },
    { w: 30, d: 18, y: 30, front: 16 },
    { w: 22, d: 10, y: 36, front: 14 },
  ];

  for (const t of terraces) {
    const back = t.front - t.d;
    g.box(t.w, H, t.d, 0, t.y, t.front - t.d / 2, MUD, {});
    g.box(t.w, H * 0.18, t.d + 0.2, 0, t.y, t.front - t.d / 2, MUD_LIGHT, {});
    g.box(t.w, 0.9, 0.2, 0, t.y + H - 1.6, t.front - 0.1, BLUE, {});
    arcade(t.w, t.d, t.y, H, t.front);
    parapet(t.w, t.d, t.y + H, t.front);
    greenery(t.w, t.d, t.y + H, t.front);
  }

  const topT = terraces[terraces.length - 1];
  const topY = topT.y + H;

  function crown(w, d, top, front) {
    const back = front - d;
    const cw = w * 0.7;
    const cd = d * 0.8;
    const cx = 0;
    const cz = front - d / 2;
    g.box(cw, 1.1, cd, cx, top, cz, STONE, {});
    g.box(cw, 0.4, cd + 0.4, cx, top + 1.1, cz, GOLD, {});
    const ch = 2.6;
    g.box(cw, ch, 0.6, cx, top + 1.5, front - cd / 2 - cd / 2, BLUE, {});
    g.box(cw, ch, 0.6, cx, top + 1.5, back + cd / 2 + cd / 2, BLUE, {});
    g.box(0.6, ch, cd - 0.6, -cw / 2 + 0.3, top + 1.5, cz, BLUE, {});
    g.box(0.6, ch, cd - 0.6, cw / 2 - 0.3, top + 1.5, cz, BLUE, {});
    for (let x = -cw / 2 + 1.4; x <= cw / 2 - 1.4; x += 2.2) {
      g.cyl(0.22, 0.28, ch, x, top + 1.5, front - cd / 2 - 0.2, GOLD, 6);
    }
    for (let z = front - 1.4; z >= back + 1.4; z -= 2.2) {
      g.cyl(0.22, 0.28, ch, -cw / 2 + 0.2, top + 1.5, z, GOLD, 6);
      g.cyl(0.22, 0.28, ch, cw / 2 - 0.2, top + 1.5, z, GOLD, 6);
    }
    const domeBase = top + 1.5 + ch;
    g.cyl(cw * 0.24, cw * 0.24, 0.5, cx, domeBase, cz, GOLD, 12);
    g.dome(cw * 0.24, cx, domeBase + 0.5, cz, BLUE, 12);
    g.sphere(0.6, cx, domeBase + 0.5 + cw * 0.24, cz, GOLD, 8);
    for (const sx of [-cw / 2 - 1, cw / 2 + 1]) {
      g.box(0.5, 2.2, 0.5, sx, top + 1.5, front - 0.5, GOLD, {});
    }
  }
  crown(topT.w, topT.d, topY, topT.front);

  grandStaircase(10, 37, 26, 6);
  lion(-6.6, 0.3, 37.5, 0, 1);
  lion(6.6, 0.3, 37.5, 0, 1);
  g.box(1.6, 1.0, 2.0, -6.6, 0, 37.5, STONE, {});
  g.box(1.6, 1.0, 2.0, 6.6, 0, 37.5, STONE, {});

  g.box(14, 0.25, 4.6, 0, 0, 25.6, STONE, {});
  g.box(14.8, 0.35, 0.6, 0, 0.25, 23.2, STONE, {});
  g.box(14.8, 0.35, 0.6, 0, 0.25, 28.0, STONE, {});
  g.box(0.6, 0.35, 5.2, -7.4, 0.0, 25.6, STONE, {});
  g.box(0.6, 0.35, 5.2, 7.4, 0.0, 25.6, STONE, {});
  g.box(12.8, 0.16, 3.8, 0, 0.3, 25.6, WATER, {});

  for (const sx of [-1.0, 0, 1.0]) {
    let fy = 42;
    for (let i = 0; i < terraces.length; i++) {
      const t = terraces[i];
      const segTop = t.y + H;
      g.box(0.9, segTop - t.y, 0.16, sx * 1.6, t.y, t.front + 0.02, WATER, {});
      g.box(1.1, 0.35, 0.2, sx * 1.6, segTop - 0.2, t.front + 0.05, WATER_DARK, {});
    }
    g.box(0.9, 2.2, 0.16, sx * 1.6, 0, 26.2, WATER_DARK, {});
  }

  ishtarGate(40);

  g.box(14, 0.22, 13, 0, 0, 34, MUD_LIGHT, {});
  for (let z = 33.5; z <= 40.5; z += 1.4) {
    g.box(14, 0.03, 0.12, 0, 0.24, z, MUD, {});
  }

  for (const sx of [-12, 12]) {
    palm(sx, 0, 39.5, 0.85 + rnd() * 0.3);
  }
  for (const sx of [-13.5, 13.5]) {
    for (let z = 33; z <= 40; z += 3.5) {
      cypress(sx, 0, z, 0.75 + rnd() * 0.3);
    }
  }

  pumpTower(-27, 14);
  pumpTower(27, 14);
  for (const sx of [-27, 27]) {
    g.box(3.0, 0.4, 6.0, sx, 0, 20.5, STONE, {});
  }

  for (const sx of [-34, 34]) {
    for (let z = -32; z <= 6; z += 6) {
      cypress(sx, 0, z, 0.85 + rnd() * 0.35);
    }
  }
  for (const sx of [-37, 37]) {
    for (let z = -36; z <= -8; z += 8) {
      palm(sx, 0, z, 0.8 + rnd() * 0.4);
    }
  }
  for (let x = -18; x <= 18; x += 7) {
    cypress(x, 0, -37, 0.9 + rnd() * 0.3);
  }

  const solid = g.build();
  return {
    solid,
    glass: null,
    name: '空中花园',
    height: 50,
    radius: 42,
  };
}
