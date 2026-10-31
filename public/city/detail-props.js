import { createGeo } from './geo.js';

export function antenna(variant = 0) {
  const g = createGeo();
  g.cyl(0.018, 0.04, 2.2, 0, 0, 0, 0x6a6a6a, 3);
  g.box(0.62, 0.035, 0.035, 0, 1.45, 0, 0x3a3a3a);
  if (variant % 2 === 0) g.box(0.42, 0.03, 0.03, 0, 1.82, 0, 0x3a3a3a);
  return g.build();
}

export function railing(variant = 0) {
  const g = createGeo();
  const posts = variant % 2 === 0 ? 3 : 2;
  for (let i = 0; i < posts; i++) {
    const x = -1 + (2 * i) / (posts - 1);
    g.box(0.07, 0.55, 0.07, x, 0, 0, 0x8a8070);
  }
  g.box(2, 0.055, 0.07, 0, 0.5, 0, 0x8a8070);
  if (posts === 2) g.box(2, 0.045, 0.06, 0, 0.24, 0, 0x8a8070);
  return g.build();
}

export function awning(variant = 0) {
  const g = createGeo();
  const colors = [0xb5452f, 0x2e6f8e, 0x5f8a3a];
  const color = colors[Math.abs(variant) % colors.length];
  g.box(2.4, 0.08, 1.2, 0, 0.5, 0.62, color, { rx: 0.26 });
  return g.build();
}

export function chimneyPot(variant = 0) {
  const g = createGeo();
  if (variant % 2 === 0) {
    g.cyl(0.11, 0.14, 0.42, 0, 0, 0, 0x8a4a3a, 5);
  } else {
    g.box(0.24, 0.42, 0.24, 0, 0, 0, 0x8a4a3a);
    g.box(0.29, 0.055, 0.29, 0, 0.42, 0, 0x8a4a3a);
  }
  return g.build();
}

export function lampPost(variant = 0) {
  const g = createGeo();
  g.cyl(0.035, 0.055, 3.0, 0, 0, 0, 0x3a3a3a, 3);
  g.sphere(variant % 2 === 0 ? 0.16 : 0.2, 0, 3.05, 0, 0xfff1c4, 3);
  return g.build();
}

export function bench(variant = 0) {
  const g = createGeo();
  const wood = [0x8a6a48, 0x6f5236, 0x9a7a52][Math.abs(variant) % 3];
  const w = 1.7 + (Math.abs(variant) % 2) * 0.3;
  g.box(w, 0.09, 0.52, 0, 0.4, 0, wood);
  g.box(w, 0.34, 0.08, 0, 0.58, -0.22, wood);
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) g.box(0.09, 0.4, 0.48, x, 0, 0, 0x3a3a3a);
  return g.build();
}

export function planter(variant = 0) {
  const g = createGeo();
  const stone = Math.abs(variant) % 2 ? 0xb2aa98 : 0x9a9282;
  g.box(1.3, 0.5, 1.3, 0, 0, 0, stone);
  g.box(1.14, 0.06, 1.14, 0, 0.46, 0, 0x5a4634);
  const leaf = [0x5d8a3c, 0x6f9a46, 0x7a9a48][Math.abs(variant) % 3];
  g.sphere(0.5, 0, 0.78, 0, leaf, 5);
  if (Math.abs(variant) % 2) g.sphere(0.2, 0.3, 1.15, -0.1, 0xd9534f, 4);
  return g.build();
}
