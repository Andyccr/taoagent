// Low-poly sky for the metropolis: instanced cumulus clouds drifting overhead and circling bird flocks.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CLOUD_UNDER = 0xdfe6ee;
const CLOUD_DAY = 0xffffff;
const CLOUD_NIGHT = 0x4a5266;

function hashSeed(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCloudVariant(rand, under, white) {
  const puffs = 5 + Math.floor(rand() * 5);
  const parts = [];
  for (let i = 0; i < puffs; i++) {
    const r = 0.45 + rand() * 0.55;
    const squash = 0.45 + rand() * 0.15;
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1, squash, 1);
    const spread = 1.35;
    g.translate((rand() * 2 - 1) * spread, 0.15 + rand() * 0.85, (rand() * 2 - 1) * 0.8);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  if (!merged) return null;

  merged.computeBoundingBox();
  let bb = merged.boundingBox;
  const floor = bb.min.y + (bb.max.y - bb.min.y) * 0.06;
  const pos = merged.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < floor) pos.setY(i, floor);
  }
  merged.computeBoundingBox();
  bb = merged.boundingBox;
  const span = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
  const k = 1 / span;
  merged.scale(k, k, k);
  merged.computeBoundingBox();
  bb = merged.boundingBox;
  merged.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
  merged.computeVertexNormals();

  merged.computeBoundingBox();
  bb = merged.boundingBox;
  const h = bb.max.y - bb.min.y || 1;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let t = (pos.getY(i) - bb.min.y) / h;
    t = t * t * (3 - 2 * t);
    tmp.lerpColors(under, white, t);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

function buildBirdGeometry() {
  const verts = new Float32Array([
    0, 0, 0.05, -0.7, 0.18, -0.05, -0.18, 0.08, 0.32,
    0, 0, 0.05, 0.18, 0.08, 0.32, 0.7, 0.18, -0.05
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

export function buildSky({ quality = 'medium', radius = 1400 } = {}) {
  if (quality === 'low') return null;
  const cloudCount = quality === 'high' ? 40 : 26;
  const flockCount = quality === 'high' ? 8 : 5;
  const R = Math.max(1, radius);
  const rng = makeRng(hashSeed('metro-sky'));

  const group = new THREE.Group();
  group.name = 'sky';

  const geometries = new Set();
  const materials = new Set();
  const under = new THREE.Color(CLOUD_UNDER);
  const white = new THREE.Color(CLOUD_DAY);

  const cloudMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    fog: false
  });
  materials.add(cloudMat);

  const variants = [];
  for (let v = 0; v < 4; v++) {
    const geo = buildCloudVariant(rng, under, white);
    if (geo) {
      geometries.add(geo);
      variants.push(geo);
    }
  }

  const clouds = [];
  const cloudMeshes = [];
  for (let v = 0; v < variants.length; v++) {
    const n = Math.floor(cloudCount / variants.length) + (v < cloudCount % variants.length ? 1 : 0);
    if (n <= 0) continue;
    const mesh = new THREE.InstancedMesh(variants[v], cloudMat, n);
    mesh.name = 'clouds';
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    cloudMeshes.push(mesh);
    for (let i = 0; i < n; i++) {
      // Clouds ride a ring beyond the city so they frame the horizon instead of hiding the streets.
      const angle = rng() * Math.PI * 2;
      const rr = R * (0.55 + 0.45 * Math.sqrt(rng()));
      const rot = rng() * Math.PI * 2;
      clouds.push({
        mesh,
        index: i,
        angle,
        rr,
        x: Math.cos(angle) * rr,
        y: 240 + rng() * 170,
        z: Math.sin(angle) * rr,
        size: 55 + rng() * 95,
        speed: 3 + rng() * 3,
        quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0))
      });
    }
  }

  const birdGeo = buildBirdGeometry();
  geometries.add(birdGeo);
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a, side: THREE.DoubleSide });
  materials.add(birdMat);

  const flocks = [];
  const birds = [];
  let totalBirds = 0;
  for (let f = 0; f < flockCount; f++) {
    const dist = 40 + rng() * 340;
    const bearing = rng() * Math.PI * 2;
    const flock = {
      cx: Math.cos(bearing) * dist,
      cz: Math.sin(bearing) * dist,
      radius: 25 + rng() * 45,
      height: 22 + rng() * 38,
      speed: 6 + rng() * 5,
      angle: rng() * Math.PI * 2,
      dir: rng() < 0.5 ? -1 : 1
    };
    flocks.push(flock);
    const count = 9 + Math.floor(rng() * 7);
    totalBirds += count;
    for (let j = 0; j < count; j++) {
      birds.push({
        flock,
        aOff: (rng() * 2 - 1) * 0.14,
        rOff: (rng() * 2 - 1) * flock.radius * 0.16,
        yOff: (rng() * 2 - 1) * 3.2,
        phase: rng() * Math.PI * 2,
        bobPhase: rng() * Math.PI * 2,
        flap: 3 + rng() * 2
      });
    }
  }

  const birdMesh = new THREE.InstancedMesh(birdGeo, birdMat, totalBirds);
  birdMesh.name = 'birds';
  birdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  birdMesh.frustumCulled = false;
  birdMesh.castShadow = false;
  birdMesh.receiveShadow = false;
  group.add(birdMesh);

  const tmpMat = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpScale = new THREE.Vector3();

  let disposed = false;

  group.userData.update = (dt, elapsed) => {
    if (disposed) return;
    const step = Number.isFinite(dt) ? dt : 0;
    const now = Number.isFinite(elapsed) ? elapsed : 0;

    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.angle += (c.speed * step) / c.rr;
      c.x = Math.cos(c.angle) * c.rr; c.z = Math.sin(c.angle) * c.rr;
      tmpPos.set(c.x, c.y, c.z);
      tmpScale.setScalar(c.size);
      tmpMat.compose(tmpPos, c.quat, tmpScale);
      c.mesh.setMatrixAt(c.index, tmpMat);
    }
    for (let m = 0; m < cloudMeshes.length; m++) cloudMeshes[m].instanceMatrix.needsUpdate = true;

    for (let f = 0; f < flocks.length; f++) {
      const fl = flocks[f];
      fl.angle += (fl.dir * fl.speed * step) / fl.radius;
    }
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const fl = b.flock;
      const a = fl.angle + b.aOff;
      const rr = fl.radius + b.rOff;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      tmpPos.set(
        fl.cx + ca * rr,
        fl.height + b.yOff + Math.sin(now * 1.7 + b.bobPhase) * 1.1,
        fl.cz + sa * rr
      );
      const heading = Math.atan2(-sa * fl.dir, ca * fl.dir);
      tmpEuler.set(0, heading, 0);
      tmpQuat.setFromEuler(tmpEuler);
      const flap = 0.625 + 0.375 * Math.sin(now * b.flap * Math.PI * 2 + b.phase);
      tmpScale.set(1, flap, 1);
      tmpMat.compose(tmpPos, tmpQuat, tmpScale);
      birdMesh.setMatrixAt(i, tmpMat);
    }
    birdMesh.instanceMatrix.needsUpdate = true;
  };

  group.userData.setNight = (on) => {
    cloudMat.color.setHex(on ? CLOUD_NIGHT : CLOUD_DAY);
    birdMesh.visible = !on;
  };

  group.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    geometries.clear();
    materials.clear();
  };

  group.userData.update(0, 0);
  return group;
}
