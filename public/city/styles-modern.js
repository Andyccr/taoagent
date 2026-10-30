import { makeKit, textTexture, THREE } from './kit.js';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKY_TILE = 11.2;

function towerGeometry(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const dims = [
    [d, h], [d, h],
    [w, d], [w, d],
    [w, h], [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    const su = dims[f][0] / SKY_TILE;
    const sv = dims[f][1] / SKY_TILE;
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

function makeTowerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2c3744';
  ctx.fillRect(0, 0, 512, 512);

  const cols = 8;
  const rows = 8;
  const cw = 512 / cols;
  const ch = 512 / rows;
  const rnd = mulberry32(9137);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const mx = cw * 0.18;
      const my = ch * 0.16;
      if (rnd() < 0.35) {
        const v = 200 + Math.floor(rnd() * 45);
        ctx.fillStyle = `rgb(${v},${Math.round(v * 0.8)},${Math.round(v * 0.42)})`;
      } else {
        const v = 38 + Math.floor(rnd() * 22);
        ctx.fillStyle = `rgb(${v},${v + 9},${v + 20})`;
      }
      ctx.fillRect(x * cw + mx, y * ch + my, cw - 2 * mx, ch - 2 * my);
      if (rnd() < 0.5) {
        ctx.fillStyle = 'rgba(255,236,190,0.18)';
        ctx.fillRect(x * cw + mx, y * ch + my, cw - 2 * mx, 2);
      }
    }
  }

  ctx.fillStyle = 'rgba(16,22,30,0.6)';
  for (let y = 0; y <= rows; y++) ctx.fillRect(0, Math.round(y * ch) - 2, 512, 4);
  ctx.fillStyle = 'rgba(16,22,30,0.4)';
  for (let x = 0; x <= cols; x++) ctx.fillRect(Math.round(x * cw) - 1, 0, 2, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function buildModern(opts = {}) {
  const kit = makeKit(opts.shadows !== false);
  const g = new THREE.Group();
  const accent = opts.color || '#4aa3c7';

  const mConcrete = kit.mat(0xb9bfc4, { roughness: 0.9 });
  const mGlass = kit.mat(0x7fa6b8, { metalness: 0.3, roughness: 0.25 });
  const mWin = kit.mat(0x5f7f90, { emissive: 0x000000, metalness: 0.3, roughness: 0.25 });
  const mSlab = kit.mat(0xd2d7da, { metalness: 0.35, roughness: 0.55 });
  const mMullion = kit.mat(0xc7cdd1, { metalness: 0.5, roughness: 0.45 });
  const mDark = kit.mat(0x1b2026, { roughness: 0.9 });
  const mAccent = kit.mat(accent, { roughness: 0.6, metalness: 0.15 });
  const mGate = kit.mat(0x2b3138, { metalness: 0.55, roughness: 0.35 });
  const mLampPost = kit.mat(0x3a3f45, { metalness: 0.6, roughness: 0.4 });
  const lanternMat = kit.mat(0x6b5a3a, { roughness: 0.45, metalness: 0.2 });
  const mAntenna = kit.mat(0x8d959c, { metalness: 0.7, roughness: 0.35 });
  const mRoof = kit.mat(0x9aa0a6, { roughness: 0.85 });
  const mPad = kit.mat(0x2f3438, { roughness: 0.85 });

  kit.box(g, 4.9, 0.3, 4.9, mConcrete, 0, 0, 0);
  kit.box(g, 3.4, 0.18, 0.9, mConcrete, 0, 0, 2.85);

  const tiers = [
    { w: 4.5, d: 4.5, y0: 0.3, floors: 5 },
    { w: 3.8, d: 3.8, y0: 6.3, floors: 4 },
    { w: 3.05, d: 3.05, y0: 11.1, floors: 3 },
  ];

  for (const t of tiers) {
    const h = t.floors * 1.2;
    kit.box(g, t.w, h, t.d, mGlass, 0, t.y0, 0);
    for (let f = 0; f < t.floors; f++) {
      const fb = t.y0 + f * 1.2;
      kit.box(g, t.w + 0.05, 0.85, t.d + 0.05, mWin, 0, fb + 0.23, 0);
      kit.box(g, t.w + 0.14, 0.12, t.d + 0.14, mSlab, 0, fb + 1.08, 0);
    }
    const sx = t.w / 2 - 0.05;
    const sz = t.d / 2 - 0.05;
    kit.box(g, 0.1, h, 0.1, mMullion, -sx, t.y0, -sz);
    kit.box(g, 0.1, h, 0.1, mMullion, sx, t.y0, -sz);
    kit.box(g, 0.1, h, 0.1, mMullion, -sx, t.y0, sz);
    kit.box(g, 0.1, h, 0.1, mMullion, sx, t.y0, sz);
  }

  const lobbyZ = 2.56;
  kit.box(g, 0.55, 2.9, 0.62, mWin, -1.225, 0.3, lobbyZ);
  kit.box(g, 0.55, 2.9, 0.62, mWin, 1.225, 0.3, lobbyZ);
  kit.box(g, 1.9, 0.3, 0.62, mGlass, 0, 2.9, lobbyZ);
  kit.box(g, 1.9, 2.6, 0.4, mDark, 0, 0.3, 2.55);
  kit.box(g, 3.0, 0.12, 0.62, mGlass, 0, 3.2, lobbyZ);

  kit.box(g, 0.1, 2.6, 0.7, mAccent, -1.0, 0.3, lobbyZ);
  kit.box(g, 0.1, 2.6, 0.7, mAccent, 1.0, 0.3, lobbyZ);
  kit.box(g, 2.1, 0.1, 0.7, mAccent, 0, 2.85, lobbyZ);

  kit.box(g, 3.3, 0.12, 1.15, mAccent, 0, 3.35, 2.55);
  kit.box(g, 0.16, 6.0, 0.07, mAccent, 1.35, 0.3, 2.31);

  const lantern = new THREE.Group();
  kit.cyl(lantern, 0.06, 0.08, 0.75, mLampPost, 0, 0, 0, 8);
  kit.box(lantern, 0.32, 0.36, 0.32, lanternMat, 0, 0.75, 0);
  kit.box(lantern, 0.38, 0.05, 0.38, mLampPost, 0, 1.11, 0);
  lantern.position.set(-1.85, 0, 3.05);
  g.add(lantern);

  const gate = new THREE.Group();
  kit.box(gate, 1.92, 2.58, 0.08, mGate, 0, 0.3, 2.87);
  for (let i = 0; i < 4; i++) {
    kit.box(gate, 1.96, 0.05, 0.12, mGate, 0, 0.75 + i * 0.5, 2.87);
  }
  gate.visible = false;
  g.add(gate);

  kit.box(g, 3.05, 0.15, 3.05, mRoof, 0, 14.7, 0);
  kit.box(g, 3.05, 0.35, 0.12, mSlab, 0, 14.85, 1.465);
  kit.box(g, 3.05, 0.35, 0.12, mSlab, 0, 14.85, -1.465);
  kit.box(g, 0.12, 0.35, 3.05, mSlab, -1.465, 14.85, 0);
  kit.box(g, 0.12, 0.35, 3.05, mSlab, 1.465, 14.85, 0);

  kit.cyl(g, 0.85, 0.85, 0.07, mPad, -0.8, 14.85, -0.8, 24);
  const ring = kit.add(g, new THREE.TorusGeometry(0.66, 0.05, 6, 24), mAccent, -0.8, 14.95, -0.8);
  ring.rotation.x = -Math.PI / 2;

  kit.cyl(g, 0.045, 0.08, 3.0, mAntenna, 0, 14.85, 0, 8);
  kit.box(g, 0.14, 0.14, 0.14, mAccent, 0, 17.85, 0);

  return {
    group: g,
    porch: new THREE.Vector3(0, 0.18, 3.0),
    roofY: 15.2,
    windowMats: [mWin],
    lantern,
    lanternMat,
    gate,
    mats: kit.mats,
    meshes: kit.meshes,
    height: 18.0,
  };
}

export function buildSkyline(opts = {}) {
  const group = new THREE.Group();
  const a = opts.innerR ?? 40;
  const b = opts.outerR ?? 110;
  const innerR = Math.min(a, b);
  const outerR = Math.max(a, b);
  const count = opts.count ?? 46;
  const seed = opts.seed ?? 7;
  const rng = mulberry32(seed >>> 0);
  const span = outerR - innerR;

  const texture = makeTowerTexture();
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xaeb9c4,
    map: texture,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 0.45,
    roughness: 0.8,
    metalness: 0.1,
  });
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x7b8590, roughness: 0.7, metalness: 0.5 });

  for (let i = 0; i < count; i++) {
    const angle = ((80 + rng() * 200) * Math.PI) / 180; // background arc only (behind and beside the city)
    const radius = innerR + span * Math.sqrt(rng());
    const t = span > 1e-4 ? (radius - innerR) / span : 0;
    const H = Math.max(8, Math.min(34, 8 + t * 26 + (rng() - 0.5) * 3));
    const w = 2.4 + rng() * 2.8;
    const d = 2.4 + rng() * 2.8;

    const hasSpire = rng() < 0.45;
    const spireH = hasSpire ? Math.min(2.5 + rng() * 4.5, H * 0.4) : 0;
    const crownH = rng() < 0.4 ? 0.8 + rng() * 1.5 : 0;
    const bodyH = Math.max(4, H - spireH - crownH);

    const tower = new THREE.Group();
    tower.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    tower.rotation.y = angle + (rng() - 0.5) * 0.5;

    const add = (bw, bh, bd, x, yb, z) => {
      const mesh = new THREE.Mesh(towerGeometry(bw, bh, bd), towerMat);
      mesh.position.set(x, yb + bh / 2, z);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      tower.add(mesh);
      return mesh;
    };

    const style = rng();
    if (style < 0.42) {
      add(w, bodyH, d, 0, 0, 0);
    } else if (style < 0.78) {
      const h1 = bodyH * (0.55 + rng() * 0.12);
      const h2 = bodyH - h1;
      add(w, h1, d, 0, 0, 0);
      add(w * 0.72, h2, d * 0.72, 0, h1, 0);
    } else {
      const h1 = bodyH * 0.42;
      const h2 = bodyH * 0.33;
      const h3 = bodyH - h1 - h2;
      add(w, h1, d, 0, 0, 0);
      add(w * 0.78, h2, d * 0.78, 0, h1, 0);
      add(w * 0.55, h3, d * 0.55, 0, h1 + h2, 0);
    }

    if (crownH > 0) {
      add(w * 0.5, crownH, d * 0.5, 0, bodyH, 0);
    }

    if (spireH > 0) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, Math.min(0.35, w * 0.09), spireH, 6),
        mastMat
      );
      mast.position.set(0, bodyH + crownH + spireH / 2, 0);
      mast.castShadow = false;
      mast.receiveShadow = false;
      tower.add(mast);
    }

    group.add(tower);
  }

  return group;
}

