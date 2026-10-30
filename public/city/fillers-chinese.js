// Chinese-quarter fillers: courtyard houses, small houses, pagodas, temples and garden pavilions.
import { createGeo } from './geo.js';

const WALL = 0xd8d2c4, BRICK = 0x8c8f93, ROOF = 0x55595e, RED = 0xa8322a, WOOD = 0x5a3a24, GOLD = 0xd4a73a, STONE = 0xbdb6a6, YELLOW = 0xd9a520, GREEN = 0x3f6b5a;

function siheyuan(variant = 0) {
  const g = createGeo();
  const h = 2.0 + variant * 0.15;
  g.box(7, 0.15, 7, 0, 0, 0, 0xb9b2a2);
  // perimeter walls with a gap for the gate
  g.box(7, 2.2, 0.35, 0, 0, -3.3, BRICK);
  g.box(0.35, 2.2, 7, -3.3, 0, 0, BRICK);
  g.box(0.35, 2.2, 7, 3.3, 0, 0, BRICK);
  g.box(2.6, 2.2, 0.35, -2.2, 0, 3.3, BRICK);
  g.box(2.6, 2.2, 0.35, 2.2, 0, 3.3, BRICK);
  g.box(1.8, 0.25, 0.6, 0, 2.2, 3.3, ROOF);
  g.box(1.2, 1.9, 0.2, 0, 0.15, 3.35, RED);
  // four halls: main hall (north, taller), two side halls, south row
  g.box(5.6, h + 0.4, 1.8, 0, 0.15, -2.2, WALL);
  g.hip(6.2, 2.4, 1.2, 0, h + 0.55, -2.2, ROOF, 1);
  for (const x of [-2.25, 2.25]) { g.box(1.5, h, 2.4, x, 0.15, 0.2, WALL); g.gable(1.9, 0.9, 2.8, x, h + 0.15, 0.2, ROOF, { ry: Math.PI / 2 }); }
  g.box(4.6, h - 0.2, 1.1, 0, 0.15, 2.5, WALL);
  g.gable(5.0, 0.7, 1.5, 0, h - 0.05, 2.5, ROOF);
  for (const x of [-1.8, -0.6, 0.6, 1.8]) g.box(0.18, h + 0.3, 0.18, x, 0.15, -1.25, RED);
  // courtyard tree
  g.cyl(0.08, 0.12, 0.8, 0, 0.15, 0.6, WOOD, 5);
  g.cone(0.6, 1.4, 0, 0.9, 0.6, 0x4f7a3a, 6);
  return g.build();
}

function house(variant = 0) {
  const g = createGeo();
  const w = 4.6 + variant * 0.4, d = 3.6, h = 2.2 + variant * 0.2;
  g.box(w + 0.8, 0.4, d + 0.8, 0, 0, 0, STONE);
  g.box(w, h, d, 0, 0.4, 0, WALL);
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) g.box(0.22, h, 0.22, x, 0.4, z, WOOD);
  g.box(w, 0.18, 0.2, 0, 0.4 + h - 0.18, d / 2, WOOD);
  g.box(0.9, 1.6, 0.1, 0, 0.4, d / 2 + 0.02, RED);
  for (const x of [-w / 3, w / 3]) g.box(0.8, 0.7, 0.08, x, 1.3, d / 2 + 0.02, 0x3b3430);
  g.hip(w + 1.2, d + 1.2, 1.3, 0, 0.4 + h, 0, variant === 2 ? GREEN : ROOF, 1);
  g.box(w * 0.5, 0.15, 0.25, 0, 0.4 + h + 1.2, 0, ROOF);
  return g.build();
}

function pagoda(variant = 0) {
  const g = createGeo();
  const roof = variant === 1 ? 0x7a3b2a : GREEN;
  g.box(5.2, 0.6, 5.2, 0, 0, 0, STONE);
  let y = 0.6, s = 3.6;
  for (let i = 0; i < 5; i++) {
    const h = i === 0 ? 1.8 : 1.3;
    g.box(s, h, s, 0, y, 0, RED);
    g.box(s * 0.35, h * 0.6, 0.08, 0, y + 0.1, s / 2 + 0.02, 0x3b2a22);
    y += h;
    g.hip(s + 1.4, s + 1.4, 0.55, 0, y, 0, roof, 1.4);
    y += 0.45;
    s *= 0.85;
  }
  g.cone(0.25, 1.2, 0, y, 0, GOLD, 6);
  g.sphere(0.2, 0, y + 0.5, 0, GOLD, 6);
  g.sphere(0.14, 0, y + 0.9, 0, GOLD, 6);
  return g.build();
}

function temple(variant = 0) {
  const g = createGeo();
  g.box(6.2, 0.6, 5.6, 0, 0, -0.4, STONE);
  for (let i = 0; i < 3; i++) g.box(2, 0.2, 0.35, 0, i * 0.2, 2.55 + 0.35 * (2 - i), STONE);
  g.box(5.0, 2.4, 3.2, 0, 0.6, -0.8, 0xc9a98a);
  for (let i = 0; i < 6; i++) g.cyl(0.14, 0.16, 2.6, -2.5 + i, 0.6, 0.95, RED, 6);
  g.box(5.8, 0.3, 4.4, 0, 3.2, -0.4, WOOD);
  g.hip(6.2, 5.0, 0.9, 0, 3.5, -0.4, YELLOW, 1.2);
  g.box(4.4, 0.6, 3.0, 0, 4.2, -0.4, RED);
  g.hip(5.4, 3.8, 1.2, 0, 4.8, -0.4, YELLOW, 1.2);
  g.box(2.6, 0.18, 0.3, 0, 5.9, -0.4, 0xb98a1a);
  // incense burner
  g.cyl(0.35, 0.3, 0.5, 0, 0, 3.0 - 0.1 * variant, 0x6e5a3a, 8);
  g.hip(0.9, 0.9, 0.35, 0, 0.5, 3.0 - 0.1 * variant, 0x6e5a3a, 0.5);
  return g.build();
}

function pavilion(variant = 0) {
  const g = createGeo();
  g.box(7, 0.08, 7, 0, 0, 0, 0x7fa65a);
  g.box(4.4, 0.12, 2.6, -0.6, 0.02, 1.6, 0x7b98a6);
  g.cyl(1.6, 1.7, 0.4, 1.2, 0, -1.4, STONE, 6);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.cyl(0.08, 0.08, 1.9, 1.2 + Math.cos(a) * 1.3, 0.4, -1.4 + Math.sin(a) * 1.3, RED, 5); }
  g.cyl(1.55, 1.55, 0.18, 1.2, 2.3, -1.4, WOOD, 6);
  g.cone(2.0 + 0.1 * variant, 1.6, 1.2, 2.45, -1.4, variant === 2 ? GREEN : ROOF, 6);
  g.sphere(0.16, 1.2, 4.1, -1.4, GOLD, 6);
  g.arch(1.1, 0.25, 0.9, -0.6, 0.0, 1.6, 0xa8322a, 6, { ry: Math.PI / 2 });
  for (const [x, z, r] of [[-2.6, -2.2, 0.5], [-2.0, -2.7, 0.35], [2.7, 2.6, 0.45]]) g.sphere(r, x, r * 0.5, z, 0x8f8a80, 6);
  return g.build();
}

export const CHINESE_FILLERS = { siheyuan, house, pagoda, temple, pavilion };
