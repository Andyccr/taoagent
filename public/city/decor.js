import { makeKit, textTexture, THREE } from './kit.js';

const FONT = '"Noto Sans CJK SC","Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildGround({ radius = 30, shadows = true } = {}) {
  const kit = makeKit(shadows);
  const group = new THREE.Group();
  const grass = kit.mat(0xb9c9a0, { roughness: 1 });
  const edge = kit.mat(0xa9b98f, { roughness: 1 });

  const disc = kit.add(group, new THREE.CircleGeometry(radius, 96), grass, 0, -0.02, 0);
  disc.rotation.x = -Math.PI / 2;
  disc.castShadow = false;
  disc.receiveShadow = shadows;

  const ring = kit.add(group, new THREE.RingGeometry(radius, radius * 1.12, 96), edge, 0, -0.025, 0);
  ring.rotation.x = -Math.PI / 2;
  ring.castShadow = false;
  ring.receiveShadow = shadows;

  return group;
}

export function buildPlaza({ radius = 12, shadows = true } = {}) {
  const kit = makeKit(shadows);
  const group = new THREE.Group();
  const stone = kit.mat(0xd9d2c3, { roughness: 0.95 });
  const darkStone = kit.mat(0xc9c1b1, { roughness: 0.95 });
  const axisStone = kit.mat(0xcfc6b2, { roughness: 0.95 });
  const roadStone = kit.mat(0xb8b0a0, { roughness: 1 });

  kit.cyl(group, radius, radius, 0.06, stone, 0, 0, 0, 96);

  [0.35, 0.58, 0.81].forEach((f) => {
    const r = radius * f;
    const ring = kit.add(
      group,
      new THREE.RingGeometry(Math.max(r - 0.07, 0.01), r + 0.07, 80),
      darkStone,
      0,
      0.061,
      0
    );
    ring.rotation.x = -Math.PI / 2;
    ring.castShadow = false;
    ring.receiveShadow = shadows;
  });

  kit.box(group, 3, 0.063, radius, axisStone, 0, 0, radius / 2);

  const road = kit.add(
    group,
    new THREE.RingGeometry(radius, radius + 2.4, 96),
    roadStone,
    0,
    0.03,
    0
  );
  road.rotation.x = -Math.PI / 2;
  road.castShadow = false;
  road.receiveShadow = shadows;

  return group;
}

export function buildStreet({ from, to, width = 2.2 } = {}) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.max(Math.hypot(dx, dz), 0.001);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xc4bba8),
    roughness: 1,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.012, len), material);
  mesh.position.set((from.x + to.x) / 2, 0.035, (from.z + to.z) / 2);
  mesh.rotation.y = Math.atan2(dx, dz);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

