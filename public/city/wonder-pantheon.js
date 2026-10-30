import { createGeo } from './geo.js';

export function buildPantheon() {
  const g = createGeo();

  const DRUM = 0xc2b095;
  const DRUM_DARK = 0x9c8b73;
  const DOME = 0x9da3a6;
  const CORNICE = 0xded5c0;
  const GRANITE = 0x8a7f74;
  const BLOCK = 0xd9c9a8;
  const WATER = 0x5f8fa8;
  const OCULUS = 0x747b7d;

  g.cyl(10.3, 10.3, 0.6, 0, 0, 0, DRUM_DARK, 32);
  g.cyl(10, 10, 9, 0, 0.5, 0, DRUM, 32);
  g.cyl(10.6, 10.6, 0.5, 0, 9.5, 0, CORNICE, 32);
  g.cyl(10.3, 10.3, 0.3, 0, 9.0, 0, BLOCK, 32);

  g.dome(10, 0, 10, 0, DOME, 32);
  g.cyl(10.5, 10.5, 0.4, 0, 10, 0, CORNICE, 32);
  g.cyl(10.15, 10.15, 0.3, 0, 10.4, 0, DRUM, 32);
  g.ring(1.2, 0.35, 0, 19.7, 0, OCULUS, 24);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.group({ ry: a }, () => {
      g.cyl(0.45, 0.5, 8.5, 9.7, 0.7, 0, BLOCK, 8);
    });
  }

  g.box(20, 8, 1.5, 0, 0, 10.75, BLOCK);

  const pCol = (x, z) => {
    g.group({ x, z }, () => {
      g.box(1.5, 0.4, 1.5, 0, 0, 0, GRANITE);
      g.cyl(0.5, 0.62, 9.4, 0, 0.4, 0, GRANITE, 12);
      g.cyl(0.72, 0.5, 0.7, 0, 9.8, 0, CORNICE, 12);
      g.box(1.4, 0.5, 1.4, 0, 10.5, 0, CORNICE);
    });
  };

  for (let i = 0; i < 8; i++) pCol(-10.5 + i * 3, 13);
  for (const x of [-7.5, -2.5, 2.5, 7.5]) pCol(x, 11.8);
  for (const x of [-7.5, -2.5, 2.5, 7.5]) pCol(x, 12.4);

  g.box(21.6, 2, 3.5, 0, 11, 12.6, CORNICE);
  g.box(20, 0.7, 3.6, 0, 12.3, 12.6, 0xf5efe0);
  g.gable(21.6, 3, 3.5, 0, 13, 12.6, DRUM);

  g.box(22, 0.4, 1.6, 0, 0, 14.6, CORNICE);
  g.box(21, 0.4, 1.4, 0, 0.4, 15.1, 0xcbbfa4);
  g.box(20, 0.4, 1.2, 0, 0.8, 15.5, CORNICE);

  g.group({ z: 19 }, () => {
    g.box(6, 0.4, 6, 0, 0, 0, BLOCK);
    g.cyl(2.6, 3.0, 0.9, 0, 0.4, 0, DRUM, 24);
    g.cyl(2.5, 2.5, 0.35, 0, 0.75, 0, WATER, 24);
    g.box(1.2, 0.5, 1.2, 0, 1.3, 0, GRANITE);
    g.box(0.5, 4.5, 0.5, 0, 1.8, 0, GRANITE);
    g.group({ y: 6.3, ry: Math.PI / 4 }, () => {
      g.cone(0.35, 0.8, 0, 0, 0, 0, GRANITE, 4);
    });
  });

  return { solid: g.build(), glass: null, name: '万神殿', radius: 23, height: 20 };
}

