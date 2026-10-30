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
  const BRONZE = 0x5e6b4f;
  const RIB = 0xb9b4a8;

  const R = 17;
  const DOME_Y = 22.5;
  const FLOOR = 2.4;

  g.cyl(18.4, 18.4, 0.9, 0, 0, 0, DRUM_DARK, 48);
  g.cyl(17.8, 17.8, 0.5, 0, 0.9, 0, BLOCK, 48);
  g.cyl(17.5, 17.5, 21.0, 0, 0.9, 0, DRUM, 48);
  g.cyl(18.0, 18.0, 0.6, 0, 21.9, 0, CORNICE, 48);
  g.cyl(18.4, 18.4, 0.6, 0, 21.9, 0, CORNICE, 48);

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.group({ ry: a }, () => {
      g.box(1.15, 0.5, 1.05, 17.35, 1.4, 0, GRANITE);
      g.box(0.7, 18.9, 0.62, 17.4, 2.2, 0, BLOCK);
      g.box(1.2, 0.8, 1.0, 17.4, 21.1, 0, CORNICE);
    });
  }

  g.dome(R, 0, DOME_Y, 0, DOME, 48);

  const thetaMin = Math.asin(2.5 / R);
  const thetaMax = Math.PI / 2 - 0.025;
  const ribs = 20;
  const ribSteps = 8;

  for (let j = 0; j < ribs; j++) {
    const a = (j / ribs) * Math.PI * 2;
    g.group({ ry: a }, () => {
      for (let i = 0; i < ribSteps; i++) {
        const t0 = thetaMin + (thetaMax - thetaMin) * (i / ribSteps);
        const t1 = thetaMin + (thetaMax - thetaMin) * ((i + 1) / ribSteps);
        const tm = (t0 + t1) / 2;
        const len = R * (t1 - t0) * 1.18;
        const x = R * Math.sin(tm);
        const y = DOME_Y + R * Math.cos(tm);
        g.box(0.38, len, 0.5, x, y - len / 2, 0, RIB, { rz: -(Math.PI / 2 + tm) });
      }
    });
  }

  for (const t of [0.32, 0.62, 0.92, 1.22, 1.45]) {
    const rr = R * Math.sin(t);
    const yy = DOME_Y + R * Math.cos(t);
    g.ring(rr, 0.18, 0, yy, 0, RIB, 48);
  }

  g.ring(2.3, 0.45, 0, DOME_Y + R - 0.15, 0, OCULUS, 32);
  g.cyl(2.2, 2.2, 0.6, 0, DOME_Y + R - 1.1, 0, 0x3b3f40, 32);

  g.box(24.5, FLOOR, 9.0, 0, 0, 15.0, BLOCK);

  for (let i = 0; i < 4; i++) {
    g.box(24.5, (i + 1) * 0.6, 1.6, 0, 0, 23.0 - i * 1.6, BLOCK);
  }

  const colX = [-10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5];
  for (const x of colX) {
    g.group({ x, z: 18.0 }, () => {
      g.box(1.7, 0.5, 1.7, 0, FLOOR, 0, GRANITE);
      g.cyl(0.72, 0.9, 16.0, 0, FLOOR + 0.5, 0, BLOCK, 12);
      g.cyl(0.95, 0.72, 0.7, 0, FLOOR + 16.5, 0, CORNICE, 12);
      g.box(1.6, 0.5, 1.6, 0, FLOOR + 17.2, 0, CORNICE);
    });
  }

  g.box(25.2, 2.6, 8.2, 0, 20.1, 15.5, DRUM);
  g.box(25.8, 0.5, 8.8, 0, 20.1, 15.5, CORNICE);
  g.box(25.2, 1.4, 0.5, 0, 21.4, 19.4, BLOCK);
  g.box(25.8, 0.5, 8.8, 0, 22.7, 15.5, CORNICE);
  g.gable(25.2, 4.4, 8.2, 0, 22.7, 15.5, DRUM);

  g.box(5.2, 10.5, 0.6, 0, FLOOR, 17.1, BRONZE);
  g.box(6.4, 0.7, 0.9, 0, FLOOR + 10.5, 17.1, CORNICE);
  g.box(0.7, 10.5, 0.9, -3.2, FLOOR, 17.1, CORNICE);
  g.box(0.7, 10.5, 0.9, 3.2, FLOOR, 17.1, CORNICE);

  g.group({ z: 23.8 }, () => {
    g.box(6, 0.4, 6, 0, 0, 0, BLOCK);
    g.cyl(2.6, 3.0, 0.9, 0, 0.4, 0, DRUM, 24);
    g.cyl(2.5, 2.5, 0.35, 0, 0.75, 0, WATER, 24);
    g.box(1.2, 0.5, 1.2, 0, 1.3, 0, GRANITE);
    g.box(0.5, 4.5, 0.5, 0, 1.8, 0, GRANITE);
    g.group({ y: 6.3, ry: Math.PI / 4 }, () => {
      g.cone(0.35, 0.8, 0, 0, 0, 0, GRANITE, 4);
    });
  });

  return { solid: g.build(), glass: null, name: '万神殿', radius: 24, height: 40 };
}

