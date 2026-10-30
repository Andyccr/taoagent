import * as THREE from 'three';

export function setNightEmissive(mats, on) {
  for (const mat of mats || []) {
    if (!mat) continue;
    if (mat.emissive) {
      mat.emissive.setHex(0xffb35a);
      mat.emissiveIntensity = on ? 0.55 : 0;
    } else if (mat.color) {
      const c = mat.color;
      const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      if (lum < 0.25) {
        mat.emissive = new THREE.Color(0xffb35a);
        mat.emissiveIntensity = on ? 0.7 : 0;
        mat.needsUpdate = true;
      }
    }
  }
}

export function makeLampMesh() {
  const g = new THREE.Group();
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 6, 4),
    new THREE.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0xffb35a, emissiveIntensity: 0.9, roughness: 1 })
  );
  bulb.position.y = 0.9;
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 })
  );
  post.position.y = 0.45;
  g.add(bulb, post);
  return g;
}

export function makeLanternMesh() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xff7a3a, emissiveIntensity: 0.8, roughness: 1 })
  );
  box.position.y = 0.9;
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 })
  );
  post.position.y = 0.45;
  g.add(box, post);
  return g;
}