export function buildTriumphalArch() {
  const g = createGeo();

  const TRAV = 0xe3dccb;
  const LIGHT = 0xf5efe0;
  const DARK = 0xc7bba2;
  const PANEL = 0xd6c9a8;
  const BRONZE = 0x5e6b4f;
  const BRONZE_D = 0x6b7a58;

  g.box(15, 0.5, 6, 0, 0, 0, DARK);

  const piers = [
    { x: -6.1, w: 1.8 },
    { x: -2.7, w: 1.4 },
    { x: 2.7, w: 1.4 },
    { x: 6.1, w: 1.8 },
  ];
  for (const p of piers) {
    g.group({ x: p.x }, () => {
      g.box(p.w, 0.5, 5.4, 0, 0, 0, LIGHT);
      g.box(p.w, 6.0, 5, 0, 0.5, 0, TRAV);
      g.box(p.w + 0.3, 0.5, 5.4, 0, 6.5, 0, LIGHT);
    });
  }

  g.arch(2.0, 0.55, 5.4, 0, 4, 0, LIGHT, 12);
  g.arch(0.9, 0.45, 5.4, -4.3, 4, 0, LIGHT, 10);
  g.arch(0.9, 0.45, 5.4, 4.3, 4, 0, LIGHT, 10);

  g.box(4.0, 1.0, 5, 0, 6, 0, TRAV);
  g.box(1.8, 2.1, 5, -4.3, 4.9, 0, TRAV);
  g.box(1.8, 2.1, 5, 4.3, 4.9, 0, TRAV);

  const col = (x, z) => {
    g.group({ x, z }, () => {
      g.box(1.2, 1.0, 1.2, 0, 0, 0, LIGHT);
      g.cyl(0.3, 0.38, 5.2, 0, 1.0, 0, TRAV, 10);
      g.cyl(0.44, 0.3, 0.5, 0, 6.2, 0, LIGHT, 10);
      g.box(0.85, 0.3, 0.85, 0, 6.7, 0, LIGHT);
    });
  };
  for (const x of [-6.1, -2.7, 2.7, 6.1]) { col(x, 2.9); col(x, -2.9); }

  g.box(14, 1.3, 5, 0, 7, 0, TRAV);
  g.box(14.5, 0.5, 5.5, 0, 8.3, 0, LIGHT);
  g.box(14, 3.2, 5, 0, 8.8, 0, TRAV);
  g.box(7, 1.6, 0.3, 0, 10.2, 2.6, PANEL);
  g.box(7, 1.6, 0.3, 0, 10.2, -2.6, PANEL);
  g.box(14.5, 0.4, 5.5, 0, 12, 0, LIGHT);

  const horse = (x, z) => {
    g.group({ x, z }, () => {
      g.box(0.55, 1.0, 1.6, 0, 0.7, 0, BRONZE);
      g.box(0.4, 0.5, 0.5, 0, 1.45, 0.75, BRONZE);
      g.box(0.12, 0.7, 0.12, -0.18, 0, 0.55, BRONZE);
      g.box(0.12, 0.7, 0.12, -0.18, 0, -0.55, BRONZE);
      g.box(0.12, 0.7, 0.12, 0.18, 0, 0.55, BRONZE);
      g.box(0.12, 0.7, 0.12, 0.18, 0, -0.55, BRONZE);
    });
  };

  g.group({ y: 12.6 }, () => {
    g.box(4.2, 0.3, 2.6, 0, 0, 0, BRONZE);
    for (let i = 0; i < 4; i++) horse(-1.5 + i, 0.7);
    g.box(1.7, 0.8, 1.2, 0, 0.9, -1.0, BRONZE);
    g.box(0.25, 1.3, 0.25, 0, 1.55, -0.7, BRONZE);
    g.cyl(0.5, 0.5, 0.14, -0.85, 0.5, -1.0, BRONZE_D, 16, { rz: Math.PI / 2 });
    g.cyl(0.5, 0.5, 0.14, 0.85, 0.5, -1.0, BRONZE_D, 16, { rz: Math.PI / 2 });
  });

  return { solid: g.build(), glass: null, name: '凯旋门', radius: 8, height: 17 };
}
