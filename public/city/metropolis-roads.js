import { polar } from './layout.js';

export const CANAL_HALF = 2.5;
const RAD = Math.PI / 180;
const rad = (d) => d * RAD;

export function rng(seedText) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canalRadius(deg, inner, outer) {
  const mid = (inner + outer) / 2;
  const r = mid + Math.sin(3 * rad(deg) + 0.7) + 0.6 * Math.sin(7 * rad(deg) + 2.1);
  return Math.min(outer + 1.4, Math.max(inner - 0.3, r));
}

export function canalLine(inner, outer) {
  const pts = [];
  for (let i = 0; i < 144; i++) {
    const deg = i * 2.5;
    const p = polar(canalRadius(deg, inner, outer), deg);
    pts.push([p.x, p.z]);
  }
  pts.push(pts[0]);
  return pts;
}

export function ringLoop(r0, w) {
  const phase = rng('ring' + r0)() * 6.283;
  const radiusAt = (deg) =>
    r0 + Math.min(0.03 * r0, 5) * Math.sin(2 * rad(deg) + phase) + Math.min(0.018 * r0, 3) * Math.sin(5 * rad(deg) + 2 * phase);
  const pts = [];
  for (let i = 0; i < 120; i++) {
    const p = polar(radiusAt(i * 3), i * 3);
    pts.push([p.x, p.z]);
  }
  pts.push(pts[0]);
  return { kind: 'ring', r: r0, w, pts, radiusAt };
}

export function avenueLine(deg, from, to, w, index) {
  const ux = Math.cos(rad(deg));
  const uz = Math.sin(rad(deg));
  const at = (r) => {
    const p = polar(r, deg);
    const s = 10 * Math.sin(r / 37 + index) * (r / 220);
    return [p.x + s * ux, p.z + s * uz];
  };
  const pts = [];
  for (let r = from; r < to; r += 4) pts.push(at(r));
  pts.push(at(to));
  return { kind: 'avenue', angle: deg, w, pts };
}

export function quadCurve(a, c, b, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
    ]);
  }
  return pts;
}
