// Renders the organic metropolis plan (metropolis-plan.js) around the agent core with as few draw calls as possible:
// - roads/canal/sea are flat merged ribbons; every filler kind/variant is one merged geometry instanced per quarter+ring;
// - parks are one vertex-coloured mesh, fields one InstancedMesh with per-instance colours; trees are instanced;
// - wonders are one merged mesh each (+ one glass mesh), built once per page and reused when the agent core rebuilds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cityMaterial, createGeo, buildSimplified } from './geo.js';
import { polar } from './layout.js';
import { computeMetropolis, hash, WALL_R } from './metropolis-plan.js';
import { CHINESE_FILLERS } from './fillers-chinese.js';
import { GREEK_FILLERS } from './fillers-greek.js';
import { ROMAN_FILLERS } from './fillers-roman.js';
import { MODERN_FILLERS } from './fillers-modern.js';
import { COMMON_FILLERS, bridge } from './fillers-common.js';
import { OUTER_FILLERS } from './fillers-outer.js';
import { CHINESE_EXTRA } from './fillers-chinese-extra.js';
import { GREEK_EXTRA } from './fillers-greek-extra.js';
import { ROMAN_EXTRA } from './fillers-roman-extra.js';
import { MODERN_EXTRA } from './fillers-modern-extra.js';
import { COMMON_EXTRA } from './fillers-common-extra.js';
import { STREET_PROPS } from './street-props.js';
import { antenna, chimneyPot } from './detail-props.js';
import { createLodBatch, createBatchMaterial, treeProxyGeometry } from './metro-batch.js';
import { scatterProps } from './metro-scatter.js';
import { riverGeometry, wallGeometry, quayGeometry } from './metro-terrain.js';
import { buildLife, buildNightLights } from './metro-life.js';
import { createWaterMaterial, updateWater, disposeWater } from './metro-water.js';
import { buildSky } from './metro-sky.js';
import { mountainRangeGeometry } from './metro-mountains.js';
import { buildPalace } from './wonder-palace.js';
import { buildGreatPagoda } from './wonder-pagoda.js';
import { buildAcropolis } from './wonder-acropolis.js';
import { buildColosseum } from './wonder-colosseum.js';
import { buildPantheon, buildTriumphalArch } from './wonder-pantheon.js';
import { buildSupertall } from './wonder-supertall.js';
import { buildCityWall } from './wonder-wall.js';
import { buildGreatAqueduct } from './wonder-aqueduct.js';
import { buildTempleOfHeaven } from './wonder-temple-heaven.js';
import { buildSkylineTowers } from './wonder-skyline.js';
import { buildLighthouse } from './wonder-lighthouse.js';
import { buildColossus } from './wonder-colossus.js';
import { buildHangingGardens } from './wonder-gardens.js';
import { heightAt, footprintHeight, drape, seaOutline, coastSides } from './metro-height.js';
import { placeDressing } from './metro-dress.js';
import { DRESSING } from './dressing-props.js';

const FILLERS = {
  chinese: { ...CHINESE_FILLERS, ...CHINESE_EXTRA },
  greek: { ...GREEK_FILLERS, ...GREEK_EXTRA },
  roman: { ...ROMAN_FILLERS, ...ROMAN_EXTRA },
  modern: { ...MODERN_FILLERS, ...MODERN_EXTRA },
  common: { ...COMMON_FILLERS, ...COMMON_EXTRA },
  outer: { ...OUTER_FILLERS, ...COMMON_EXTRA },
};
const WONDER_BUILDERS = {
  palace: buildPalace, pagoda: buildGreatPagoda, acropolis: buildAcropolis, colosseum: buildColosseum, pantheon: buildPantheon, arch: buildTriumphalArch, supertall: buildSupertall, wall: () => buildCityWall(100),
  aqueduct: buildGreatAqueduct, heaven: buildTempleOfHeaven, skyline: buildSkylineTowers, lighthouse: buildLighthouse, colossus: buildColossus, gardens: buildHangingGardens,
};
// Per-quality distances (metres from the camera): near = full filler model (proxy beyond), cull = filler hidden,
// trees = full tree model (canopy stand-in beyond, hidden past treeCull), props / people = dressing hidden beyond.
export const LOD = {
  low: { near: 150, cull: 1500, trees: 120, treeCull: 700, props: 0, people: 0 },
  medium: { near: 250, cull: 2200, trees: 280, treeCull: 1500, props: 150, people: 110 },
  high: { near: 400, cull: 2800, trees: 440, treeCull: 2200, props: 230, people: 170 },
};
const GROUND = { chinese: '#c9c19f', greek: '#cfcab4', roman: '#c8b48e', modern: '#b9bcb6', mixed: '#c4c0a4', blend: '#c9c3a6', harbour: '#b7c2b0', industrial: '#b5b0a4', suburb: '#b8bf98', country: '#a9b98a', farmland: '#a9b98a' };
const DISTRICT_TINT = { roman: [1.05, 0.98, 0.9], greek: [1.03, 1.03, 1.03], chinese: [1.0, 0.96, 0.94], modern: [0.95, 0.98, 1.04], common: [1.02, 0.99, 0.95], outer: [1.02, 0.98, 0.9] };
const PARK = { park: '#8fb36a', plaza: '#d6cdb6', market: '#cdbf9f' };
const CROP = ['#c9b458', '#8fae5a', '#a7c46a', '#b98e4f', '#d2c07a', '#7f9a4e'];
const YARD = ['#9fbd78', '#8a9a5a', '#a9c283', '#b9a684'];

