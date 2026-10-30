import * as THREE from 'three';
import { CJK_FONT } from './kit.js';

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function makeCarpetText(text, w, d, carpetHex, textHex) {
  const width = 1024;
  const height = Math.max(1, Math.round((1024 * d) / w));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);

  let size = height * 0.7;
  ctx.font = `600 ${size}px ${CJK_FONT}`;
  const measured = ctx.measureText(String(text)).width;
  const maxWidth = width * 0.9;
  if (measured > maxWidth) {
    size *= maxWidth / measured;
  }
  size = Math.max(8, Math.floor(size));

  ctx.font = `600 ${size}px ${CJK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textHex;
  ctx.fillText(String(text), width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 1,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.carpetHex = carpetHex;
  return mesh;
}

export function makeNameTag(shortText) {
  const canvas = createCanvas(256, 64);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 64);
  roundRectPath(ctx, 2, 2, 252, 60, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();

  ctx.fillStyle = 'rgba(40,40,45,0.75)';
  ctx.font = `30px ${CJK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(shortText), 128, 33, 232);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    depthWrite: false,
    transparent: true,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.4, 0.35, 1);
  return sprite;
}

export function makeIconSprite(kind) {
  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext('2d');
  const isError = kind === 'error';

  ctx.clearRect(0, 0, 128, 128);
  ctx.beginPath();
  ctx.arc(64, 64, 36, 0, Math.PI * 2);
  ctx.fillStyle = isError ? 'rgba(217,83,79,0.85)' : 'rgba(150,156,168,0.85)';
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = isError ? `700 64px ${CJK_FONT}` : `700 58px ${CJK_FONT}`;
  ctx.fillText(isError ? '!' : '…', 64, isError ? 68 : 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.45, 0.45, 1);
  return sprite;
}

