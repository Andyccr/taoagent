// Straight two-tier Roman aqueduct along local x, centered at origin (decorative).
import { makeKit, THREE } from './kit.js';
export function buildAqueduct({ length = 12, height = 5, shadows = true } = {}) {
  const kit = makeKit(shadows);
  const g = new THREE.Group();
  const stone = kit.mat(0xe2d3b5), dark = kit.mat(0xcdbb98), water = kit.mat(0x7f9fb0, { roughness: 0.3, metalness: 0.1 });
  const span = 2.4, n = Math.max(2, Math.round(length / span)), L = n * span, depth = 1.1;
  const h1 = height * 0.55, h2 = height - h1 - 0.5;
  const archTier = (y, h, w, pier) => {
    // piers
    for (let i = 0; i <= n; i++) kit.box(g, pier, h, depth, stone, -L / 2 + i * span, y, 0);
    // arch spandrels: a slab with a semicircular hole per bay
    for (let i = 0; i < n; i++) {
      const x0 = -L / 2 + i * span + pier / 2, wbay = span - pier, r = wbay / 2;
      const s = new THREE.Shape();
      s.moveTo(0, 0); s.lineTo(0, r + 0.35); s.lineTo(wbay, r + 0.35); s.lineTo(wbay, 0);
      s.absarc(r, 0, r, 0, Math.PI, false);
      const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); geo.translate(0, 0, -depth / 2);
      kit.add(g, geo, stone, x0, y + h - r - 0.35, 0);
    }
    kit.box(g, L + pier, 0.25, depth + 0.1, dark, 0, y + h, 0);
  };
  archTier(0, h1, span, 0.55);
  archTier(h1 + 0.25, h2, span, 0.4);
  const top = h1 + 0.25 + h2 + 0.25;
  kit.box(g, L + 0.4, 0.45, depth, stone, 0, top, 0);
  kit.box(g, L + 0.2, 0.06, depth * 0.55, water, 0, top + 0.42, 0);
  return g;
}
