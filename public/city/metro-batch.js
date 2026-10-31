// Distance-LOD batches: every filler building / street prop of the metropolis lives in a THREE.BatchedMesh
// (one multi-draw call per batch; three falls back to one draw per instance without WEBGL_multi_draw).
// We cull per instance ourselves (range + frustum, recomputed only when the camera moves), so three's own
// per-object culling and sorting are switched off. Items with a far stand-in own two instances (full model and
// proxy) that cross-fade with a screen-door dither, and everything dithers out at the edge of its range, so
// nothing pops. The fade value rides in the alpha channel of BatchedMesh's per-instance colour texture.
import * as THREE from 'three';
import { createGeo } from './geo.js';

const ATTRS = { position: 3, normal: 3, uv: 2, color: 3, surf: 1 };
// Surface codes read by the batch shader: 0 plain, 1 facade with windows (proxies), 2 roof tiles, 3 stone/plaster courses.
export const SURF = { plain: 0, windows: 1, tiles: 2, courses: 3 };

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3();

// Per-triangle surface classification for the detail shader ('none' | 'detail' for full models | 'proxy').
function surfaceCodes(g, mode) {
  const pos = g.getAttribute('position'), n = pos.count, out = new Float32Array(n);
  if (mode === 'none') return out;
  for (let i = 0; i + 2 < n; i += 3) {
    _a.fromBufferAttribute(pos, i); _b.fromBufferAttribute(pos, i + 1); _c.fromBufferAttribute(pos, i + 2);
    _n.subVectors(_c, _b).cross(_b.clone().sub(_a));
    const area = _n.length() / 2; if (!area) continue;
    const ny = Math.abs(_n.y / (area * 2));
    const tall = Math.max(_a.y, _b.y, _c.y) - Math.min(_a.y, _b.y, _c.y);
    let code = 0;
    if (mode === 'proxy') code = ny < 0.3 ? SURF.windows : ny < 0.97 ? SURF.tiles : 0;
    else if (ny < 0.25 && area > 0.45 && tall > 0.55) code = SURF.courses;
    else if (ny >= 0.25 && ny < 0.95 && area > 0.12) code = SURF.tiles;
    out[i] = out[i + 1] = out[i + 2] = code;
  }
  return out;
}

// Make a geometry compatible with every other one in a batch: non-indexed with exactly position/normal/uv/color/surf.
export function normalizeGeometry(geo, surface = 'none') {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (!(name in ATTRS)) g.deleteAttribute(name);
  const n = g.getAttribute('position').count;
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.getAttribute('color')) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  if (!g.getAttribute('surf')) g.setAttribute('surf', new THREE.BufferAttribute(surfaceCodes(g, surface), 1));
  for (const [name, size] of Object.entries(ATTRS)) {
    const a = g.getAttribute(name);
    if (a.itemSize !== size || a.normalized || !(a.array instanceof Float32Array)) {
      const out = new Float32Array(n * size);
      for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) out[i * size + k] = k < a.itemSize ? a.getComponent(i, k) : 0;
      g.setAttribute(name, new THREE.BufferAttribute(out, size));
    }
  }
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