export function buildReservedPlot({ shadows = true, label = '待建' } = {}) {
  const kit = makeKit(shadows);
  const group = new THREE.Group();
  const earth = kit.mat(0xc8b48e, { roughness: 1 });
  const wood = kit.mat(0xa07850, { roughness: 0.95 });
  const stringMat = kit.mat(0xe7dfc9, { roughness: 1 });
  const stone = kit.mat(0x9c9a94, { roughness: 1 });
  const stoneBase = kit.mat(0x8c8a84, { roughness: 1 });

  kit.add(group, new THREE.BoxGeometry(8, 0.04, 8), earth, 0, 0.02, 0);

  const postGeo = new THREE.BoxGeometry(0.08, 0.9, 0.08);
  const postSet = new Set();
  const addPost = (x, z) => {
    const key = `${x},${z}`;
    if (postSet.has(key)) return;
    postSet.add(key);
    kit.add(group, postGeo, wood, x, 0.49, z);
  };

  for (let i = -4; i <= 4; i++) {
    addPost(i, -4);
    addPost(-4, i);
    addPost(4, i);
    if (i !== 0) addPost(i, 4);
  }

  const addRail = (x1, z1, x2, z2, y) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) return;
    const mesh = kit.add(
      group,
      new THREE.BoxGeometry(len, 0.06, 0.06),
      wood,
      (x1 + x2) / 2,
      y,
      (z1 + z2) / 2
    );
    mesh.rotation.y = Math.atan2(-dz, dx);
  };

  [0.32, 0.72].forEach((y) => {
    addRail(-4, -4, 4, -4, y);
    addRail(-4, 4, -1, 4, y);
    addRail(1, 4, 4, 4, y);
    addRail(-4, -4, -4, 4, y);
    addRail(4, -4, 4, 4, y);
  });

  const stakes = [
    [-2.3, -1.9],
    [-2.3, 1.1],
    [2.3, 1.1],
    [2.3, -1.9],
  ];
  const stakeGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.55, 5);
  stakes.forEach(([x, z]) => kit.add(group, stakeGeo, wood, x, 0.315, z));

  for (let i = 0; i < stakes.length; i++) {
    const a = stakes[i];
    const b = stakes[(i + 1) % stakes.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const wire = kit.add(
      group,
      new THREE.BoxGeometry(len, 0.014, 0.014),
      stringMat,
      (a[0] + b[0]) / 2,
      0.52,
      (a[1] + b[1]) / 2
    );
    wire.rotation.y = Math.atan2(-dz, dx);
    wire.castShadow = false;
  }

  kit.box(group, 1.2, 0.18, 0.5, stoneBase, 0, 0.04, 2.7);
  kit.box(group, 0.9, 1.5, 0.3, stone, 0, 0.22, 2.7);

  const labelTexture = textTexture(label, {
    w: 256,
    h: 384,
    fg: '#3b3b3b',
    font: 120,
  });
  const labelMat = kit.mat(0xffffff, {
    map: labelTexture,
    transparent: true,
    roughness: 1,
    metalness: 0,
  });
  labelMat.depthWrite = false;
  labelMat.polygonOffset = true;
  labelMat.polygonOffsetFactor = -2;

  const face = kit.add(
    group,
    new THREE.PlaneGeometry(0.62, 0.93),
    labelMat,
    0,
    0.97,
    2.852
  );
  face.castShadow = false;
  face.receiveShadow = false;

  return group;
}

