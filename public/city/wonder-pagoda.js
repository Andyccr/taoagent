import { createGeo } from './geo.js';

export function buildGreatPagoda() {
  const g = createGeo();
  const gl = createGeo();

  const COL = {
    paving: 0xb9b0a2,
    stone: 0x9aa0a6,
    base: 0x8b9096,
    baseDark: 0x7a7f85,
    wall: 0x9a8570,
    wallDark: 0x826f5d,
    body: 0x9b3b2a,
    bodyDark: 0x7e2c1e,
    eave: 0x3f5a50,
    eaveDark: 0x31473d,
    balcony: 0xe8e4da,
    gold: 0xd4a73a,
    goldDark: 0xb5872e,
    pearl: 0xf6e8c2,
    burner: 0x4a4a48,
    door: 0x2a241c,
    window: 0x1f3a5f,
  };

  const TAU = Math.PI * 2;

  // courtyard paving
  g.box(26, 0.25, 26, 0, -0.12, 0, COL.paving);

  // perimeter low walls (front split for the gate)
  const wallH = 1.6;
  const half = 13;
  g.box(10, wallH, 0.5, -8, 0, half, COL.wall);
  g.box(10, wallH, 0.5, 8, 0, half, COL.wall);
  g.box(26, wallH, 0.5, 0, 0, -half, COL.wall);
  g.box(0.5, wallH, 26, -half, 0, 0, COL.wall);
  g.box(0.5, wallH, 26, half, 0, 0, COL.wall);

  // merlons (crenellations) on top of the walls
  const merlon = (x, z) => g.box(0.45, 0.55, 0.45, x, wallH, z, COL.wallDark);
  for (let x = -12.5; x <= 12.5; x += 1.9) merlon(x, -half);
  for (let z = -12.5; z <= 12.5; z += 1.9) { merlon(-half, z); merlon(half, z); }
  for (let x = -12.5; x <= -4; x += 1.9) merlon(x, half);
  for (let x = 4; x <= 12.5; x += 1.9) merlon(x, half);

  // front gate house
  g.box(8, 3.4, 4.2, 0, 0, 13, COL.wall);
  g.hip(9.6, 5.2, 2.4, 0, 3.4, 13, COL.eave, 0.4);
  g.box(2.6, 2.5, 0.35, 0, 0, 15.1, COL.door);
  g.arch(1.3, 0.35, 0.5, 0, 2.5, 14.9, COL.wallDark, 8);

  // two side halls (face the central axis)
  function hall(api) {
    api.box(3.4, 2.6, 3.0, 0, 0, 0, COL.wall);
    api.hip(4.8, 3.8, 1.9, 0, 2.6, 0, COL.eave, 0.3);
    api.box(1.1, 1.7, 0.2, 0, 0, 1.6, COL.door);
    api.cyl(0.12, 0.14, 2.6, -1.2, 0, 1.5, COL.wallDark, 6);
    api.cyl(0.12, 0.14, 2.6, 1.2, 0, 1.5, COL.wallDark, 6);
  }
  g.group({ x: 11, ry: -Math.PI / 2 }, () => hall(g));
  g.group({ x: -11, ry: Math.PI / 2 }, () => hall(g));

  // incense burner on the approach
  g.cyl(0.75, 0.9, 0.5, 0, 0, 7, COL.burner, 8);
  g.cyl(1.0, 0.8, 0.7, 0, 0.5, 7, COL.burner, 8);
  g.cyl(0.55, 0.7, 0.5, 0, 1.2, 7, COL.burner, 8);
  g.cone(0.35, 0.5, 0, 1.7, 7, COL.burner, 8);

  // stepped octagonal stone base (3 steps) + platform
  g.cyl(9.0, 9.4, 1.6, 0, 0, 0, COL.base, 8);
  g.cyl(8.4, 8.8, 1.4, 0, 1.6, 0, COL.baseDark, 8);
  g.cyl(7.7, 8.1, 1.3, 0, 3.0, 0, COL.base, 8);
  g.cyl(7.0, 7.1, 0.8, 0, 4.3, 0, COL.stone, 8);

  // balustrade around the platform
  for (let k = 0; k < 16; k++) {
    g.group({ ry: k * TAU / 16 }, () => g.box(0.16, 0.7, 0.16, 6.55, 5.1, 0, COL.balcony));
  }
  g.ring(6.55, 0.12, 0, 5.8, 0, COL.stone, 16);

  // 13 storeys
  const storeys = 13;
  let y = 5.1;
  for (let i = 0; i < storeys; i++) {
    const t = i / (storeys - 1);
    const r = 6.2 * (1 - 0.5 * t);
    const hb = 3.2 * (1 - 0.4 * t);
    const bodyHex = i % 2 === 0 ? COL.body : COL.bodyDark;
    const eaveHex = i % 2 === 0 ? COL.eave : COL.eaveDark;

    g.cyl(r * 0.98, r * 1.04, hb, 0, y, 0, bodyHex, 8);

    const ey = y + hb;
    const er = r * 1.5;
    g.cyl(r * 0.95, er, 0.6, 0, ey, 0, eaveHex, 8);
    g.ring(er, 0.09, 0, ey + 0.55, 0, COL.eaveDark, 16);

    for (let k = 0; k < 8; k++) {
      g.group({ ry: k * TAU / 8 }, () => g.sphere(0.13, er, ey - 0.1, 0, COL.gold, 6));
    }

    if (i < 4) {
      g.cyl(r * 1.1, r * 1.12, 0.18, 0, ey + 0.02, 0, COL.balcony, 8);
      g.ring(r * 1.08, 0.05, 0, ey + 0.3, 0, COL.balcony, 12);
    }

    const wy = y + hb * 0.5;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 8 + k * Math.PI / 2;
      gl.group({ ry: a }, () => gl.box(0.5, 0.95, 0.12, r, wy, 0, COL.window));
    }

    y = ey + 0.6;
  }

  // gold finial spire
  let fy = y;
  g.cyl(0.8, 1.0, 1.1, 0, fy, 0, COL.goldDark, 8);
  fy += 1.1;
  for (let k = 0; k < 5; k++) {
    g.ring(1.1 - k * 0.18, 0.13, 0, fy, 0, COL.gold, 12);
    fy += 0.38;
  }
  g.cone(0.6, 6.0, 0, fy, 0, COL.gold, 8);
  fy += 6.0;
  g.sphere(0.62, 0, fy, 0, COL.pearl, 10);

  return {
    solid: g.build(),
    glass: gl.build(),
    name: '万佛塔',
    radius: 19,
    height: 56,
  };
}