// Kind-aware stand-in for a filler seen from afar (~24-70 triangles): a wall-coloured block at eave height, the
// roof shape the model actually has (gable / hip / flat with a rooftop box) in its roof colour, and a tower block
// when the model has one. Walls carry the window code so the shader paints storeys of windows on them.
export function proxyGeometry(geo) {
  const pos = geo.getAttribute('position'), col = geo.getAttribute('color');
  const box = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
  const H = Math.max(0.3, box.max.y);
  const wall = [0, 0, 0, 0], roof = [0, 0, 0, 0], tops = [];
  let slopeA = 0, flatA = 0;
  const wb = new THREE.Box3();
  for (let i = 0; i + 2 < pos.count; i += 3) {
    _a.fromBufferAttribute(pos, i); _b.fromBufferAttribute(pos, i + 1); _c.fromBufferAttribute(pos, i + 2);
    _n.subVectors(_c, _b).cross(_b.clone().sub(_a));
    const area = _n.length() / 2; if (area < 1e-5) continue;
    const ny = _n.y / (area * 2), cy = (_a.y + _b.y + _c.y) / 3, top = Math.max(_a.y, _b.y, _c.y);
    const r = (col.getX(i) + col.getX(i + 1) + col.getX(i + 2)) / 3, g = (col.getY(i) + col.getY(i + 1) + col.getY(i + 2)) / 3, b = (col.getZ(i) + col.getZ(i + 1) + col.getZ(i + 2)) / 3;
    if (Math.abs(ny) < 0.3 && cy > 0.15) {
      wall[0] += r * area; wall[1] += g * area; wall[2] += b * area; wall[3] += area;
      tops.push([top, area]); wb.expandByPoint(_a).expandByPoint(_b).expandByPoint(_c);
    } else if (ny > 0.3 && cy > H * 0.3) {
      roof[0] += r * area; roof[1] += g * area; roof[2] += b * area; roof[3] += area;
      if (ny < 0.96) slopeA += area; else flatA += area;
    }
  }
  const avg = (a, fb) => (a[3] ? new THREE.Color(a[0] / a[3], a[1] / a[3], a[2] / a[3]) : fb);
  const wallC = avg(wall, new THREE.Color(0xcfc6b2)), roofC = avg(roof, wallC.clone().multiplyScalar(0.78));
  // Eave = area-weighted 75th percentile of wall tops (ignores spires and chimneys).
  tops.sort((p, q) => p[0] - q[0]);
  let acc = 0, eave = H * 0.7; const total = tops.reduce((s, t) => s + t[1], 0);
  for (const [t, a] of tops) { acc += a; if (acc >= total * 0.75) { eave = t; break; } }
  eave = Math.min(Math.max(eave, H * 0.35), H);
  if (wb.isEmpty()) wb.copy(box);
  const w = Math.max(0.6, (wb.max.x - wb.min.x) * 0.96), d = Math.max(0.6, (wb.max.z - wb.min.z) * 0.96);
  const cx = (wb.max.x + wb.min.x) / 2, cz = (wb.max.z + wb.min.z) / 2;
  const g = createGeo();
  const tall = H / Math.max(w, d) > 2.2;
  const tower = !tall && H > 3 && H > eave * 1.7;
  const roofTop = tower ? Math.min(H, eave * 1.45) : H;
  g.box(w, eave, d, cx, 0, cz, wallC.getHex());
  const rh = roofTop - eave;
  if (tall || rh < 0.25 || flatA > slopeA * 1.6) {
    g.box(w * 1.02, 0.14, d * 1.02, cx, eave, cz, roofC.getHex());
    if (rh > 0.4) g.box(w * 0.34, Math.min(rh, eave * 0.15 + 0.4), d * 0.34, cx + w * 0.12, eave + 0.14, cz - d * 0.1, wallC.clone().multiplyScalar(0.9).getHex());
  } else if (Math.max(w, d) / Math.min(w, d) > 1.35) {
    if (w >= d) g.gable(w * 1.04, rh, d * 1.1, cx, eave, cz, roofC.getHex());
    else g.gable(d * 1.04, rh, w * 1.1, cx, eave, cz, roofC.getHex(), { ry: Math.PI / 2 });
  } else g.hip(w * 1.1, d * 1.1, rh, cx, eave, cz, roofC.getHex());
  if (tower) {
    const tw = Math.max(0.8, Math.min(w, d) * 0.32), th = H - roofTop;
    g.box(tw, th * 0.8 + (roofTop - eave), tw, cx, eave, cz, wallC.getHex());
    g.hip(tw * 1.25, tw * 1.25, th * 0.2 + 0.3, cx, eave + th * 0.8 + (roofTop - eave), cz, roofC.getHex());
  }
  return normalizeGeometry(g.build(), 'proxy');
}

// Far stand-in for a tree: one low-poly canopy blob in the average leaf colour, ~16 triangles.
export function treeProxyGeometry(geo) {
  const pos = geo.getAttribute('position'), col = geo.getAttribute('color');
  const box = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
  const h = Math.max(0.5, box.max.y), cut = h * 0.35, acc = [0, 0, 0, 0];
  for (let i = 0; i < pos.count; i += 3) if (pos.getY(i) > cut) { acc[0] += col.getX(i); acc[1] += col.getY(i); acc[2] += col.getZ(i); acc[3]++; }
  const leaf = acc[3] ? new THREE.Color(acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3]) : new THREE.Color(0x5d8a3c);
  const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const g = createGeo();
  g.raw(new THREE.OctahedronGeometry(0.5, 0), leaf.getHex(), 0, cut + (h - cut) * 0.5, 0, { sx: w, sy: h - cut, sz: w });
  g.box(w * 0.12, cut, w * 0.12, 0, 0, 0, 0x6b4a2f);
  return normalizeGeometry(g.build());
}

