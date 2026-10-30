// Tiny geometry/material kit shared by all procedural city builders.
import * as THREE from 'three';
export { THREE };
export const CJK_FONT = '"Noto Sans CJK SC","Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif';

// Every builder creates its own materials through a kit so one building can be greyed without affecting others.
export function makeKit(shadows = true) {
  const mats = [];
  const meshes = [];
  const mat = (color, o = {}) => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color), roughness: o.roughness ?? 0.85, metalness: o.metalness ?? 0,
      emissive: new THREE.Color(o.emissive ?? 0x000000), emissiveIntensity: o.emissiveIntensity ?? 1,
      transparent: !!o.transparent, opacity: o.opacity ?? 1, map: o.map ?? null, flatShading: o.flatShading ?? false,
    });
    m.userData.orig = { color: m.color.clone(), emissive: m.emissive.clone(), emissiveIntensity: m.emissiveIntensity };
    mats.push(m);
    return m;
  };
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadows; mesh.receiveShadow = shadows;
    parent.add(mesh); meshes.push(mesh);
    return mesh;
  };
  // box(parent, w, h, d, mat, x, y, z): y is the BOTTOM of the box (sits on y).
  const box = (parent, w, h, d, m, x = 0, y = 0, z = 0) => add(parent, new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z);
  // cyl(parent, rTop, rBottom, h, mat, x, y, z, seg): y is the BOTTOM.
  const cyl = (parent, rt, rb, h, m, x = 0, y = 0, z = 0, seg = 12) => add(parent, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y + h / 2, z);
  return { THREE, mats, meshes, mat, add, box, cyl };
}

// Canvas text texture (CJK safe). Returns a THREE.CanvasTexture.
export function textTexture(lines, { w = 512, h = 256, bg = null, fg = '#222', font = 48, weight = 600, align = 'center' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.fillStyle = fg; ctx.textAlign = align; ctx.textBaseline = 'middle';
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((l, i) => {
    const size = i === 0 ? font : Math.round(font * 0.62);
    ctx.font = `${i === 0 ? weight : 500} ${size}px ${CJK_FONT}`;
    const y = h / 2 + (i - (arr.length - 1) / 2) * font * 0.95;
    ctx.fillText(String(l), align === 'center' ? w / 2 : 24, y, w - 32);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
