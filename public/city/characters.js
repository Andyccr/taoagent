import * as THREE from 'three';
import { makeNameTag, makeIconSprite } from './textures.js';

const GREY = 0x9a9a9a;

function makeMat(color) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.9,
    metalness: 0.0
  });
  m.userData.origColor = m.color.clone();
  m.userData.origOpacity = m.opacity;
  m.userData.origTransparent = m.transparent;
  return m;
}

function lighten(color, t) {
  return new THREE.Color(color).lerp(new THREE.Color(0xffffff), t);
}

function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function buildAccessory(kind, mats) {
  const reg = (m) => { mats.push(m); return m; };
  const g = new THREE.Group();
  switch (kind) {
    case 'gavel': {
      const wood = reg(makeMat(0x8a5a2b));
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.26, 10), wood);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 12), wood);
      head.rotation.z = Math.PI / 2;
      head.position.y = 0.12;
      g.add(handle, head);
      break;
    }
    case 'briefcase': {
      const brown = reg(makeMat(0x6b4a2f));
      const metal = reg(makeMat(0xb5b5b5));
      const body = box(0.3, 0.2, 0.07, brown);
      body.position.y = -0.16;
      const handle = box(0.12, 0.05, 0.03, metal);
      handle.position.y = -0.03;
      g.add(body, handle);
      break;
    }
    case 'laptop': {
      const silver = reg(makeMat(0xc9ccd1));
      const glow = reg(makeMat(0xbfe3ff));
      const base = box(0.3, 0.02, 0.2, silver);
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.01, -0.1);
      lidPivot.rotation.x = -Math.PI * 0.42;
      const lid = box(0.3, 0.2, 0.02, silver);
      lid.position.y = 0.1;
      const screen = box(0.26, 0.16, 0.01, glow);
      screen.position.set(0, 0.1, 0.015);
      lidPivot.add(lid, screen);
      g.add(base, lidPivot);
      break;
    }
    case 'magnifier': {
      const rim = reg(makeMat(0x3a3a3a));
      const glass = reg(makeMat(0xd7ecff));
      const stick = reg(makeMat(0x5a3d23));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 16), rim);
      ring.position.y = 0.13;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), glass);
      lens.position.set(0, 0.13, 0.004);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8), stick);
      g.add(ring, lens, handle);
      break;
    }
    case 'clipboard': {
      const board = box(0.24, 0.32, 0.02, reg(makeMat(0xcaa46a)));
      const clip = box(0.09, 0.04, 0.035, reg(makeMat(0xb0b0b0)));
      clip.position.y = 0.15;
      g.add(board, clip);
      break;
    }
    case 'mug': {
      const white = reg(makeMat(0xf5f5f5));
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 14), white);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.01, 6, 12), white);
      handle.position.x = 0.055;
      g.add(cup, handle);
      break;
    }
    case 'scroll': {
      const paper = reg(makeMat(0xf1e3bf));
      const knob = reg(makeMat(0xb3392f));
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), paper);
      roll.rotation.z = Math.PI / 2;
      g.add(roll);
      for (const sx of [-1, 1]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), knob); k.rotation.z = Math.PI / 2; k.position.x = sx * 0.17; g.add(k); }
      break;
    }
    case 'crown': {
      const gold = reg(makeMat(0xe7b52c));
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 12, 1, true), gold);
      g.add(band);
      for (let i = 0; i < 5; i++) { const sp = box(0.06, 0.12, 0.06, gold); const a = (i / 5) * Math.PI * 2; sp.position.set(Math.sin(a) * 0.22, 0.1, Math.cos(a) * 0.22); g.add(sp); }
      break;
    }
    case 'egg': {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), reg(makeMat(0xfdfdfd)));
      egg.scale.set(0.8, 1, 0.8);
      g.add(egg);
      break;
    }
    default:
      return null;
  }
  return g;
}

function buildCharacter(def, opts) {
  const mats = [];
  const root = new THREE.Group();

  const bodyMat = makeMat(def.color);
  const headMat = makeMat(lighten(def.color, 0.25));
  const eyeMat = makeMat(0x141414);
  mats.push(bodyMat, headMat, eyeMat);

  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.13, 0.45, 0);
    const leg = box(0.18, 0.45, 0.2, bodyMat);
    leg.position.y = -0.225;
    hip.add(leg);
    root.add(hip);
    legs.push(hip);
  }

  const torso = box(0.55, 0.55, 0.32, bodyMat);
  torso.position.y = 0.725;
  root.add(torso);

  const head = box(0.42, 0.42, 0.42, headMat);
  head.position.y = 1.21;
  root.add(head);

  for (const sx of [-1, 1]) {
    const eye = box(0.07, 0.09, 0.03, eyeMat);
    eye.position.set(sx * 0.09, 1.25, 0.215);
    root.add(eye);
  }

  const arms = [];
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * 0.345, 1.0, 0);
    const arm = box(0.14, 0.45, 0.16, bodyMat);
    arm.position.y = -0.225;
    shoulder.add(arm);
    root.add(shoulder);
    arms.push(shoulder);
  }

  const accessory = buildAccessory(def.accessory, mats);
  if (accessory) {
    accessory.position.set(0, -0.4, 0.06);
    arms[0].add(accessory);
  }

  const raw = def.name == null ? '' : String(def.name);
  const short = raw.length > 6 ? raw.slice(0, 6) + '…' : raw;
  const tag = makeNameTag(short);
  tag.position.set(0, 1.65, 0);
  root.add(tag);

  const waitIcon = makeIconSprite('waiting');
  waitIcon.position.set(0, 2.0, 0);
  waitIcon.visible = false;
  root.add(waitIcon);

  const errIcon = makeIconSprite('error');
  errIcon.position.set(0, 2.0, 0);
  errIcon.visible = false;
  root.add(errIcon);

  if (opts && opts.shadows) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  const pickables = [];
  root.traverse((o) => { if (o.isMesh) pickables.push(o); });

  return { root, mats, legs, arms, tag, waitIcon, errIcon, pickables };
}

function setLegs(c, v) {
  for (const leg of c.legs) leg.rotation.x = v;
}

function setArms(c, v) {
  for (const arm of c.arms) arm.rotation.x = v;
}

function applyVisual(c, state) {
  for (const m of c.mats) {
    m.color.copy(m.userData.origColor);
    m.opacity = m.userData.origOpacity;
    m.transparent = m.userData.origTransparent;
  }
  c.waitIcon.visible = false;
  c.errIcon.visible = false;
  if (state === 'disconnected') {
    for (const m of c.mats) {
      m.color.set(GREY);
      m.opacity = 0.55;
      m.transparent = true;
    }
  } else if (state === 'stale') {
    for (const m of c.mats) m.color.multiplyScalar(0.45);
  }
  if (state === 'waiting') c.waitIcon.visible = true;
  if (state === 'error') c.errIcon.visible = true;
}

export { buildCharacter, applyVisual, setArms, setLegs };
