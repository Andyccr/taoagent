// Distant mountain ring around the city: one non-indexed geometry with smooth normals and haze colours.
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rad = (d) => (d * Math.PI) / 180;

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

function ridgedNoise(x, y, seed) {
  let sum = 0, norm = 0, amp = 0.55, freq = 1;
  for (let o = 0; o < 5; o++) {
    let n = valueNoise(x * freq, y * freq, seed + o * 131);
    n = 1 - Math.abs(n * 2 - 1);
    n *= n;
    sum += n * amp;
    norm += amp;
    amp *= 0.52;
    freq *= 2.07;
  }
  return sum / norm;
}

function sectorDistance(deg, from, to) {
  const center = (from + to) / 2;
  const half = Math.abs(to - from) / 2;
  const d = ((deg - center + 540) % 360) - 180;
  return Math.abs(d) - half;
}

function buildMassifs(seed, seaFrom, seaTo) {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const list = [];
  for (let k = 0; k < 3; k++) {
    let ang = rng() * 360;
    for (let tries = 0; tries < 8; tries++) {
      if (sectorDistance(ang, seaFrom, seaTo) > 30) break;
      ang = (ang + 75 + rng() * 130) % 360;
    }
    list.push({
      ang,
      tc: 0.54 + rng() * 0.22,
      amp: 118 + rng() * 42,
      sa: 15 + rng() * 13,
      sr: 0.10 + rng() * 0.08,
      seed: seed + 17 + k * 53,
    });
  }
  return list;
}

function heightAt(x, z, t, deg, seed, massifs, seaFrom, seaTo) {
  const mask = smoothstep(7, 22, sectorDistance(deg, seaFrom, seaTo));
  if (mask <= 0) return -4;
  const rn = ridgedNoise(x / 190, z / 190, seed);
  const band = smoothstep(0.02, 0.5, t) * (1 - 0.32 * smoothstep(0.68, 1, t));
  let h = (0.3 + 0.7 * rn) * band * 320;
  h += valueNoise(x / 70, z / 70, seed + 77) * 12 * (1 - smoothstep(0, 0.15, t));
  for (const m of massifs) {
    const da = ((deg - m.ang + 540) % 360) - 180;
    const ga = da / m.sa, gr = (t - m.tc) / m.sr;
    const bump = Math.exp(-(ga * ga + gr * gr) * 1.4);
    const jag = 0.75 + 0.35 * ridgedNoise(x / 95, z / 95, m.seed);
    h += m.amp * bump * jag;
  }
  if (h > 380) h = 380 + 40 * (1 - Math.exp(-(h - 380) / 40));
  return h * mask - 1.5 - 4 * (1 - mask);
}

export function mountainRangeGeometry({ inner = 1050, outer = 2300, seaFrom = 20, seaTo = 70, seed = 7 } = {}) {
  const N = 300, ROWS = 26;
  const massifs = buildMassifs(seed, seaFrom, seaTo);
  const positions = new Float32Array(N * ROWS * 3);

  for (let j = 0; j < ROWS; j++) {
    const t = j / (ROWS - 1);
    const r = inner + (outer - inner) * Math.pow(t, 1.35);
    for (let i = 0; i < N; i++) {
      const deg = (i / N) * 360;
      const x = r * Math.sin(rad(deg));
      const z = -r * Math.cos(rad(deg));
      const y = heightAt(x, z, t, deg, seed, massifs, seaFrom, seaTo);
      const o = (j * N + i) * 3;
      positions[o] = x;
      positions[o + 1] = y;
      positions[o + 2] = z;
    }
  }

  const indices = [];
  for (let j = 0; j < ROWS - 1; j++) {
    for (let i = 0; i < N; i++) {
      const i2 = (i + 1) % N;
      const a = j * N + i, b = j * N + i2;
      const c = (j + 1) * N + i, d = (j + 1) * N + i2;
      indices.push(a, b, c, b, d, c);
    }
  }

  const grid = new THREE.BufferGeometry();
  grid.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  grid.setIndex(indices);
  grid.computeVertexNormals();
  const geo = grid.toNonIndexed();
  grid.dispose();

  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const colors = new Float32Array(pos.count * 3);

  const meadow = new THREE.Color(0x7f9a5e);
  const forest = new THREE.Color(0x56704a);
  const rockA = new THREE.Color(0x8d877c);
  const rockB = new THREE.Color(0x77746f);
  const snow = new THREE.Color(0xf2f1ec);
  const haze = new THREE.Color(0xb9c6d2);
  const c = new THREE.Color();
  const rock = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), h = pos.getY(i), z = pos.getZ(i);
    const ny = nor.getY(i);
    const jitter = valueNoise(x / 34, z / 34, seed + 311);
    const snowLine = 235 + (jitter - 0.5) * 50;
    const forestLine = 112 + (jitter - 0.5) * 34;

    if (h < forestLine) {
      c.copy(meadow).lerp(forest, smoothstep(35, forestLine, h));
    } else {
      rock.copy(rockA).lerp(rockB, clamp((h - 140) / 160, 0, 1) * 0.65);
      c.copy(rock);
      c.lerp(forest, smoothstep(forestLine + 16, forestLine - 6, h) * 0.25);
    }

    const steep = smoothstep(0.72, 0.46, ny);
    if (steep > 0) {
      rock.copy(rockA).lerp(rockB, smoothstep(0.7, 0.4, ny));
      c.lerp(rock, steep);
    }

    let snowMix = 0;
    if (h > snowLine && ny > 0.6) {
      snowMix = smoothstep(snowLine, snowLine + 40, h) * smoothstep(0.6, 0.76, ny);
      c.lerp(snow, snowMix);
    }

    const tt = clamp((Math.hypot(x, z) - inner) / (outer - inner), 0, 1);
    const hazeAmt = (0.3 + 0.42 * tt) * (1 - snowMix * 0.18);
    c.lerp(haze, hazeAmt);

    const o = i * 3;
    colors[o] = c.r;
    colors[o + 1] = c.g;
    colors[o + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}