// The batch material: a clone of the city's solid material whose shader reads the per-instance fade (dither) and,
// when `detail` is on, paints procedural roof tiles, stone courses and (on proxies) lit/unlit windows.
export function createBatchMaterial(base, { detail = false } = {}) {
  const m = base.clone();
  const uniforms = { uNight: { value: 0 } };
  m.userData.uniforms = uniforms;
  m.customProgramCacheKey = () => 'city-batch-v2-' + (detail ? 'd' : 'p');
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = uniforms.uNight;
    shader.vertexShader = shader.vertexShader
      .replace('#include <batching_pars_vertex>', `#include <batching_pars_vertex>
varying float vFade;
${detail ? 'attribute float surf;\nvarying float vSurf;\nvarying vec3 vSurfW;' : ''}
#ifdef USE_BATCHING_COLOR
float cityBatchAlpha( const in float i ) {
  int size = textureSize( batchingColorTexture, 0 ).x;
  int j = int( i );
  return texelFetch( batchingColorTexture, ivec2( j % size, j / size ), 0 ).a;
}
#endif`)
      .replace('#include <color_vertex>', `#include <color_vertex>
#ifdef USE_BATCHING_COLOR
  vFade = cityBatchAlpha( getIndirectIndex( gl_DrawID ) );
#else
  vFade = 1.0;
#endif`)
      .replace('#include <project_vertex>', `#include <project_vertex>
${detail ? `  vSurf = surf;
  vec4 sw = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  sw = batchingMatrix * sw;
#endif
  vSurfW = ( modelMatrix * sw ).xyz;` : ''}`);
    let frag = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vFade;
uniform float uNight;
float cityBayer( vec2 p ) {
  ivec2 q = ivec2( mod( p, 4.0 ) );
  int i = q.x + q.y * 4;
  float m[16] = float[16]( 0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5. );
  return ( m[i] + 0.5 ) / 16.0;
}
${detail ? `varying float vSurf;
varying vec3 vSurfW;
float cityHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float cityLine( float v, float width ) { float f = abs( fract( v ) - 0.5 ); float w = fwidth( v ); return ( 1.0 - smoothstep( 0.5 - width - w, 0.5 - width + w, 0.5 - f ) ) * clamp( 1.0 - w * 1.6, 0.0, 1.0 ); }` : ''}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  if ( vFade < 0.999 ) { float th = cityBayer( gl_FragCoord.xy ); if ( vFade >= 0.0 ? th >= vFade : th < -vFade ) discard; }`);
    if (detail) {
      frag = frag
        .replace('#include <color_fragment>', `#include <color_fragment>
  float cityWin = 0.0;
  if ( vSurf > 0.5 ) {
    vec3 fn = normalize( cross( dFdx( vSurfW ), dFdy( vSurfW ) ) );
    vec3 tg = normalize( vec3( -fn.z, 0.0, fn.x ) + 1e-5 );
    float u = dot( vSurfW, tg );
    if ( vSurf < 1.5 ) {
      // Proxy facade: storeys of windows, a darker plinth.
      vec2 cell = vec2( u / 1.35, ( vSurfW.y - 0.25 ) / 1.3 );
      vec2 f = fract( cell );
      vec2 fw = fwidth( cell );
      float aa = clamp( 1.0 - max( fw.x, fw.y ) * 1.2, 0.0, 1.0 );
      float win = step( 0.32, f.x ) * step( f.x, 0.68 ) * step( 0.3, f.y ) * step( f.y, 0.78 ) * step( 0.9, vSurfW.y );
      diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.17, 0.2, 0.25 ), win * 0.62 * aa + ( 1.0 - aa ) * 0.12 * step( 0.9, vSurfW.y ) );
      diffuseColor.rgb *= 1.0 - 0.14 * ( 1.0 - smoothstep( 0.2, 0.7, vSurfW.y ) );
      cityWin = win * step( 0.55, cityHash( floor( cell ) + floor( vSurfW.xz / 23.0 ) ) ) * max( aa, 0.35 );
    } else if ( vSurf < 2.5 ) {
      // Roof tiles: courses down the slope, staggered joints.
      float v = vSurfW.y * 5.5;
      float row = floor( v );
      float joint = cityLine( u * 2.6 + row * 0.5, 0.06 );
      float course = cityLine( v, 0.1 );
      diffuseColor.rgb *= 1.0 - 0.2 * course - 0.1 * joint;
      diffuseColor.rgb *= 0.95 + 0.1 * cityHash( vec2( floor( u * 2.6 + row * 0.5 ), row ) );
    } else {
      // Masonry / plaster courses, weathering and ground grime.
      float v = vSurfW.y * 2.4;
      float row = floor( v );
      float course = cityLine( v, 0.035 );
      float joint = cityLine( u * 1.25 + row * 0.5, 0.025 );
      float near = 1.0 - smoothstep( 40.0, 120.0, length( vViewPosition ) );
      diffuseColor.rgb *= 1.0 - near * ( 0.08 * course + 0.06 * joint );
      diffuseColor.rgb *= 1.0 + near * 0.05 * ( cityHash( vec2( floor( u * 1.25 + row * 0.5 ), row ) ) - 0.5 );
      diffuseColor.rgb *= 1.0 - 0.13 * ( 1.0 - smoothstep( 0.05, 0.9, vSurfW.y ) );
    }
  }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += cityWin * uNight * vec3( 1.0, 0.72, 0.38 ) * 1.6;`);
    }
    shader.fragmentShader = frag;
  };
  return m;
}

// A batch of instances drawn with one material. geometry() registers shapes, instance() places them, finish() builds.
export function createLodBatch(material, { name = 'batch', castShadow = false, receiveShadow = false, surface = 'none' } = {}) {
  const geos = [], geoIndex = new Map(), items = [];
  const api = {
    // Register a geometry under key (once); returns a handle used by instance(). withProxy: true (building proxy),
    // a function (custom proxy builder) or false.
    geometry(key, make, withProxy = false) {
      if (geoIndex.has(key)) return geoIndex.get(key);
      let g = null;
      try { g = make(); } catch (error) { console.warn('batch geometry failed', key, error); }
      if (!g || !g.getAttribute || !g.getAttribute('position') || !g.getAttribute('position').count) { geoIndex.set(key, null); return null; }
      const near = normalizeGeometry(g, surface);
      const handle = { near: geos.push(near) - 1, far: -1, radius: near.boundingSphere.radius };
      if (withProxy) {
        let far = null;
        try { far = typeof withProxy === 'function' ? withProxy(near) : proxyGeometry(near); } catch (error) { console.warn('batch proxy failed', key, error); }
        if (far) handle.far = geos.push(normalizeGeometry(far, 'none')) - 1;
      }
      geoIndex.set(key, handle);
      return handle;
    },
    // Add an instance: matrix (THREE.Matrix4), colour (THREE.Color or null), max draw distance, and the distance
    // around which it cross-fades to its proxy (Infinity = never).
    instance(handle, matrix, color, maxDist, proxyDist = Infinity) {
      if (!handle) return -1;
      const e = matrix.elements;
      const s = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
      items.push({ handle, matrix: matrix.clone(), color: color ? color.clone() : null, maxDist, proxyDist, x: e[12], y: e[13] + handle.radius * s * 0.5, z: e[14], r: handle.radius * s });
      return items.length - 1;
    },
    get count() { return items.length; },
    finish() {
      if (!items.length) return null;
      const used = new Set();
      let instances = 0;
      for (const it of items) {
        used.add(it.handle.near); instances++;
        if (it.handle.far >= 0 && it.proxyDist < Infinity) { used.add(it.handle.far); instances++; }
      }
      let verts = 0;
      for (const i of used) verts += geos[i].getAttribute('position').count;
      const mesh = new THREE.BatchedMesh(instances, verts, 0, material);
      mesh.name = name;
      mesh.perObjectFrustumCulled = false;
      mesh.sortObjects = false;
      mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
      const ids = new Map();
      for (const i of used) ids.set(i, mesh.addGeometry(geos[i]));
      const n = items.length;
      const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n), pr = new Float32Array(n);
      const maxD = new Float32Array(n), proxyD = new Float32Array(n), nearInst = new Int32Array(n), farInst = new Int32Array(n).fill(-1);
      // Current fade level of each instance in 1/16 steps: 0 hidden, 16 opaque, negative = proxy complement.
      const level = new Int8Array(instances);
      const white = new THREE.Color(1, 1, 1);
      items.forEach((it, k) => {
        const id = mesh.addInstance(ids.get(it.handle.near));
        mesh.setMatrixAt(id, it.matrix); mesh.setColorAt(id, it.color || white); mesh.setVisibleAt(id, false);
        nearInst[k] = id;
        if (it.handle.far >= 0 && it.proxyDist < Infinity) {
          const fid = mesh.addInstance(ids.get(it.handle.far));
          mesh.setMatrixAt(fid, it.matrix); mesh.setColorAt(fid, it.color || white); mesh.setVisibleAt(fid, false);
          farInst[k] = fid;
        }
        px[k] = it.x; py[k] = it.y; pz[k] = it.z; pr[k] = it.r; maxD[k] = it.maxDist; proxyD[k] = farInst[k] >= 0 ? it.proxyDist : Infinity;
      });
      mesh.computeBoundingBox(); mesh.computeBoundingSphere();
      geos.length = 0; items.length = 0;
      const colors = mesh._colorsTexture;
      const data = colors.image.data;
      const frustum = new THREE.Frustum(), m = new THREE.Matrix4(), last = new THREE.Matrix4(), camPos = new THREE.Vector3();
      let scale = 1, lastScale = -1, visibleCount = 0, proxyCount = 0, fading = 0, alphaDirty = false;
      // Set one instance to fade level lv (0 hidden .. 16 opaque; negative: proxy keeps the complement of -lv).
      const setLevel = (id, lv) => {
        const prev = level[id];
        if (prev === lv) return;
        if (lv === 0) { mesh.setVisibleAt(id, false); }
        else {
          if (prev === 0) mesh.setVisibleAt(id, true);
          data[id * 4 + 3] = lv === 16 ? 1 : lv / 16; alphaDirty = true;
        }
        level[id] = lv;
      };
      mesh.userData.lod = {
        // The quality preset (and adaptive quality) can shrink or stretch every range at once.
        setScale(s) { scale = s; },
        update(camera) {
          m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
          if (m.equals(last) && scale === lastScale) return false;
          last.copy(m); lastScale = scale;
          frustum.setFromProjectionMatrix(m);
          camPos.setFromMatrixPosition(camera.matrixWorld);
          const planes = frustum.planes;
          visibleCount = 0; proxyCount = 0; fading = 0; alphaDirty = false;
          for (let k = 0; k < n; k++) {
            const dx = px[k] - camPos.x, dy = py[k] - camPos.y, dz = pz[k] - camPos.z;
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz), lim = maxD[k] * scale;
            let nearLv = 0, farLv = 0;
            if (d - pr[k] < lim) {
              let inside = true;
              for (let p = 0; p < 6; p++) { const pl = planes[p]; if (pl.normal.x * px[k] + pl.normal.y * py[k] + pl.normal.z * pz[k] + pl.constant < -pr[k] * 1.1) { inside = false; break; } }
              if (inside) {
                const edge = Math.min(16, Math.max(0, Math.round(((lim - d + pr[k]) / (lim * 0.08)) * 16)));
                const P = proxyD[k] * scale;
                if (P === Infinity) nearLv = edge;
                else {
                  const band = P * 0.14, t = (d - (P - band)) / (2 * band);
                  if (t <= 0) nearLv = edge;
                  else if (t >= 1) farLv = edge;
                  else { const keep = Math.min(15, Math.max(1, Math.round((1 - t) * 16))); nearLv = keep; farLv = -keep; }
                }
              }
            }
            setLevel(nearInst[k], nearLv);
            if (farInst[k] >= 0) setLevel(farInst[k], farLv);
            if (nearLv || farLv) { visibleCount++; if (farLv && !nearLv) proxyCount++; if (nearLv && farLv) fading++; }
          }
          if (alphaDirty) colors.needsUpdate = true;
          return true;
        },
        stats: () => ({ instances: n, visible: visibleCount, proxies: proxyCount, fading }),
      };
      return mesh;
    },
  };
  return api;
}
