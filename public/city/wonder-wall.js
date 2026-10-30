// 万里城关: a great city-wall section with a gate passage, a two-storey gatehouse, a barbican and corner watchtowers.
// The wall runs along x; +z is the outside face.
import { createGeo } from './geo.js';

const BRICK = 0x8c8f93, BRICK_L = 0x9a9da1, PLINTH = 0x6e7175, PAVE = 0xa7a49c, RED = 0xa8322a, ROOF = 0x4f5d58, GOLD = 0xd4a73a, WOOD = 0x5a3a24, DARK = 0x2f2c2a;
const H = 10, T = 7, GAP = 5;

function wallRun(g, x0, x1) {
  const len = x1 - x0, cx = (x0 + x1) / 2;
  if (len <= 0) return;
  g.box(len, 1.2, T + 0.6, cx, 0, 0, PLINTH);
  g.box(len, H - 1.2, T, cx, 1.2, 0, BRICK, { sz: 1 });
  g.box(len, 0.3, T - 0.6, cx, H, 0, PAVE);
  // crenellations on the outside edge, a low parapet on the inside edge
  g.box(len, 0.6, 0.4, cx, H, T / 2 - 0.2, BRICK_L);
  for (let x = x0 + 0.6; x < x1 - 0.3; x += 1.2) g.box(0.6, 0.7, 0.4, x, H + 0.6, T / 2 - 0.2, BRICK_L);
  g.box(len, 0.9, 0.35, cx, H, -T / 2 + 0.18, BRICK_L);
}

function hall(g, w, d, h, y, roofW, roofD) {
  g.box(w, h, d, 0, y, 0, 0xc9b9a0);
  const nx = Math.max(2, Math.round(w / 2));
  for (let i = 0; i <= nx; i++) for (const z of [-d / 2, d / 2]) g.cyl(0.22, 0.25, h, -w / 2 + (i * w) / nx, y, z, RED, 6);
  g.box(w + 0.6, 0.35, d + 0.6, 0, y + h, 0, WOOD);
  g.hip(roofW, roofD, 1.6, 0, y + h + 0.35, 0, ROOF, 1.6);
}

export function buildCityWall(length = 72) {
  const g = createGeo();
  const half = length / 2;
  wallRun(g, -half, -GAP / 2);
  wallRun(g, GAP / 2, half);
  // gate passage: arch frame + lintel block over the gap
  g.arch(GAP / 2, 0.8, T + 0.4, 0, 0, 0, PLINTH, 10);
  g.box(GAP + 0.4, H - GAP / 2 - 0.8, T, 0, GAP / 2 + 0.8, 0, BRICK);
  g.box(GAP, 0.3, T - 0.6, 0, H, 0, PAVE);
  g.box(GAP - 0.8, 0.06, T + 0.6, 0, 0, 0, 0x6b6459);
  // mamian buttress towers every 12 m on the outside face
  for (let x = -half + 6; x <= half - 6; x += 12) {
    if (Math.abs(x) < 8) continue;
    g.box(4, H + 0.4, 3, x, 0, T / 2 + 1.5, BRICK);
    g.box(4.2, 0.5, 3.2, x, H + 0.4, T / 2 + 1.5, BRICK_L);
    for (const dx of [-1.6, -0.5, 0.6, 1.6]) g.box(0.6, 0.7, 0.4, x + dx, H + 0.9, T / 2 + 2.9, BRICK_L);
    for (const y of [3.5, 7]) g.box(0.25, 0.8, 0.06, x, y, T / 2 + 3.02, DARK);
  }
  // two-storey gatehouse on top of the gate
  g.group({ y: H + 0.3 }, () => {
    g.box(18, 1.2, T - 0.2, 0, 0, 0, PLINTH);
    hall(g, 15, 5.2, 4.2, 1.2, 19, 8.4);
    hall(g, 11, 3.8, 3.4, 7.4, 14.5, 6.6);
    g.box(7, 0.3, 0.3, 0, 12.4, 0, ROOF);
    for (const x of [-3.4, 3.4]) { g.cone(0.25, 1.0, x, 12.3, 0, GOLD, 6); g.sphere(0.25, x, 13.3, 0, GOLD, 6); }
  });
  // semicircular barbican in front of the gate with its own offset gate
  const R = 11, N = 18;
  for (let i = 0; i < N; i++) {
    const a = Math.PI * (i + 0.5) / N;
    if (i === 4) continue; // barbican gate opening
    const x = Math.cos(a) * R, z = T / 2 + Math.sin(a) * R * 0.75;
    const seg = (Math.PI * R) / N + 0.35;
    g.box(seg, 7, 2.6, x, 0, z, BRICK, { ry: -Math.atan2(Math.cos(a) * 0.75, -Math.sin(a)) });
    g.box(0.7, 0.7, 0.4, x, 7, z, BRICK_L, { ry: -Math.atan2(Math.cos(a) * 0.75, -Math.sin(a)) });
  }
  // corner watchtowers at the wall ends
  for (const s of [-1, 1]) {
    const x = s * (half + 1.5);
    g.box(9, H + 6, 9, x, 0, 0.5, BRICK);
    g.box(9.4, 0.5, 9.4, x, H + 6, 0.5, BRICK_L);
    for (const y of [5, 9, 13]) for (const dx of [-2.6, 0, 2.6]) g.box(0.7, 0.9, 0.06, x + dx, y, 5.03, DARK);
    g.box(6.6, 3.2, 6.6, x, H + 6.5, 0.5, 0xc9b9a0);
    g.hip(9, 9, 2.2, x, H + 9.7, 0.5, ROOF, 1.4);
    g.sphere(0.3, x, H + 12, 0.5, GOLD, 6);
  }
  // stair ramps on the inside face
  for (const x of [-half + 14, half - 14]) {
    for (let i = 0; i < 10; i++) g.box(2.4, (i + 1) * (H / 10), 1.1, x, 0, -T / 2 - 0.55 - (9 - i) * 1.1, BRICK_L);
  }
  return { solid: g.build(), glass: null, name: '万里城关', radius: half + 8, height: H + 13 };
}
