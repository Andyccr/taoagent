import { createGeo } from './geo.js';

const S1 = 0xd8c59a;
const S2 = 0xc9b285;
const S3 = 0xe2d2ad;
const SK = 0xa69068;
const SD = 0x8a7856;
const BRN = 0x6b573a;
const SKN = 0xd8b48c;
const GRN = 0x3c5a3f;
const GRD = 0x2a4632;
const TRK = 0x59462f;
const WAT = 0x6f9bb3;
const SOIL = 0x8a7a5e;

const stone = (i) => [S1, S2, S3][((i % 3) + 3) % 3];

export function buildGreatAqueduct() {
  const g = createGeo();

  const L = 200;
  const bW = 8, bSpring = 0, bTop = 17;
  const mW = 7, mBase = 18, mTop = 34;
  const tW = 6, tBase = 35, tTop = 40;

  const bPiers = [-100, -60, -20, 20, 60, 100];
  const mPiers = [-100, -60, -20, 20, 60, 100];
  const tPiers = [];
  for (let i = 0; i <= 16; i++) tPiers.push(-100 + i * 12.5);

  const arch = (zc, r, t, w, spring, seg, c) => {
    g.arch(r, t, w, 0, spring, zc, c, seg, { ry: Math.PI / 2 });
  };

  const pier = (zc, w, hd, baseY, topY, idx, opts = {}) => {
    const h = topY - baseY;
    g.box(w, h, hd * 2, 0, baseY, zc, stone(idx));
    g.box(w + 0.7, 0.6, hd * 2 + 0.5, 0, baseY, zc, SK);
    g.box(w + 0.5, 0.5, hd * 2 + 0.4, 0, topY - 0.5, zc, S3);
    if (opts.course !== false) {
      for (let y = baseY + 1.3; y < topY - 0.9; y += 1.5) {
        g.box(w + 0.06, 0.12, hd * 2 + 0.06, 0, y, zc, y % 3 < 1 ? S3 : SK);
      }
    }
    if (opts.bossage) {
      for (let y = baseY + 1.0; y < topY - 1.1; y += 1.7) {
        g.box(1.4, 0.85, 0.24, 0, y, zc + hd + 0.02, stone(idx + 2));
        g.box(1.4, 0.85, 0.24, 0, y, zc - hd - 0.02, stone(idx + 1));
      }
    }
    if (opts.columns) {
      for (const sx of [-1, 1]) {
        g.cyl(0.4, 0.5, h - 1.2, sx * (w / 2 - 1.0), baseY + 0.6, zc + hd + 0.12, S3, 8);
        g.cyl(0.4, 0.5, h - 1.2, sx * (w / 2 - 1.0), baseY + 0.6, zc - hd - 0.12, S3, 8);
      }
    }
  };

  const cornice = (w, y, k) => {
    const sp = 1.2;
    for (let z = -L / 2; z <= L / 2; z += sp) {
      g.box(0.5, 0.4, 0.34, w / 2 - 0.15, y, z, SK);
      g.box(0.5, 0.4, 0.34, -(w / 2 - 0.15), y, z, SK);
    }
    g.box(w + 0.3, 0.38, L, 0, y, 0, stone(k));
    g.box(w + 0.9, 0.38, L, 0, y + 0.38, 0, stone(k + 1));
    g.box(w + 0.4, 0.26, L, 0, y + 0.76, 0, S3);
  };

  const centralPier = () => {
    const w = 10, hd = 5, topY = 17;
    g.box(w, topY, hd * 2, 0, 0, 0, S1);
    g.box(w + 1, 1.2, hd * 2 + 1, 0, 0, 0, SK);
    g.box(w + 0.4, 0.8, hd * 2 + 0.4, 0, topY - 1.0, 0, S2);
    g.box(w + 0.7, 0.6, hd * 2 + 0.7, 0, topY - 0.2, 0, S3);
    for (const cx of [-w / 2 + 1.1, w / 2 - 1.1]) {
      g.box(0.95, topY - 1.4, 0.7, cx, 1.2, hd + 0.05, S3);
    }
    g.box(4.2, 3.0, 0.5, 0, 5.0, hd - 0.3, SD);
    g.box(3.8, 2.5, 0.12, 0, 5.25, hd + 0.02, BRN);
    g.box(4.6, 0.35, 0.4, 0, 8.1, hd + 0.05, BRN);
  };

  const specus = () => {
    const y = 40, w = 6;
    g.box(w, 0.5, L, 0, y, 0, S2);
    g.box(0.5, 0.8, L, -(w / 2 - 0.25), y + 0.5, 0, S1);
    g.box(0.5, 0.8, L, w / 2 - 0.25, y + 0.5, 0, S1);
    g.box(w - 1.0, 0.16, L, 0, y + 0.5, 0, WAT);
    g.box(w + 0.8, 0.5, L, 0, y + 1.3, 0, S3);
    g.box(1.2, 0.4, L, 0, y + 1.8, 0, S2);
    g.box(0.35, 0.9, L, -(w / 2 - 0.2), y + 0.8, 0, S1);
    g.box(0.35, 0.9, L, w / 2 - 0.2, y + 0.8, 0, S1);
    for (let z = -L / 2; z <= L / 2; z += 2) {
      g.box(0.3, 0.7, 0.3, -(w / 2 + 0.4), y + 1.1, z, S3);
      g.box(0.3, 0.7, 0.3, w / 2 + 0.4, y + 1.1, z, S3);
    }
  };

  const terminalTower = (s) => {
    const zc = s * 98, tw = 12, td = 10, th = 30;
    g.box(tw, th, td, 0, 0, zc, S1);
    g.box(tw + 1.2, 1.8, td + 1.2, 0, 0, zc, SK);
    g.box(tw + 0.6, 0.8, td + 0.6, 0, th, zc, S3);
    g.box(tw - 2.5, 4.5, td - 2.5, 0, th + 0.8, zc, S2);
    g.box(tw - 4.5, 0.5, td - 4.5, 0, th + 5.3, zc, WAT);
    for (const cx of [-3.5, 0, 3.5]) {
      g.cyl(0.38, 0.5, 4.5, cx, th + 0.8, zc - s * (td / 2 - 2.5), S3, 8);
    }
    g.gable(tw - 1, 3.0, td - 1, 0, th + 5.8, zc, S1);
    for (const cx of [-tw / 2 + 2, 0, tw / 2 - 2]) {
      g.cyl(0.55, 0.65, th - 1.5, cx, 1.8, zc + s * (td / 2 - 0.3), S3, 8);
    }
    g.box(2.2, 3.5, 0.4, 0, 1.8, zc + s * (td / 2 + 0.15), SD);
  };

  const statue = (x, y, z, robe, ry) => {
    g.group({ x, y, z, ry }, () => {
      g.box(0.7, 0.35, 0.7, 0, 0, 0, SK);
      g.cyl(0.2, 0.34, 0.95, 0, 0.35, 0, robe, 7);
      g.box(0.46, 0.6, 0.3, 0, 1.15, 0, robe);
      g.sphere(0.16, 0, 1.95, 0, SKN, 6);
      g.box(0.13, 0.55, 0.13, 0.24, 1.35, 0, SKN);
    });
  };

  const ground = () => {
    for (let k = -7; k <= 7; k++) {
      const zc = k * 12.5;
      const s = 0.8 + ((k + 7) % 3) * 0.18;
      for (const sx of [-1, 1]) {
        const x = 8.0 * sx;
        g.cyl(0.14 * s, 0.2 * s, 1.5 * s, x, 0, zc, TRK, 6);
        g.cone(0.95 * s, 3.8 * s, x, 1.3 * s, zc, GRD, 8);
        g.cone(0.72 * s, 3.0 * s, x, 4.1 * s, zc, GRN, 8);
        g.cone(0.45 * s, 2.2 * s, x, 6.2 * s, zc, GRN, 8);
      }
    }
    const rocks = [[-5, -80, 0.55], [5, -40, 0.6], [-5, 40, 0.5], [5, 80, 0.6], [-5, -45, 0.45], [5, 45, 0.45]];
    for (const [rx, rz, s] of rocks) g.sphere(s, rx, 0.25, rz, SK, 6);
    for (let z = -80; z <= 80; z += 5) {
      g.box(1.1, 0.4, 1.1, -6.5, 0, z, SOIL);
      g.box(1.1, 0.4, 1.1, 6.5, 0, z, SOIL);
      g.sphere(0.5, -6.5, 0.3, z, GRD, 6);
      g.sphere(0.5, 6.5, 0.3, z, GRD, 6);
    }
  };

  // bottom tier
  bPiers.forEach((zc, i) => pier(zc, bW, 3, bSpring, bTop, i, { bossage: true, columns: true }));
  for (let i = 0; i < bPiers.length - 1; i++) {
    const c1 = bPiers[i], c2 = bPiers[i + 1];
    arch((c1 + 3 + c2 - 3) / 2, (c2 - 3 - c1 - 3) / 2, 1.2, bW, bSpring, 12, stone(i + 1));
  }
  centralPier();
  arch(-11, 6, 0.9, bW, bSpring, 8, S1);
  arch(11, 6, 0.9, bW, bSpring, 8, S1);
  bPiers.forEach((zc) => {
    g.prism([[bW / 2, zc - 3], [bW / 2, zc + 3], [bW / 2 + 2.6, zc]], bTop, 0, SK);
    g.prism([[-bW / 2, zc - 3], [-bW / 2, zc + 3], [-bW / 2 - 2.6, zc]], bTop, 0, SK);
  });

  // cornice 1
  cornice(bW + 1.2, bTop, 0);

  // middle tier
  mPiers.forEach((zc, i) => pier(zc, mW, 3.5, mBase, mTop, i + 5, { bossage: true }));
  for (let i = 0; i < mPiers.length - 1; i++) {
    const c1 = mPiers[i], c2 = mPiers[i + 1];
    arch((c1 + 3.5 + c2 - 3.5) / 2, (c2 - 3.5 - c1 - 3.5) / 2, 1.0, mW, mBase, 10, stone(i + 3));
  }

  // cornice 2
  cornice(mW + 1.2, mTop, 1);

  // top tier
  tPiers.forEach((zc, i) => {
    g.box(tW, tTop - tBase, 2.5, 0, tBase, zc, stone(i));
    g.box(tW + 0.4, 0.4, 2.9, 0, tTop - 0.4, zc, S3);
  });
  for (let i = 0; i < tPiers.length - 1; i++) {
    arch((tPiers[i] + tPiers[i + 1]) / 2, 5, 0.55, tW, tBase, 6, S1);
  }

  specus();
  terminalTower(1);
  terminalTower(-1);
  statue(2, 18, 0, BRN, 0);
  statue(-2, 18, 0, BRN, 0);
  ground();

  const solid = g.build();
  solid.computeBoundingBox();
  return { solid, glass: null, name: '大渡槽', height: 42, radius: 104 };
}