const fillerCache = new Map();
function fillerGeometry(style, kind, variant) {
  const key = style + ':' + kind + ':' + variant;
  if (!fillerCache.has(key)) {
    const make = FILLERS[style]?.[kind];
    let g = null;
    try { g = make ? make(variant) : null; } catch (error) { console.warn('filler failed', key, error); }
    fillerCache.set(key, g && g.getAttribute && g.getAttribute('position') ? g : null);
  }
  return fillerCache.get(key);
}
const wonderCache = new Map();
// simple: the low preset's lighter model (same builder; ornament under ~1 m dropped, rounder parts coarser).
function wonderParts(kind, simple = false) {
  const key = kind + (simple ? ':low' : '');
  if (!wonderCache.has(key)) {
    let w = null;
    try {
      const build = WONDER_BUILDERS[kind];
      w = build ? (simple ? buildSimplified(build, { min: 1.5, seg: 6 }) : build()) || null : null;
      if (w && w.glass && !w.glass.getAttribute('position')) w = { ...w, glass: null };
    } catch (error) { console.warn('wonder failed', kind, error); }
    wonderCache.set(key, w);
  }
  return wonderCache.get(key);
}

let bridgeRailGeo = null;
function bridgeWithRail(span, width) {
  if (bridgeRailGeo) return bridgeRailGeo;
  const rails = createGeo();
  const t = 0.18, h = 0.7, zEdge = width / 2 - t / 2;
  for (const side of [-1, 1]) rails.box(span, h, t, 0, 0, side * zEdge, '#b9b2a2');
  const railGeo = rails.build();
  if (railGeo.getAttribute('uv')) railGeo.deleteAttribute('uv');
  let deck = bridge(span, width);
  if (!deck) { bridgeRailGeo = railGeo; return bridgeRailGeo; }
  if (deck.index) deck = deck.toNonIndexed();
  if (deck.getAttribute('uv')) deck.deleteAttribute('uv');
  if (deck.getAttribute('uv1')) deck.deleteAttribute('uv1');
  if (!deck.getAttribute('normal')) deck.computeVertexNormals();
  if (!deck.getAttribute('color')) {
    const n = deck.getAttribute('position').count;
    const c = new Float32Array(n * 3).fill(1);
    deck.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  bridgeRailGeo = mergeGeometries([deck, railGeo]) || railGeo;
  return bridgeRailGeo;
}

function polylineNormals(pts, closed = false) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? pts[i - 1] : (closed ? pts[n - 1] : null);
    const next = i < n - 1 ? pts[i + 1] : (closed ? pts[0] : null);
    let dx = 0, dz = 0;
    if (next) { dx += next[0] - pts[i][0]; dz += next[1] - pts[i][1]; }
    if (prev) { dx += pts[i][0] - prev[0]; dz += pts[i][1] - prev[1]; }
    const len = Math.hypot(dx, dz) || 1;
    out.push([-dz / len, dx / len]);
  }
  return out;
}
function offsetPolyline(pts, off, closed = false) {
  const ns = polylineNormals(pts, closed);
  return pts.map(([x, z], i) => [x + ns[i][0] * off, z + ns[i][1] * off]);
}
function ribbon(pts, w, closed = false) {
  const n = pts.length, half = w / 2, ns = polylineNormals(pts, closed);
  const pos = [], nor = [], idx = [];
  for (let i = 0; i < n; i++) {
    const [x, z] = pts[i], [nx, nz] = ns[i];
    pos.push(x + nx * half, 0, z + nz * half, x - nx * half, 0, z - nz * half);
    nor.push(0, 1, 0, 0, 1, 0);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = i * 2, b = a + 1, c = ((i + 1) % n) * 2, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

function segmentHit(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c[0] - a[0], qz = c[1] - a[1];
  const t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + rx * t, a[1] + rz * t];
}
function crosswalkGeometry(plan) {
  const avenues = plan.roads.filter((r) => r.kind === 'avenue');
  const others = plan.roads.filter((r) => r.kind !== 'avenue');
  const seen = new Set(), pos = [], idx = [];
  for (const road of avenues) {
    for (let i = 1; i < road.pts.length; i++) {
      const a = road.pts[i - 1], b = road.pts[i];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
      const ux = dx / len, uz = dz / len, vx = -uz, vz = ux;
      for (const other of others) {
        for (let j = 1; j < other.pts.length; j++) {
          const p = segmentHit(a, b, other.pts[j - 1], other.pts[j]);
          if (!p) continue;
          const key = Math.round(p[0] * 2) + ':' + Math.round(p[1] * 2);
          if (seen.has(key)) continue;
          seen.add(key);
          const span = road.w * 0.92, bar = 0.42, gap = 0.42;
          const n = Math.max(3, Math.floor((span + gap) / (bar + gap)));
          const width = n * bar + (n - 1) * gap;
          for (let k = 0; k < n; k++) {
            const off = -width / 2 + bar / 2 + k * (bar + gap);
            const cx = p[0] + vx * off, cz = p[1] + vz * off;
            const hx = ux * span / 2, hz = uz * span / 2, bx = vx * bar / 2, bz = vz * bar / 2;
            const base = pos.length / 3;
            pos.push(cx - hx - bx, 0, cz - hz - bz, cx + hx - bx, 0, cz + hz - bz, cx + hx + bx, 0, cz + hz + bz, cx - hx + bx, 0, cz - hz + bz);
            idx.push(base, base + 3, base + 1, base + 1, base + 3, base + 2);
          }
        }
      }
    }
  }
  if (!pos.length) return null;
  const nor = new Float32Array(pos.length);
  for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

let sharedStatic = null;
// Lift every vertex of a ground-standing mesh by the terrain under it (walls, hills).
function liftByTerrain(g) {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + heightAt(p.getX(i), p.getZ(i)));
  p.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere();
}
// Open sea: the harbour arc (where the sea wall stands) widening into a bay with ragged headlands out to the horizon.
function seaGeometry(plan) {
  const outline = seaOutline(plan).map(([x, z]) => new THREE.Vector2(x, -z));
  const g = new THREE.ShapeGeometry(new THREE.Shape(outline), 1).rotateX(-Math.PI / 2);
  g.deleteAttribute('uv');
  g.userData.outline = outline;
  return g;
}

// Land: one smooth polar grid draped over the terrain (fine rings over the city, wide ones to the horizon), with
// every cell that lies in the open sea left out so the water never fights the ground.
function landGeometry(plan, sea, coarse = false) {
  const segs = coarse ? 240 : 360, radii = [0];
  for (let r = coarse ? 6 : 4; r <= 340; r += coarse ? 6 : 4) radii.push(r);
  for (let r = 350; r <= 700; r += coarse ? 20 : 10) radii.push(r);
  for (let r = 750; r <= 2450; r += 50) radii.push(r);
  const outline = sea.userData.outline, inSea = (x, z) => {
    let inside = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const xi = outline[i].x, zi = -outline[i].y, xj = outline[j].x, zj = -outline[j].y;
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
  const pos = new Float32Array(radii.length * segs * 3), idx = [];
  radii.forEach((r, j) => { for (let i = 0; i < segs; i++) { const a = (i / segs) * Math.PI * 2, x = Math.sin(a) * r, z = -Math.cos(a) * r, o = (j * segs + i) * 3; pos[o] = x; pos[o + 1] = heightAt(x, z); pos[o + 2] = z; } });
  const { from, to, shore } = plan.sea;
  for (let j = 0; j < radii.length - 1; j++) for (let i = 0; i < segs; i++) {
    const i2 = (i + 1) % segs, a = j * segs + i, b = j * segs + i2, c = (j + 1) * segs + i, d = (j + 1) * segs + i2;
    const deg = ((i + 0.5) / segs) * 360, rm = (radii[j] + radii[j + 1]) / 2;
    if (rm > shore + 4 && deg > from - 30 && deg < to + 30) {
      const am = ((i + 0.5) / segs) * Math.PI * 2;
      if (inSea(Math.sin(am) * rm, -Math.cos(am) * rm) && pos[a * 3 + 1] < -0.3 && pos[d * 3 + 1] < -0.3) continue;
    }
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  // Keep the faces pointing up whatever the polar winding is.
  const ay = pos[1], cy0 = pos[segs * 3 + 1];
  const A = new THREE.Vector3(pos[segs * 9], 0, pos[segs * 9 + 2]), C = new THREE.Vector3(pos[segs * 12], 0, pos[segs * 12 + 2]), B = new THREE.Vector3(pos[segs * 9 + 3], 0, pos[segs * 9 + 5]);
  if (C.clone().sub(A).cross(B.clone().sub(A)).y < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
  void ay; void cy0;
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// Open land: a gentle patchwork of meadow, crop and woodland tones by world position (no texture, fades with distance).
function groundMaterial(plain = false) {
  const m = new THREE.MeshStandardMaterial({ color: '#aeb89a', roughness: 1, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 });
  if (plain) return m;
  m.customProgramCacheKey = () => 'city-ground-v1';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGroundW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vGroundW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vGroundW;
float gHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float gNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( gHash( i ), gHash( i + vec2( 1, 0 ) ), u.x ), mix( gHash( i + vec2( 0, 1 ) ), gHash( i + vec2( 1, 1 ) ), u.x ), u.y ); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  {
    vec2 p = vGroundW.xz;
    float n1 = gNoise( p * 0.012 ), n2 = gNoise( p * 0.045 + 17.0 ), n3 = gNoise( p * 0.16 + 3.0 );
    vec3 meadow = vec3( 0.36, 0.45, 0.22 ), wood = vec3( 0.23, 0.32, 0.15 ), crop = vec3( 0.5, 0.45, 0.22 );
    vec3 c = mix( meadow, wood, smoothstep( 0.55, 0.75, n1 ) );
    c = mix( c, crop, smoothstep( 0.62, 0.7, n2 ) * ( 1.0 - smoothstep( 0.5, 0.7, n1 ) ) * 0.8 );
    float fine = 1.0 - smoothstep( 80.0, 260.0, length( vViewPosition ) );
    c *= 0.94 + 0.12 * mix( 0.5, n3, fine );
    diffuseColor.rgb = c;
  }`);
  };
  return m;
}

// Paving: setts / flagstones laid in staggered courses in world space, mortar joints and per-stone tone,
// faded out with distance so far roads stay calm. size = stone length in metres.
function pavedMaterial(color, size, plain = false) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  if (plain) return m;
  m.customProgramCacheKey = () => 'city-paved-v2';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uStone = { value: size };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPaveW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vPaveW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vPaveW;
uniform float uStone;
float pHash( vec2 p ) { return fract( sin( dot( p, vec2( 41.3, 289.1 ) ) ) * 43758.5453 ); }
float pNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( pHash( i ), pHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( pHash( i + vec2( 0.0, 1.0 ) ), pHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
float vPuddle;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  {
    vec2 p = vPaveW.xz / vec2( uStone, uStone * 0.62 );
    float row = floor( p.y );
    p.x += row * 0.5;
    vec2 f = fract( p ), w = fwidth( p );
    float e = min( min( f.x, 1.0 - f.x ) / max( w.x, 1e-4 ), min( f.y, 1.0 - f.y ) / max( w.y, 1e-4 ) );
    float joint = 1.0 - smoothstep( 0.6, 1.6, e );
    float fade = ( 1.0 - smoothstep( 25.0, 110.0, length( vViewPosition ) ) ) * clamp( 1.6 - max( w.x, w.y ) * 2.0, 0.0, 1.0 );
    diffuseColor.rgb *= 1.0 - fade * ( 0.16 * joint - 0.07 * ( pHash( floor( p ) ) - 0.5 ) );
    // Wear: soft grime stains and worn wheel/foot paths; after rain-like puddles in low spots (darker, glossy).
    float stain = pNoise( vPaveW.xz / 7.0 ) * 0.6 + pNoise( vPaveW.xz / 2.3 ) * 0.4;
    float near = 1.0 - smoothstep( 60.0, 220.0, length( vViewPosition ) );
    diffuseColor.rgb *= 1.0 - near * 0.12 * smoothstep( 0.45, 0.9, stain );
    vPuddle = near * smoothstep( 0.80, 0.86, pNoise( vPaveW.xz / 5.0 + 17.0 ) * 0.75 + pNoise( vPaveW.xz / 1.7 ) * 0.25 );
    diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.55, 0.6, 0.68 ), vPuddle );
  }`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix( roughnessFactor, 0.12, vPuddle );');
  };
  return m;
}

function staticGeometry() {
  if (sharedStatic) return sharedStatic;
  const plan = computeMetropolis();
  const byKind = { ring: [], avenue: [], street: [], alley: [] };
  for (const road of plan.roads) {
    const a = road.pts[0], b = road.pts[road.pts.length - 1];
    const closed = road.kind === 'ring' && !road.arc && (a[0] !== b[0] || a[1] !== b[1]);
    // Rings beyond the wall read as dusty country lanes rather than paved boulevards, so the rings fade out of the aerial view.
    const kind = road.kind === 'ring' && road.r > WALL_R + 10 ? 'lane' : road.kind;
    (byKind[kind] || (byKind[kind] = [])).push(ribbon(road.pts, road.w, closed));
  }
  const merge = (gs) => gs && gs.length ? mergeGeometries(gs) : null;
  const roads = [];
  // Raised pavements along both sides of every avenue and ring road.
  const walks = [];
  for (const road of plan.roads) {
    if (road.kind !== 'avenue' && road.kind !== 'ring') continue;
    if (road.kind === 'ring' && road.r > WALL_R + 10) continue;
    const a = road.pts[0], b = road.pts[road.pts.length - 1];
    const closed = road.kind === 'ring' && !road.arc && (a[0] !== b[0] || a[1] !== b[1]);
    for (const side of [-1, 1]) walks.push(ribbon(offsetPolyline(road.pts, side * (road.w / 2 + 0.55), closed), 1.1, closed));
  }
  const pavement = merge(walks); if (pavement) roads.push({ geo: pavement, color: '#e3dccb', y: 0.04 });
  const main = merge([...byKind.ring, ...byKind.avenue]);
  if (main) roads.push({ geo: main, color: '#d8d0bc', y: 0.02 });
  const street = merge(byKind.street); if (street) roads.push({ geo: street, color: '#cfc5ae', y: 0.025 });
  const alley = merge(byKind.alley); if (alley) roads.push({ geo: alley, color: '#c4b99f', y: 0.03 });
  const lane = merge(byKind.lane); if (lane) roads.push({ geo: lane, color: '#b3a684', y: 0.028 });

  const canal = plan.canal, cp = canal.pts, last = cp[cp.length - 1];
  const canalPts = cp.length > 2 && cp[0][0] === last[0] && cp[0][1] === last[1] ? cp.slice(0, -1) : cp;
  const waterGeo = ribbon(canalPts, canal.half * 2, true);
  const kerbs = mergeGeometries([-1, 1].map((side) => ribbon(offsetPolyline(canalPts, side * canal.half, true), 0.7, true)));

  const sea = seaGeometry(plan), land = landGeometry(plan, sea);
  // Everything flat on the ground follows the terrain (split into short edges so it hugs the land grid).
  for (const r of roads) r.geo = drape(r.geo, 0.05, 7);
  const crosswalks = crosswalkGeometry(plan);
  const wall = wallGeometry(plan); liftByTerrain(wall);
  const rv = riverGeometry(plan), river = { water: rv.water, banks: drape(mergeGeometries([rv.quay, rv.path]), 0, 5) };
  // Sand along both natural coasts of the bay (half under the shallows, half up the beach).
  const coasts = coastSides(plan), beach = drape(mergeGeometries(coasts.map((c) => ribbon(c, 30))), 0.06, 10);
  const patches = new Map();
  for (const patch of plan.patches || []) {
    const style = patch.style || patch.zone || patch.kind || patch.type || 'mixed';
    const pts = patch.pts || patch.points;
    if (!pts || pts.length < 3) continue;
    const color = GROUND[style] || GROUND.mixed;
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], -pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.deleteAttribute('uv');
    if (!patches.has(color)) patches.set(color, []);
    patches.get(color).push(g);
  }
  for (const [color, geos] of patches) patches.set(color, drape(mergeGeometries(geos), 0.03, 6));
  const parkGeos = [];
  for (const p of plan.parks) {
    const g = new THREE.CircleGeometry(p.r, 20).rotateX(-Math.PI / 2).translate(p.x, 0, p.z);
    g.deleteAttribute('uv');
    const c = new THREE.Color(PARK[p.kind] || PARK.park), n = g.getAttribute('position').count, colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parkGeos.push(g);
  }
  const parks = parkGeos.length ? drape(mergeGeometries(parkGeos), 0.045, 5) : null;
  const polyMesh = (items, colorOf, lift, edge) => {
    const pos = [], col = [], c = new THREE.Color();
    for (const it of items) {
      colorOf(it, c);
      const p = it.pts;
      for (let i = 1; i < p.length - 1; i++) {
        const a = p[0], b = p[i], d = p[i + 1], up = (b[1] - a[1]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[1] - a[1]) > 0;
        for (const v of up ? [a, b, d] : [a, d, b]) { pos.push(v[0], 0, v[1]); col.push(c.r, c.g, c.b); }
      }
    }
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const out = drape(g, lift, edge), P = out.getAttribute('position');
    // Beyond ~650 m the land grid is coarse; lift far parcels a little more so the land never shows through.
    for (let i = 0; i < P.count; i++) { const r = Math.hypot(P.getX(i), P.getZ(i)); if (r > 600) P.setY(i, P.getY(i) + (r - 600) * 0.004); }
    return out;
  };
  const fields = polyMesh(plan.fields, (f, c) => { const k = 0.9 + (hash(f.id + 'b') % 20) / 100; c.set(CROP[f.crop % CROP.length]).multiplyScalar(k); }, 0.05, 16);
  const yards = polyMesh(plan.yards || [], (y, c) => { const k = 0.92 + (hash(y.id + 'b') % 16) / 100; c.set(YARD[y.tone]).multiplyScalar(k); }, 0.04, 10);

  sharedStatic = {
    roads, waterGeo, kerbs, sea, land, patches, parks, fields, yards, river, beach, coasts, crosswalks: crosswalks ? drape(crosswalks, 0.07, 4) : null, bridge: bridgeWithRail(canal.half * 2 + 1.5, 5.2),
    riverBridge: bridge(plan.river.half * 2 + 2, 6.4), wall, quay: quayGeometry(plan),
    mountains: mountainRangeGeometry({ inner: 1120, outer: 2350, heightScale: 0.78, seaFrom: plan.sea.from, seaTo: plan.sea.to }),
  };
  return sharedStatic;
}

// Build the metropolis into `scene`. claimedLots: Set of lot ids now occupied by agent buildings (their fillers are skipped).
export function buildMetropolis(scene, { claimedLots = new Set(), quality = 'medium', pickables = [] } = {}) {
  const plan = computeMetropolis();
  const root = new THREE.Group(); root.name = 'metropolis';
  const solid = cityMaterial('solid');
  const stats = { fillers: 0, fillerKinds: new Set(), instancedMeshes: 0, trees: 0, props: 0, movers: 0, wonders: [], parks: plan.parks.length, fields: plan.fields.length, chimneys: [], piers: [] };
  const batches = [];
  const st = staticGeometry();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();

  if (quality === 'low' && !st.landCoarse) st.landCoarse = landGeometry(plan, st.sea, true);
  const base = new THREE.Mesh(quality === 'low' ? st.landCoarse : st.land, groundMaterial(quality === 'low'));
  base.position.y = 0.002; base.receiveShadow = quality !== 'low'; root.add(base);

  // Low skips the district ground tints and house yards (plain land), keeping fields, parks and roads.
  if (quality !== 'low') for (const [color, geo] of st.patches) {
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    mesh.receiveShadow = quality !== 'low';
    root.add(mesh);
  }

  // Low keeps the plain shared materials (no procedural ground, paving, facades or animated water).
  const plain = quality === 'low';
  const waterMat = plain ? cityMaterial('water') : createWaterMaterial({ color: '#4f86a3', deep: '#2d5f7a', opacity: 0.9 });
  const seaMat = plain ? cityMaterial('water') : createWaterMaterial({ color: '#3f7896', deep: '#1f4c66', opacity: 0.96, scale: 2.2 });
  const sea = new THREE.Mesh(st.sea, seaMat); sea.position.y = 0.04; root.add(sea);
  const beach = new THREE.Mesh(st.beach, new THREE.MeshStandardMaterial({ color: '#dcc9a0', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); beach.receiveShadow = quality !== 'low'; root.add(beach);

  for (const r of st.roads) { const m = new THREE.Mesh(r.geo, pavedMaterial(r.color, r.y >= 0.04 ? 0.38 : r.y > 0.022 ? 0.55 : 1.15, quality === 'low')); m.position.y = r.y; m.receiveShadow = quality !== 'low'; root.add(m); }
  if (st.crosswalks) { const m = new THREE.Mesh(st.crosswalks, new THREE.MeshStandardMaterial({ color: '#eae6da', roughness: 0.9 })); m.position.y = 0.045; m.receiveShadow = quality !== 'low'; root.add(m); }
  const water = new THREE.Mesh(st.waterGeo, waterMat); water.position.y = 0.03; root.userData.water = water; root.add(water);
  const edges = new THREE.Mesh(st.kerbs, new THREE.MeshStandardMaterial({ color: '#b9b2a2', roughness: 0.9 })); edges.position.y = 0.15; root.add(edges);

  // Bridges over the canal.
  const bridges = new THREE.InstancedMesh(st.bridge, solid, plan.bridges.length);
  plan.bridges.forEach((b, i) => { q.setFromAxisAngle(up, Math.PI - THREE.MathUtils.degToRad(b.angle)); m4.compose(pos.set(b.x, 0, b.z), q, sc.set(1, 1, 1)); bridges.setMatrixAt(i, m4); });
  bridges.computeBoundingSphere(); root.add(bridges); stats.instancedMeshes++;

  // Fillers: one distance-LOD BatchedMesh for every unclaimed lot (near: full model, far: two-tone proxy).
  const lod = LOD[quality] || LOD.medium;
  const fillerMat = createBatchMaterial(solid, { detail: quality !== 'low' }), propMat = createBatchMaterial(solid);
  const fillers = createLodBatch(fillerMat, { name: 'fillers', castShadow: quality === 'high', receiveShadow: quality !== 'low', surface: 'detail' });
  const tint = new THREE.Color();
  // Processional ways: a paved approach from each city wonder toward the centre, lined with lamps, statues and
  // cypresses; fillers and street props standing on them are left out.
  const ways = [];
  for (const w of plan.wonders) {
    if (!['palace', 'pagoda', 'acropolis', 'colosseum', 'pantheon', 'supertall', 'heaven', 'skyline', 'gardens'].includes(w.kind)) continue;
    const r = Math.hypot(w.x, w.z);
    let ux = -w.x / r, uz = -w.z / r;
    const ext = Math.max(Math.abs(ux) * (w.x1 - w.x0), Math.abs(uz) * (w.z1 - w.z0)) / 2;
    let len = Math.min(54, r - ext - 58);
    if (len < 16) { ux = -ux; uz = -uz; len = 42; } // inner wonders: the approach runs out to the ring roads instead
    ways.push({ w, ax: w.x + ux * (ext - 1), az: w.z + uz * (ext - 1), bx: w.x + ux * (ext + len), bz: w.z + uz * (ext + len), ux, uz, half: 4.5, len });
  }
  const onWay = (x, z, m = 0) => ways.some((a) => {
    const t = Math.max(0, Math.min(1, ((x - a.ax) * (a.bx - a.ax) + (z - a.az) * (a.bz - a.az)) / ((a.bx - a.ax) ** 2 + (a.bz - a.az) ** 2)));
    return Math.hypot(x - (a.ax + (a.bx - a.ax) * t), z - (a.az + (a.bz - a.az) * t)) < a.half + m;
  });
  for (const lot of plan.lots) {
    if (claimedLots.has(lot.id)) continue;
    if (onWay(lot.x, lot.z, lot.size * 0.6 + 2.5)) continue;
    const handle = fillers.geometry(lot.style + ':' + lot.kind + ':' + lot.variant, () => fillerGeometry(lot.style, lot.kind, lot.variant), true);
    if (!handle) continue;
    const s = lot.size / 7;
    q.setFromAxisAngle(up, lot.rotY);
    const fx = lot.x - Math.sin(lot.rotY) * lot.setback, fz = lot.z - Math.cos(lot.rotY) * lot.setback;
    m4.compose(pos.set(fx, footprintHeight(fx, fz, lot.size, lot.rotY) - 0.05, fz), q, sc.set(s * (lot.fw || 1), lot.scaleY * s, s * (lot.fd || 1)));
    // Per-district palette, neighbourhood-scale drift (streets of warmer or paler houses) and per-house wear.
    const th = hash(lot.id + 'tint'), b = 0.9 + (th % 19) / 100, warm = ((th >>> 5) % 9 - 4) / 300;
    const pal = DISTRICT_TINT[lot.style] || DISTRICT_TINT.common;
    const drift = 0.045 * Math.sin(lot.x / 53 + Math.cos(lot.z / 71) * 2) + 0.03 * Math.sin(lot.z / 37 - lot.x / 91);
    const age = lot.style === 'modern' ? 0 : Math.min(0.06, Math.max(0, (lot.r - 140) / 3000)) + ((th >>> 9) % 5 === 0 ? 0.05 : 0);
    fillers.instance(handle, m4, tint.setRGB((b + warm + drift) * pal[0] - age, (b + drift * 0.6) * pal[1] - age, (b - warm - drift * 0.4) * pal[2] - age * 1.2), lod.cull, lod.near);
    stats.fillers++; stats.fillerKinds.add(lot.style + ':' + lot.kind);
  }
  const fillerMesh = fillers.finish();
  if (fillerMesh) { fillerMesh.userData.info = { name: '空置建筑', dept: '可分配给新成员', state: '', label: '' }; root.add(fillerMesh); batches.push(fillerMesh); stats.instancedMeshes++; }

  // Parks: one merged vertex-coloured mesh draped over the land.
  if (st.parks) { const parks = new THREE.Mesh(st.parks, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 })); parks.receiveShadow = quality !== 'low'; root.add(parks); }

  // Fields and house yards: irregular draped polygons with per-parcel colours (two static meshes).
  for (const geo of quality === 'low' ? [st.fields] : [st.fields, st.yards]) if (geo) { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); m.receiveShadow = quality !== 'low'; root.add(m); }

  // Street-level dressing (trees by district, lamps, stalls, signs, carts, moored boats, townsfolk) plus rooftop
  // micro-props, all in one distance-culled batch.
  const props = createLodBatch(propMat, { name: 'props', castShadow: false, receiveShadow: false });
  const placed = scatterProps(plan, { claimedLots, quality });
  const range = { tree: lod.treeCull, prop: lod.props, boat: lod.props * 1.6, people: lod.people };
  for (const p of placed) {
    const lim = range[p.cls];
    if (!lim || onWay(p.x, p.z, 1.5)) continue;
    const tree = p.cls === 'tree';
    const handle = props.geometry('sp:' + p.kind + ':' + p.variant, () => STREET_PROPS[p.kind]?.(p.variant), tree ? treeProxyGeometry : false);
    q.setFromAxisAngle(up, p.rotY);
    m4.compose(pos.set(p.x, p.cls === 'boat' ? 0 : heightAt(p.x, p.z), p.z), q, sc.setScalar(p.scale || 1));
    props.instance(handle, m4, null, lim, tree ? lod.trees : Infinity);
    if (p.cls === 'tree') stats.trees++; else stats.props++;
  }
  // Harbour: timber docks out from the quay with cranes behind them, moored and anchored ships of several types;
  // rocks along both natural coasts of the bay.
  {
    const H = plan.sea, far = lod.treeCull, avoid = plan.wonders.filter((w) => w.kind === 'lighthouse' || w.kind === 'colossus');
    const clear = (x, z, m) => !avoid.some((w) => Math.hypot(w.x - x, w.z - z) < m + Math.max(w.w, w.d) / 2);
    const add = (kind, variant, x, y, z, rotY, scale) => {
      const handle = props.geometry('dr:' + kind + ':' + variant, () => DRESSING[kind]?.(variant));
      if (!handle) return;
      q.setFromAxisAngle(up, rotY); m4.compose(pos.set(x, y, z), q, sc.setScalar(scale));
      props.instance(handle, m4, null, far); stats.props++;
    };
    let i = 0;
    for (let a = H.from + 4; a <= H.to - 4; a += 3.2, i++) {
      const d = polar(H.shore + 8, a), rad = Math.atan2(d.x, d.z);
      if (!clear(d.x, d.z, 20)) continue;
      add('dock', i % 4, d.x, 0.05, d.z, rad, 1.15);
      if (i % 2 === 0) { const c = polar(H.shore - 4, a + 0.6); add('crane', i % 4, c.x, heightAt(c.x, c.z), c.z, rad, 1.25); }
      const moored = ['merchantShip', 'junk', 'fishingBoat', 'containerShip'][hash('dock' + i) % 4];
      if (hash('moor' + i) % 3 !== 0) { const m = polar(H.shore + 12 + (moored === 'containerShip' ? 12 : 6), a + 1.3); add(moored, i % 4, m.x, 0, m.z, rad + (i % 2 ? 0 : Math.PI), moored === 'fishingBoat' ? 1.2 : 1.6); }
    }
    for (let k = 0; k < 18; k++) {
      const a = H.from + 3 + ((hash('ship' + k) % 1000) / 1000) * (H.to - H.from - 6), r = H.shore + 60 + (hash('shr' + k) % 260);
      const p = polar(r, a); if (!clear(p.x, p.z, 25)) continue;
      const kind = ['merchantShip', 'junk', 'fishingBoat', 'fishingBoat', 'containerShip', 'junk'][k % 6];
      add(kind, k % 4, p.x, 0, p.z, (hash('shh' + k) % 628) / 100, kind === 'fishingBoat' ? 1.3 : 1.7);
    }
    for (const c of st.coasts) c.forEach(([x, z], j) => {
      if (j % 2) return;
      const h = hash('rk' + x.toFixed(0) + z.toFixed(0)), n = j < c.length - 1 ? c[j + 1] : c[j - 1];
      const tx = n[0] - x, tz = n[1] - z, l = Math.hypot(tx, tz) || 1, off = ((h % 300) / 10 - 15);
      const rx = x + (-tz / l) * off, rz = z + (tx / l) * off;
      add('rock', h % 4, rx, Math.max(-0.6, heightAt(rx, rz)) - 0.3, rz, (h % 628) / 100, 1.2 + (h % 30) / 10);
    });
  }
  if (lod.props) {
    const roofs = [['antenna', antenna, 8], ['chimney', chimneyPot, 5]];
    for (const lot of plan.lots) {
      if (claimedLots.has(lot.id)) continue;
      const h = hash(lot.id + 'prop');
      const which = (lot.style === 'modern' || lot.kind === 'workshop' || lot.kind === 'factory') && (h & 3) === 0 ? roofs[0]
        : (lot.kind === 'house' || lot.kind === 'siheyuan' || lot.kind === 'cottage' || lot.kind === 'farmhouse') && (h & 7) === 0 ? roofs[1] : null;
      if (!which) continue;
      const handle = props.geometry('roof:' + which[0], () => which[1](0));
      const hh = hash(lot.id + 'py'), tall = (lot.scaleY || 1) * (lot.size / 7);
      q.setFromAxisAngle(up, lot.rotY + ((hh % 20) - 10) / 40);
      m4.compose(pos.set(lot.x, footprintHeight(lot.x, lot.z, lot.size, lot.rotY) + which[2] * tall, lot.z), q, sc.setScalar(0.85 + (hh % 30) / 100));
      props.instance(handle, m4, null, lod.props);
    }
  }
  const wayGeos = [];
  for (const a of ways) {
    const style = a.w.district === 'chinese' ? 'chinese' : a.w.district === 'modern' ? 'modern' : a.w.district === 'roman' ? 'roman' : 'greek';
    const lamp = { chinese: 'lanternPost', modern: 'modernLamp', roman: 'romanTorch', greek: 'gasLamp' }[style];
    const tree = { chinese: 'willow', modern: 'planeTree', roman: 'cypress', greek: 'cypress' }[style];
    wayGeos.push(ribbon([[a.ax, a.az], [a.bx, a.bz]], a.half * 2));
    for (let d = 4, i = 0; d < a.len; d += 5.5, i++) for (const side of [-1, 1]) {
      const x = a.ax - a.ux * -d + -a.uz * side * (a.half + 1.2), z = a.az - a.uz * -d + a.ux * side * (a.half + 1.2);
      const kind = i % 3 === 1 ? lamp : i % 3 === 2 && style !== 'modern' ? 'statue' : tree, isTree = kind === tree;
      const handle = props.geometry('sp:' + kind + ':' + (i % 3), () => STREET_PROPS[kind]?.(i % 3), isTree ? treeProxyGeometry : false);
      q.setFromAxisAngle(up, Math.atan2(a.ux, a.uz) + (side > 0 ? Math.PI / 2 : -Math.PI / 2));
      m4.compose(pos.set(x, heightAt(x, z), z), q, sc.setScalar(kind === 'statue' ? 1.4 : 1.1));
      props.instance(handle, m4, null, isTree ? lod.treeCull : Math.max(lod.props, 300), isTree ? lod.trees : Infinity);
      stats.props++;
    }
  }
  if (wayGeos.length) { const m = new THREE.Mesh(drape(mergeGeometries(wayGeos), 0.09, 4), pavedMaterial('#e2d8c0', 0.5, quality === 'low')); m.receiveShadow = quality !== 'low'; root.add(m); }
  // Facade, lane and rooftop dressing in its own short-range batch (none on low).
  const dressRange = { medium: 120, high: 190 }[quality] || 0;
  if (dressRange) {
    const dress = createLodBatch(propMat, { name: 'dressing', castShadow: false, receiveShadow: false });
    for (const d of placeDressing(plan, { claimedLots, quality, fillerGeometry })) {
      const handle = dress.geometry('dr:' + d.kind + ':' + d.variant, () => DRESSING[d.kind]?.(d.variant));
      if (!handle) continue;
      q.setFromAxisAngle(up, d.rotY);
      m4.compose(pos.set(d.x, d.y, d.z), q, sc.setScalar(d.scale));
      dress.instance(handle, m4, null, dressRange);
      stats.dressing = (stats.dressing || 0) + 1;
    }
    const dressMesh = dress.finish();
    if (dressMesh) { root.add(dressMesh); batches.push(dressMesh); stats.instancedMeshes++; }
  }
  const propMesh = props.finish();
  if (propMesh) { root.add(propMesh); batches.push(propMesh); stats.instancedMeshes++; }

  // River, quays and towpaths; city wall with gates; hills and mountains.
  const river = st.river;
  const riverWater = new THREE.Mesh(river.water, waterMat); riverWater.position.y = 0.035; root.add(riverWater);
  const quay = new THREE.Mesh(river.banks, new THREE.MeshStandardMaterial({ color: '#bdb39f', roughness: 0.95 })); quay.receiveShadow = quality !== 'low'; root.add(quay);
  if (plan.riverBridges.length) {
    const rb = new THREE.InstancedMesh(st.riverBridge, solid, plan.riverBridges.length);
    plan.riverBridges.forEach((b, i) => { q.setFromAxisAngle(up, b.rotY); m4.compose(pos.set(b.x, heightAt(b.x, b.z), b.z), q, sc.set(b.w / 6.4, 1, 1)); rb.setMatrixAt(i, m4); });
    rb.computeBoundingSphere(); root.add(rb); stats.instancedMeshes++;
  }
  const seaWall = new THREE.Mesh(st.quay, solid); seaWall.receiveShadow = quality !== 'low'; root.add(seaWall);
  const wall = new THREE.Mesh(st.wall, solid); wall.name = 'cityWall'; wall.castShadow = quality === 'high'; wall.receiveShadow = quality !== 'low'; root.add(wall);
  // (Countryside hills are part of the terrain height field now; no separate dome meshes.)
  // Distant mountain range: one smooth-shaded ring of ridged peaks, colours pre-hazed for aerial perspective.
  const peaks = new THREE.Mesh(st.mountains, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, fog: false }));
  peaks.name = 'mountains'; peaks.matrixAutoUpdate = false; root.add(peaks);
  // Clouds and bird flocks (none on low).
  const sky = buildSky({ quality, radius: 1500 });
  if (sky) root.add(sky);

  // Ambient life and night lights.
  const life = buildLife(plan, solid, { quality });
  if (life) { root.add(life); stats.movers = life.userData.life.count; }
  const night = buildNightLights(plan, placed, claimedLots);
  root.add(night);

  // Wonders: district anchors, each on a paved pad that hides the roads under it.
  const pad = new THREE.MeshStandardMaterial({ color: '#d6cdb6', roughness: 0.95 });
  // Wonders share one clone of the solid material that is floodlit at night: warm light washing up from the base.
  const wonderMat = solid.clone(), flood = { value: 0 };
  wonderMat.userData.flood = true;
  wonderMat.customProgramCacheKey = () => 'city-wonder-flood-v1';
  wonderMat.onBeforeCompile = (sh) => {
    sh.uniforms.uFlood = flood;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vFloodY;').replace('#include <project_vertex>', '#include <project_vertex>\nvFloodY = (modelMatrix * vec4(transformed, 1.0)).y - modelMatrix[3].y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFlood;\nvarying float vFloodY;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.82, 0.58) * uFlood * (0.05 + 0.34 * exp(-max(vFloodY, 0.0) / 30.0));');
  };
  const wonders = [];
  for (const w of plan.wonders) {
    const parts = wonderParts(w.kind, quality === 'low'); if (!parts || !parts.solid) continue;
    const g = new THREE.Group(); g.position.set(w.x, w.kind === 'lighthouse' || w.kind === 'colossus' ? 0 : heightAt(w.x, w.z), w.z); g.rotation.y = w.rotY;
    if (w.kind !== 'lighthouse' && w.kind !== 'colossus') {
    const base2 = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(Math.sin(w.rotY)) > 0.5 ? w.d : w.w, 0.08, Math.abs(Math.sin(w.rotY)) > 0.5 ? w.w : w.d), pad); base2.scale.y = 30; base2.position.y = -1.1; base2.receiveShadow = quality !== 'low'; g.add(base2);
    }
    const body = new THREE.Mesh(parts.solid, wonderMat); body.castShadow = quality === 'high'; body.receiveShadow = quality === 'high'; g.add(body);
    const meshes = [body];
    if (parts.glass) { const glass = new THREE.Mesh(parts.glass, cityMaterial('glass')); g.add(glass); meshes.push(glass); }
    const info = { wonder: true, id: w.id, name: parts.name || w.name, dept: '奇观 · ' + ({ chinese: '宫城', greek: '希腊学园', roman: '罗马工程区', modern: '现代都会', harbour: '港口' }[w.district] || ''), state: '', label: '' };
    for (const m of meshes) { m.userData.info = info; pickables.push(m); }
    root.add(g);
    wonders.push({ id: w.id, name: info.name, group: g, height: parts.height || 20, radius: parts.radius || 20, x: w.x, z: w.z });
    stats.wonders.push({ id: w.id, name: info.name, triangles: Math.round(parts.solid.getAttribute('position').count / 3 + (parts.glass ? parts.glass.getAttribute('position').count / 3 : 0)) });
  }

  if (quality !== 'low') {
    for (const lot of plan.lots) {
      if (lot.kind === 'factory' || lot.kind === 'silos') stats.chimneys.push({ x: lot.x, z: lot.z, kind: lot.kind });
      if (lot.kind === 'pier' || (lot.style === 'harbour' && lot.kind === 'pier')) stats.piers.push({ x: lot.x, z: lot.z });
    }
  }

  scene.add(root);
  // Per frame: refresh LOD/culling of the batches (only does work when the camera moved) and animate life.
  let lodScale = 1, elapsed = 0, nightOn = false;
  function update(camera, dt) {
    elapsed += dt;
    for (const b of batches) { b.userData.lod.setScale(lodScale); b.userData.lod.update(camera); }
    if (life) life.userData.life.update(dt, camera);
    if (sky) sky.userData.update(dt, elapsed);
    updateWater(elapsed, nightOn);
  }
  function setNight(on) {
    nightOn = !!on; night.visible = nightOn; fillerMat.userData.uniforms.uNight.value = nightOn ? 1 : 0; flood.value = nightOn ? 1 : 0;
    if (sky) sky.userData.setNight(nightOn);
  }
  // Free everything this build created on the GPU (shared geometry/material caches stay for the next build).
  function dispose() {
    const keep = new Set([solid, cityMaterial('glass'), cityMaterial('water')]);
    const shared = new Set(Object.values(st).flatMap((v) => (v && v.isBufferGeometry ? [v] : v && typeof v === 'object' ? Object.values(v).filter((x) => x && x.isBufferGeometry) : [])));
    for (const r of st.roads) shared.add(r.geo);
    for (const g of st.patches.values()) shared.add(g);
    root.traverse((o) => {
      if (o.isBatchedMesh || o.isInstancedMesh) o.dispose();
      else if (o.geometry && !shared.has(o.geometry) && !o.userData.sharedGeometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) if (!keep.has(m)) m.dispose();
    });
    if (sky) sky.userData.dispose();
    disposeWater();
    scene.remove(root);
  }
  function lodStats() { return Object.fromEntries(batches.map((b) => [b.name, b.userData.lod.stats()])); }
  return { root, plan, wonders, update, setNight, lodStats, dispose, setLodScale: (k) => { lodScale = k; }, stats: { ...stats, fillerKinds: [...stats.fillerKinds] } };
}
