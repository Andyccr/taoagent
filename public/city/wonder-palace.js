import { createGeo } from './geo.js';

export function build() {
  const g = createGeo();
  const gl = createGeo();

  const marble = 0xe8e3d9;
  const marble2 = 0xd6d0c4;
  const marble3 = 0xc2bbae;
  const red = 0xb83a3a;
  const redD = 0x8e2828;
  const redL = 0xc94f4f;
  const blue = 0x2b6ca3;
  const blueD = 0x1d5280;
  const blueL = 0x3d85c2;
  const gold = 0xd4a94e;
  const goldD = 0xa8842f;
  const goldL = 0xe8c86a;
  const wood = 0x7a5533;
  const woodD = 0x5a3d24;
  const green = 0x3a6b4a;
  const greenD = 0x2c5238;
  const lantern = 0xe8654a;
  const stone = 0xcfc8ba;
  const glassC = 0x9ec8e0;

  function stairs(R, yBot, yTop, width, hex) {
    const n = Math.max(2, Math.round((yTop - yBot) / 0.32));
    const rise = (yTop - yBot) / n;
    const run = 0.42;
    for (let i = 0; i < n; i++) {
      const h = rise * (i + 1);
      const z = R + (n - 1 - i) * run + run * 0.5;
      g.box(width, h, run, 0, yBot, z, hex);
    }
    const total = n * run + 0.15;
    g.box(0.38, yTop - yBot, total, -width / 2 - 0.18, yBot, R + total * 0.5, marble3);
    g.box(0.38, yTop - yBot, total, width / 2 + 0.18, yBot, R + total * 0.5, marble3);
    g.box(0.5, 0.16, total, -width / 2 - 0.18, yTop - 0.16, R + total * 0.5, marble);
    g.box(0.5, 0.16, total, width / 2 + 0.18, yTop - 0.16, R + total * 0.5, marble);
  }

  function balustrade(R, y, count, h, skipFront) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      if (skipFront) {
        let d = a - Math.PI / 2;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) < 0.24) continue;
      }
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      g.box(0.2, h, 0.2, x, y, z, marble2);
      g.box(0.3, 0.14, 0.3, x, y + h, z, marble);
      g.box(0.26, 0.1, 0.26, x, y + h * 0.48, z, marble3);
    }
    g.ring(R, 0.08, 0, y + h * 0.72, 0, marble2, Math.min(count, 36));
    g.ring(R, 0.07, 0, y + h * 0.26, 0, marble3, Math.min(count, 36));
  }

  function dougongRing(R, y, count, s) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      g.group({ x, y, z, ry: Math.PI / 2 - a, s }, (g) => {
        g.box(0.7, 0.2, 0.45, 0, 0, 0, woodD);
        g.box(1.1, 0.16, 0.32, 0, 0.2, 0.05, gold);
        g.box(1.45, 0.14, 0.26, 0, 0.36, 0.1, wood);
        g.box(0.35, 0.32, 0.5, 0, 0, 0.22, red);
        g.box(0.55, 0.12, 0.2, 0, 0.5, 0.15, goldD);
      });
    }
  }

  function columnRing(R, y, count, h, rTop, rBot, hex, baseHex) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      g.cyl(rTop, rBot, h, x, y, z, hex, 8);
      g.box(rBot * 2.5, 0.22, rBot * 2.5, x, y, z, baseHex);
      g.box(rTop * 3.4, 0.26, rTop * 3.4, x, y + h, z, gold);
      g.box(rTop * 2.8, 0.16, rTop * 2.8, x, y + h + 0.26, z, woodD);
    }
  }

  function beamRing(R, y, hex, seg) {
    g.ring(R, 0.22, 0, y, 0, hex, seg);
    g.ring(R * 0.98, 0.12, 0, y + 0.28, 0, goldD, seg);
  }

  function roofTier(eaveR, topR, y, h, seg, hexTop, hexEave) {
    g.cyl(topR, eaveR, h, 0, y, 0, hexTop, seg);
    g.cyl(eaveR * 1.03, eaveR * 1.1, 0.24, 0, y - 0.06, 0, hexEave, seg);
    g.cyl(topR * 1.02, eaveR * 1.0, 0.12, 0, y + h - 0.12, 0, hexEave, seg);
    g.ring(eaveR * 1.07, 0.14, 0, y + 0.1, 0, gold, seg);
    g.ring(eaveR * 0.98, 0.1, 0, y + 0.4, 0, goldD, seg);
    const nr = Math.min(seg, 18);
    for (let i = 0; i < nr; i++) {
      const a = (i / nr) * Math.PI * 2;
      for (let s = 0; s < 6; s++) {
        const t = (s + 0.5) / 6;
        const r = topR + (eaveR - topR) * t;
        const yy = y + h * (1 - t) * 0.96;
        g.box(0.2, 0.1, 0.3, Math.cos(a) * r, yy, Math.sin(a) * r, goldD, {
          ry: Math.PI / 2 - a,
        });
      }
      g.box(0.34, 0.22, 0.4, Math.cos(a) * eaveR * 1.06, y + 0.22, Math.sin(a) * eaveR * 1.06, gold, {
        ry: Math.PI / 2 - a,
      });
      g.sphere(0.18, Math.cos(a) * eaveR * 1.1, y + 0.48, Math.sin(a) * eaveR * 1.1, goldL, 6);
    }
    g.ring(topR * 1.06, 0.16, 0, y + h - 0.08, 0, gold, seg);
  }

  function panelRing(R, y, count, wallH, winY, winH, ryOff, hexWall, hexTrim) {
    for (let i = 0; i < count; i++) {
      const a = ((i + 0.5) / count) * Math.PI * 2;
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      const ry = Math.PI / 2 - a + ryOff;
      const chord = 2 * R * Math.sin(Math.PI / count) * 0.88;
      g.box(chord, wallH * 0.42, 0.28, x, y, z, hexWall, { ry });
      g.box(chord * 0.92, 0.14, 0.34, x, y + wallH * 0.42, z, hexTrim, { ry });
      g.box(chord * 0.88, 0.12, 0.32, x, y + winY + winH, z, hexTrim, { ry });
      g.box(0.1, winH, 0.3, x - Math.cos(a + Math.PI / 2) * chord * 0.3, y + winY, z - Math.sin(a + Math.PI / 2) * chord * 0.3, hexTrim, { ry });
      g.box(0.1, winH, 0.3, x + Math.cos(a + Math.PI / 2) * chord * 0.3, y + winY, z + Math.sin(a + Math.PI / 2) * chord * 0.3, hexTrim, { ry });
      gl.box(chord * 0.86, winH * 0.92, 0.12, x, y + winY + winH * 0.5, z, glassC, { ry });
    }
  }

  g.cyl(16.2, 16.6, 1.1, 0, 0, 0, marble, 36);
  g.ring(16.15, 0.12, 0, 1.05, 0, marble3, 36);
  g.cyl(13.6, 14.0, 1.1, 0, 1.1, 0, marble2, 36);
  g.ring(13.55, 0.1, 0, 2.15, 0, marble3, 36);
  g.cyl(11.2, 11.6, 1.1, 0, 2.2, 0, marble, 36);
  g.ring(11.15, 0.1, 0, 3.25, 0, marble3, 36);

  stairs(16.2, 0, 1.1, 5.2, marble);
  stairs(13.6, 1.1, 2.2, 4.6, marble2);
  stairs(11.2, 2.2, 3.3, 4.2, marble);

  balustrade(15.9, 1.1, 40, 0.7, true);
  balustrade(13.3, 2.2, 34, 0.7, true);
  balustrade(10.9, 3.3, 28, 0.7, true);

  const baseY = 3.3;
  g.cyl(10.2, 10.2, 0.18, 0, baseY - 0.18, 0, marble3, 32);

  columnRing(9.4, baseY, 24, 6.8, 0.26, 0.32, red, marble2);
  panelRing(9.45, baseY, 24, 6.8, 3.0, 2.5, 0, redD, gold);
  beamRing(9.6, baseY + 6.8, woodD, 28);
  beamRing(9.85, baseY + 7.2, red, 28);

  {
    const a = Math.PI / 2;
    const x = Math.cos(a) * 9.5;
    const z = Math.sin(a) * 9.5;
    g.group({ x, y: baseY, z, ry: Math.PI / 2 - a }, (g) => {
      g.box(3.4, 5.8, 0.4, 0, 0, 0.12, redD);
      g.box(3.0, 5.3, 0.22, 0, 0.08, 0.32, woodD);
      g.box(0.16, 5.3, 0.12, -0.75, 0.08, 0.45, gold);
      g.box(0.16, 5.3, 0.12, 0.75, 0.08, 0.45, gold);
      g.box(3.0, 0.16, 0.12, 0, 2.6, 0.45, gold);
      g.box(3.0, 0.16, 0.12, 0, 4.0, 0.45, gold);
      g.box(3.6, 0.3, 0.5, 0, 5.8, 0.1, goldD);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 4; c++) {
          g.sphere(0.08, -1.05 + c * 0.7, 0.7 + r * 0.85, 0.5, goldL, 5);
        }
      }
    });
  }

  g.cyl(3.4, 3.7, 0.45, 0, baseY, 0, redD, 16);
  g.cyl(2.3, 2.5, 0.4, 0, baseY + 0.45, 0, gold, 12);
  g.box(2.0, 0.95, 1.1, 0, baseY + 0.85, 0, woodD);
  g.box(2.2, 0.12, 1.3, 0, baseY + 1.8, 0, gold);
  g.sphere(0.35, 0, baseY + 2.35, 0, goldL, 8);
  g.ring(4.5, 0.18, 0, baseY + 6.4, 0, gold, 16);
  g.ring(6.5, 0.15, 0, baseY + 6.55, 0, goldD, 20);

  dougongRing(10.3, baseY + 7.45, 24, 0.95);
  roofTier(12.6, 6.6, baseY + 7.7, 5.8, 28, blue, blueD);

  const drum2Y = baseY + 13.5;
  g.cyl(5.6, 5.8, 0.35, 0, drum2Y - 0.2, 0, marble2, 20);
  columnRing(5.2, drum2Y, 16, 3.4, 0.22, 0.26, red, marble3);
  panelRing(5.25, drum2Y, 16, 3.4, 1.2, 1.5, 0, redD, gold);
  beamRing(5.4, drum2Y + 3.4, woodD, 20);
  dougongRing(5.9, drum2Y + 3.65, 16, 0.8);
  roofTier(8.4, 4.0, drum2Y + 3.9, 4.6, 24, blueL, blueD);

  const drum3Y = drum2Y + 8.5;
  g.cyl(3.3, 3.5, 0.3, 0, drum3Y - 0.15, 0, marble2, 16);
  columnRing(3.0, drum3Y, 12, 2.8, 0.2, 0.24, red, marble3);
  panelRing(3.05, drum3Y, 12, 2.8, 1.0, 1.2, 0, redD, gold);
  beamRing(3.2, drum3Y + 2.8, woodD, 16);
  dougongRing(3.6, drum3Y + 3.05, 12, 0.7);
  roofTier(5.6, 1.3, drum3Y + 3.3, 4.2, 20, blue, blueD);

  const finY = drum3Y + 7.5;
  g.cyl(1.0, 1.3, 0.35, 0, finY - 0.1, 0, goldD, 12);
  g.sphere(0.85, 0, finY + 0.7, 0, gold, 12);
  g.ring(1.0, 0.12, 0, finY + 0.35, 0, goldL, 12);
  g.ring(0.9, 0.1, 0, finY + 0.95, 0, goldL, 12);
  g.cyl(0.08, 0.28, 1.6, 0, finY + 1.4, 0, goldL, 8);
  g.sphere(0.2, 0, finY + 3.1, 0, goldL, 8);
  g.cone(0.12, 0.55, 0, finY + 3.25, 0, gold, 6);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * 21.5;
    const z = Math.sin(a) * 21.5;
    g.group({ x, z, ry: Math.PI / 2 - a }, (g) => {
      g.box(1.0, 0.28, 1.0, 0, 0, 0, stone);
      g.box(0.7, 0.16, 0.7, 0, 0.28, 0, marble2);
      g.cyl(0.14, 0.18, 2.6, 0, 0.44, 0, redD, 8);
      g.box(0.88, 0.12, 0.88, 0, 3.04, 0, goldD);
      g.box(0.78, 0.95, 0.78, 0, 3.16, 0, lantern);
      g.box(0.1, 0.95, 0.82, -0.22, 3.16, 0, gold);
      g.box(0.1, 0.95, 0.82, 0.22, 3.16, 0, gold);
      g.box(0.82, 0.95, 0.1, 0, 3.16, -0.22, gold);
      g.box(0.82, 0.95, 0.1, 0, 3.16, 0.22, gold);
      g.cone(0.78, 0.5, 0, 4.11, 0, blueD, 6);
      g.sphere(0.14, 0, 4.65, 0, gold, 6);
    });
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * 25.5;
    const z = Math.sin(a) * 25.5;
    g.group({ x, z }, (g) => {
      g.cyl(0.9, 1.1, 0.55, 0, 0, 0, stone, 8);
      g.ring(1.0, 0.08, 0, 0.48, 0, marble3, 8);
      g.cone(1.35, 3.8, 0, 0.55, 0, green, 7);
      g.cone(1.0, 2.8, 0, 2.4, 0, greenD, 7);
      g.cone(0.65, 2.0, 0, 4.0, 0, green, 6);
    });
  }

  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const x = Math.cos(a) * 24;
    const z = Math.sin(a) * 24;
    g.group({ x, z, ry: Math.PI / 2 - a }, (g) => {
      g.box(3.6, 0.42, 3.6, 0, 0, 0, marble2);
      g.box(3.2, 0.12, 3.2, 0, 0.42, 0, marble3);
      const pts = [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]];
      for (const [cx, cz] of pts) {
        g.cyl(0.16, 0.2, 2.7, cx, 0.54, cz, red, 6);
        g.box(0.55, 0.14, 0.55, cx, 3.24, cz, gold);
      }
      g.box(2.9, 0.18, 0.2, 0, 3.38, 1.2, woodD);
      g.box(2.9, 0.18, 0.2, 0, 3.38, -1.2, woodD);
      g.box(0.2, 0.18, 2.9, 1.2, 3.38, 0, woodD);
      g.box(0.2, 0.18, 2.9, -1.2, 3.38, 0, woodD);
      g.hip(4.3, 4.3, 1.7, 0, 3.5, 0, blue, 0.9);
      g.box(0.12, 0.12, 1.8, 0, 5.15, 0, goldD);
      g.box(1.8, 0.12, 0.12, 0, 5.15, 0, goldD);
      g.sphere(0.22, 0, 5.35, 0, gold, 6);
      g.cone(0.1, 0.4, 0, 5.55, 0, goldL, 5);
    });
  }

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    const x = Math.cos(a) * 18.8;
    const z = Math.sin(a) * 18.8;
    g.group({ x, z, ry: Math.PI / 2 - a }, (g) => {
      g.box(0.7, 0.22, 0.7, 0, 0, 0, marble2);
      g.cyl(0.1, 0.12, 1.1, 0, 0.22, 0, stone, 6);
      g.box(0.5, 0.7, 0.35, 0, 1.32, 0, marble3);
      g.box(0.6, 0.14, 0.45, 0, 2.02, 0, marble);
      g.sphere(0.12, 0, 2.2, 0, goldD, 5);
    });
  }

  const solid = g.build();
  const glass = gl.build();
  return { solid, glass, name: '天坛祈年殿', radius: 28, height: 38 };
}