export function buildStele({ shadows = true } = {}) {
  const kit = makeKit(shadows);
  const group = new THREE.Group();
  const stone = kit.mat(0x8f9488, { roughness: 0.95, flatShading: true });

  const body = kit.add(group, new THREE.SphereGeometry(1, 18, 12), stone, 0, 0.58, 0);
  body.scale.set(1.8, 0.62, 2.4);

  const head = kit.add(group, new THREE.SphereGeometry(1, 14, 10), stone, 0, 0.58, 2.42);
  head.scale.set(0.62, 0.42, 0.7);

  const tail = kit.add(group, new THREE.SphereGeometry(1, 12, 8), stone, 0, 0.5, -2.25);
  tail.scale.set(0.36, 0.28, 0.48);

  [
    [-1.2, 1.2],
    [1.2, 1.2],
    [-1.2, -1.2],
    [1.2, -1.2],
  ].forEach(([x, z]) => {
    const foot = kit.add(group, new THREE.SphereGeometry(1, 12, 8), stone, x, 0.27, z);
    foot.scale.set(0.34, 0.27, 0.44);
  });

  kit.box(group, 2.6, 3.6, 0.45, stone, 0, 1.2, 0);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const redraw = (lines) => {
    ctx.fillStyle = '#e8e2d2';
    ctx.fillRect(0, 0, 512, 640);

    ctx.strokeStyle = 'rgba(44,42,38,0.7)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(16, 16, 480, 608);

    ctx.fillStyle = '#2c2a26';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 29px ${FONT}`;
    ctx.fillText('本周用量 · Weekly usage', 256, 72, 440);

    ctx.strokeStyle = 'rgba(44,42,38,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(56, 106);
    ctx.lineTo(456, 106);
    ctx.stroke();

    if (lines.length) {
      ctx.font = `700 52px ${FONT}`;
      ctx.fillText(String(lines[0]), 256, 176, 436);

      const rest = lines.slice(1);
      if (rest.length) {
        ctx.font = `500 30px ${FONT}`;
        const top = 238;
        const bottom = 592;
        const step = Math.min(40, (bottom - top) / rest.length);
        rest.forEach((line, i) => {
          ctx.fillText(String(line), 256, top + step * (i + 0.5), 436);
        });
      }
    }

    texture.needsUpdate = true;
  };

  let cached = null;
  const setLines = (lines = []) => {
    const arr = Array.isArray(lines) ? lines : [lines];
    const key = JSON.stringify(arr);
    if (key === cached) return;
    cached = key;
    redraw(arr);
  };

  const faceMat = kit.mat(0xffffff, {
    map: texture,
    roughness: 0.95,
    metalness: 0,
  });
  const face = kit.add(group, new THREE.PlaneGeometry(2.38, 2.975), faceMat, 0, 3.0, 0.228);
  face.castShadow = false;
  face.receiveShadow = false;

  const cap = kit.add(
    group,
    new THREE.CylinderGeometry(0.46, 0.46, 2.9, 18, 1, false, 0, Math.PI),
    stone,
    0,
    4.8,
    0
  );
  cap.rotation.z = Math.PI / 2;

  setLines(['Unavailable']);

  return { group, setLines };
}

export function buildTree({ seed = 1, shadows = true } = {}) {
  const kit = makeKit(shadows);
  const group = new THREE.Group();
  const rand = mulberry32(seed);
  const trunkMat = kit.mat(0x7a5a3a, { roughness: 1, flatShading: true });
  const greens = [
    kit.mat(0x7fa36a, { roughness: 1, flatShading: true }),
    kit.mat(0x6b9159, { roughness: 1, flatShading: true }),
  ];

  kit.cyl(group, 0.11, 0.18, 1.38, trunkMat, 0, 0, 0, 7);

  const count = rand() < 0.7 ? 3 : 2;
  for (let i = 0; i < count; i++) {
    const s = 0.8 - i * 0.13 + rand() * 0.08;
    const y = 1.62 + i * 0.68;
    const foliage = kit.add(
      group,
      new THREE.IcosahedronGeometry(1, 0),
      greens[i % 2],
      (rand() - 0.5) * 0.36,
      y,
      (rand() - 0.5) * 0.36
    );
    foliage.scale.set(s, s * (1 + rand() * 0.16), s);
    foliage.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
  }

  return group;
}

export function buildPine({ seed = 1, shadows = true } = {}) {
  const kit = makeKit(shadows);
  const group = new THREE.Group();
  const rand = mulberry32(seed);
  const trunkMat = kit.mat(0x6b4f36, { roughness: 1, flatShading: true });
  const greens = [
    kit.mat(0x3f5a3f, { roughness: 1, flatShading: true }),
    kit.mat(0x4f6b4a, { roughness: 1, flatShading: true }),
  ];

  kit.cyl(group, 0.12, 0.2, 3.1, trunkMat, 0, 0, 0, 7);

  const layers = [
    { y: 1.75, r: 1.0, h: 0.2 },
    { y: 2.35, r: 0.84, h: 0.18 },
    { y: 2.88, r: 0.64, h: 0.16 },
    { y: 3.34, r: 0.44, h: 0.14 },
  ];

  layers.forEach((layer, i) => {
    const pad = kit.cyl(
      group,
      layer.r,
      layer.r * 0.82,
      layer.h,
      greens[i % 2],
      (rand() - 0.5) * 0.32,
      layer.y,
      (rand() - 0.5) * 0.32,
      10
    );
    pad.scale.z = 0.9 + rand() * 0.2;
    pad.rotation.y = rand() * Math.PI;
  });

  return group;
}