export function buildTriumphalArch() {
  const g = createGeo();

  const TRAV = 0xe3dccb;
  const LIGHT = 0xf5efe0;
  const DARK = 0xc7bba2;
  const PANEL = 0xd6c9a8;
  const BRONZE = 0x5e6b4f;
  const BRONZE_D = 0x6b7a58;
  const SHADOW = 0x9d907a;

  const H = 18;

  g.box(26.5, 0.8, 14.5, 0, 0, 0, DARK);
  g.box(25.4, 0.35, 13.4, 0, 0.8, 0, LIGHT);

  const piers = [
    { x: -11.75, w: 2.5 },
    { x: -5.0, w: 2.0 },
    { x: 5.0, w: 2.0 },
    { x: 11.75, w: 2.5 },
  ];

  for (const p of piers) {
    g.box(p.w, H, 12, p.x, 0.8, 0, TRAV);
    g.box(p.w + 0.5, 0.55, 12.6, p.x, 0.8, 0, LIGHT);
    g.box(p.w + 0.4, 0.45, 12.6, p.x, H - 0.75, 0, LIGHT);
  }

  g.box(8, H - 13, 12, 0, 13, 0, TRAV);
  g.box(4.5, H - 9.75, 12, -8.25, 9.75, 0, TRAV);
  g.box(4.5, H - 9.75, 12, 8.25, 9.75, 0, TRAV);

  g.arch(4.55, 0.55, 12.2, 0, 9, 0, LIGHT, 20);
  g.arch(2.6, 0.35, 12.2, -8.25, 7.5, 0, LIGHT, 14);
  g.arch(2.6, 0.35, 12.2, 8.25, 7.5, 0, LIGHT, 14);

  for (const z of [6.15, -6.15]) {
    g.arch(4.85, 0.45, 0.5, 0, 9, z, PANEL, 20);
    g.arch(2.9, 0.3, 0.5, -8.25, 7.5, z, PANEL, 14);
    g.arch(2.9, 0.3, 0.5, 8.25, 7.5, z, PANEL, 14);

    g.box(0.85, 1.7, 0.7, 0, 12.9, z, LIGHT);
    g.box(0.7, 1.25, 0.6, -8.25, 9.5, z, LIGHT);
    g.box(0.7, 1.25, 0.6, 8.25, 9.5, z, LIGHT);
  }

  for (const z of [6.7, -6.7]) {
    for (const p of piers) {
      g.group({ x: p.x, z }, () => {
        g.box(1.5, 1.0, 1.2, 0, 0.8, 0, LIGHT);
        g.cyl(0.42, 0.52, 13.4, 0, 1.8, 0, TRAV, 12);
        g.cyl(0.6, 0.42, 0.6, 0, 15.2, 0, LIGHT, 12);
        g.box(1.15, 0.4, 1.0, 0, 15.8, 0, LIGHT);
      });
    }
  }

  g.box(27, 0.7, 13, 0, H, 0, LIGHT);
  g.box(26, 5.6, 12, 0, 18.7, 0, TRAV);
  g.box(26.4, 0.4, 12.4, 0, 18.7, 0, LIGHT);
  g.box(12, 2.4, 0.35, 0, 20.2, 6.05, PANEL);
  g.box(12, 2.4, 0.35, 0, 20.2, -6.05, PANEL);
  g.box(2.2, 2.4, 0.35, -11.9, 20.2, 6.05, PANEL);
  g.box(2.2, 2.4, 0.35, 11.9, 20.2, 6.05, PANEL);
  g.box(27, 0.8, 13, 0, 24.3, 0, LIGHT);
  g.box(26, 0.45, 12, 0, 25.1, 0, TRAV);

  g.group({ y: 25.1 }, () => {
    g.box(7, 0.6, 3.4, 0, 0, 0, BRONZE_D);
    g.box(2.2, 1.1, 1.8, 0, 0.6, -0.8, BRONZE);
    g.box(2.0, 0.8, 0.3, 0, 0.75, 0.35, BRONZE_D);
    g.box(0.5, 1.1, 0.4, 0, 1.7, -1.05, BRONZE_D);
    g.sphere(0.22, 0, 3.0, -1.05, BRONZE_D, 10);

    for (const x of [-1.8, -0.6, 0.6, 1.8]) {
      g.box(0.5, 0.9, 1.4, x, 1.0, 0.8, BRONZE);
      g.box(0.32, 0.7, 0.4, x, 1.5, 1.55, BRONZE);
      g.box(0.28, 0.35, 0.5, x, 1.9, 1.8, BRONZE);
      g.box(0.12, 0.55, 0.12, x - 0.18, 0.45, 0.45, BRONZE);
      g.box(0.12, 0.55, 0.12, x + 0.18, 0.45, 0.45, BRONZE);
      g.box(0.12, 0.55, 0.12, x - 0.18, 0.45, 1.15, BRONZE);
      g.box(0.12, 0.55, 0.12, x + 0.18, 0.45, 1.15, BRONZE);
    }

    g.cyl(0.55, 0.55, 0.16, -1.25, 0.75, -0.8, BRONZE_D, 16, { rz: Math.PI / 2 });
    g.cyl(0.55, 0.55, 0.16, 1.25, 0.75, -0.8, BRONZE_D, 16, { rz: Math.PI / 2 });
  });

  return { solid: g.build(), glass: null, name: '凯旋门', radius: 15, height: 28 };
}
