// 帝国之城 scene (ported from the Empire City prototype for TaoAgent): renderer, camera framing, city assembly from the roster, state visuals, messengers.
// Empire City scene: renderer, camera framing, city assembly from the roster, state visuals, messengers.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { computeCity, approachRoute, PLAZA_R, ROAD_W, ROAD_MID, PLOT, polar, ringRadius, STYLE_ANGLE } from './layout.js';
import { buildChinese, buildImperialHall } from './styles-chinese.js';
import { buildGreek } from './styles-greek.js';
import { buildRoman, buildAqueduct } from './styles-roman.js';
import { buildModern, buildSkyline } from './styles-modern.js';
import { buildGround, buildPlaza, buildStreet, buildReservedPlot, buildStele, buildTree, buildPine } from './decor.js';
import { createSmoke, createFireworks } from './effects.js';
import { buildMetropolis } from './metropolis.js';
import { bakeStatic } from './bake.js';
import { computeMetropolis, assignClaims, CANAL } from './metropolis-plan.js';
import { buildCharacter, applyVisual } from './characters.js';
import { CJK_FONT as CJK, textTexture } from './kit.js';

// Reusable per-style building generators: add a style here + in roster STYLES.
export const BUILDERS = { chinese: buildChinese, greek: buildGreek, roman: buildRoman, modern: buildModern };
export function buildForStyle(style, opts) { return (BUILDERS[style] || BUILDERS.roman)(opts); }

const FIG_SCALE = 1.8;
const HALL_SCALE = 0.8;
const WALK = 4.2;           // messenger speed m/s
const WIN_ON = new THREE.Color(0xffb84a);
const LANTERN_ON = new THREE.Color(0xff7a2e);
const NIGHT_WIN = new THREE.Color(0xffb35a);
const GREY = new THREE.Color(0x9c9c9c);
const TAG_PX = 24;

export function createCity(container, roster, opts = {}) {
  const lowPower = !!opts.lowPower;
  const shadows = !lowPower;
  const emperorDef = opts.emperor || { name: '你', color: '#d9a520' };
  const onPick = typeof opts.onPick === 'function' ? opts.onPick : null;
  const onAdaptive = typeof opts.onAdaptive === 'function' ? opts.onAdaptive : null;
  const quarterNames = opts.quarters || {};
  let nightOn = false;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'civ-canvas';
  renderer.info.autoReset = false;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const SKY = new THREE.Color('#dde6ee');
  const NIGHT_SKY = new THREE.Color('#1b2433');
  scene.background = SKY.clone();
  scene.fog = new THREE.Fog(SKY.clone(), 80, 260);
  const hemi = new THREE.HemisphereLight('#ffffff', '#b7c29c', 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3df', 1.75);
  sun.position.set(30, 55, 38);
  sun.castShadow = shadows;
  scene.add(sun, sun.target);

  const plan = computeMetropolis();
  const layout = computeCity(roster, { claim: (bots) => assignClaims(bots, plan) });
  const R = layout.outerR;          // agent core
  const CITY_R = plan.outerEdge || plan.outerR; // framed city (countryside fades beyond)
  if (shadows) {
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -R - 4, right: R + 4, top: R + 4, bottom: -R - 4, near: 1, far: 160 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  }

  // ---------- static city ----------
  // Static core decor is merged per material after building (bakeStatic) to save draw calls.
  const decor = new THREE.Group(); decor.name = 'coreDecor'; scene.add(decor);
  decor.add(buildGround({ radius: CITY_R + 90, shadows }));
  decor.add(buildPlaza({ radius: PLAZA_R, shadows }));
  const roadOut = PLAZA_R + ROAD_W;
  for (const p of layout.plots) {
    const a = polar(roadOut - 0.2, p.angle), b = polar(p.r - PLOT / 2 + 0.3, p.angle);
    decor.add(buildStreet({ from: a, to: b, width: 2.2 }));
  }
  // Roman aqueduct across the workshop quarter, between ring 1 and ring 2.
  {
    const mid = (ringRadius(1) + ringRadius(2)) / 2 + 1.6;
    const aq = buildAqueduct({ length: 10, height: 4.6, shadows });
    const p = polar(mid, STYLE_ANGLE.roman);
    aq.position.set(p.x, 0, p.z);
    aq.rotation.y = Math.atan2(-p.x, -p.z);
    decor.add(aq);
  }
  // Trees flanking the outer streets and pines in the plaza corners.
  let seed = 1;
  for (let i = 0; i < 6; i++) for (const s of [-9, 9]) {
    const t = buildTree({ seed: seed++, shadows }); const p = polar(ringRadius(1) + 1, i * 60 + s);
    t.position.set(p.x, 0, p.z); decor.add(t);
  }
  for (const ang of [135, 225]) { const t = buildPine({ seed: seed++, shadows }); const p = polar(PLAZA_R - 1.6, ang); t.position.set(p.x, 0, p.z); decor.add(t); }

  bakeStatic(decor);

  // Usage stele in the plaza (front-left of the hall, facing the camera side).
  const stele = buildStele({ shadows });
  stele.group.position.set(-5.2, 0, 7.4);
  stele.group.rotation.y = 0.35;
  stele.group.scale.setScalar(0.95);
  scene.add(stele.group);

  // Quarter names laid on the ground at the outer edge of each style's quarter.
  for (const [style, name] of Object.entries(quarterNames)) {
    if (!name || STYLE_ANGLE[style] === undefined) continue;
    const tex = textTexture([name], { w: 512, h: 128, fg: '#5b4a2e', font: 64 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    const p = polar(CANAL.outer + 9, STYLE_ANGLE[style] + 22);
    sign.scale.setScalar(1.8);
    sign.rotation.x = -Math.PI / 2; sign.rotation.z = 0;
    sign.position.set(p.x, 0.06, p.z);
    scene.add(sign);
  }

  const fireworks = createFireworks();
  scene.add(fireworks.object);

  // ---------- bots ----------
  const units = new Map();
  const pickables = [];
  const tags = [];
  let labelsOn = true, leadTag = null;
  const icons = [];
  function makeTag(name, color) {
    const short = String(name || '').split(' · ')[0].slice(0, 12);
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d');
    x.font = `600 58px ${CJK}`;
    const w = Math.min(500, x.measureText(short).width + 92);
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.beginPath(); x.roundRect((512 - w) / 2, 14, w, 100, 50); x.fill();
    x.fillStyle = color; x.beginPath(); x.arc((512 - w) / 2 + 44, 64, 17, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#25272b'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(short, (512 - w) / 2 + 72, 67);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false }));
    sp.renderOrder = 10;
    return sp;
  }
  function makeFigure(def, accessory, tagY = 1.75) {
    const f = buildCharacter({ ...def, accessory }, { shadows });
    f.root.scale.setScalar(FIG_SCALE);
    f.root.remove(f.tag);
    f.tag = makeTag(def.name, def.color);
    f.tag.position.set(0, tagY, 0);
    f.root.add(f.tag);
    tags.push(f.tag);
    scene.add(f.root);
    return f;
  }
  function addUnit(def, b, group, walkPoint, angle) {
    scene.add(group);
    group.updateMatrixWorld(true);
    // Merge the static parts of the building; the gate (toggled by state) stays separate. Shared materials keep lantern/window effects.
    const baked = bakeStatic(group, { keep: [b.gate].filter(Boolean) });
    if (baked.removed) b.meshes = [...baked.merged, ...b.meshes.filter((m) => m.parent)];
    const fig = makeFigure(def, def.accessory);
    const porch = group.localToWorld(b.porch.clone());
    fig.root.position.copy(porch);
    fig.root.rotation.y = group.rotation.y;
    const smoke = createSmoke();
    smoke.object.position.copy(group.localToWorld(new THREE.Vector3(0, b.roofY, 0)));
    smoke.setActive(false);
    scene.add(smoke.object);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.15, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color).lerp(new THREE.Color(0xffd27a), 0.35), transparent: true, opacity: 0.9, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.copy(porch).setY(porch.y + 0.04); halo.visible = false; scene.add(halo);
    for (const ic of [fig.waitIcon, fig.errIcon]) {
      // screen-constant status icon sitting just above the name tag
      ic.material.sizeAttenuation = false; ic.material.depthTest = false; ic.renderOrder = 11;
      ic.position.copy(fig.tag.position); ic.center.set(0.5, -0.4); icons.push(ic);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.6, 48), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.95, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(porch).setY(porch.y + 0.05); ring.visible = false; scene.add(ring);
    const u = { def, b, group, fig, porch, walkPoint, angle, smoke, halo, ring, state: undefined, label: '', phase: Math.random() * 6, selected: false };
    for (const o of [...b.meshes, ...fig.pickables]) { o.userData.unit = u; pickables.push(o); }
    units.set(def.id, u);
    return u;
  }
  if (layout.lead) {
    const b = buildImperialHall({ color: layout.lead.color, shadows });
    b.group.scale.setScalar(HALL_SCALE);
    const foot = b.stairFoot ? b.stairFoot.clone().multiplyScalar(HALL_SCALE) : new THREE.Vector3(0, 0, 7);
    leadTag = addUnit(layout.lead, b, b.group, [polar(ROAD_MID, 180), { x: foot.x, z: foot.z + 0.4 }], 180).fig.tag;
    // The Emperor at the top of the hall (decorative, not a bot).
    const emp = makeFigure({ id: 'emperor', name: emperorDef.name, color: emperorDef.color }, null, 2.45);
    const crown = buildCharacter({ name: '', color: emperorDef.color, accessory: 'crown' }, { shadows });
    const th = b.throne ? b.group.localToWorld(b.throne.clone()) : new THREE.Vector3(0, 1.5, 0);
    emp.root.position.copy(th);
    // reuse just the crown mesh group from the helper character
    const crownMesh = crown.arms[0].children.find((c) => c.isGroup);
    if (crownMesh) { crownMesh.position.set(0, 1.47, 0); emp.root.add(crownMesh); }
    for (const o of emp.pickables) { o.userData.info = { name: emperorDef.name, dept: 'Emperor', state: '', label: '' }; pickables.push(o); }
  }
  for (const p of layout.plots) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z); g.rotation.y = p.rotY;
    if (!p.bot) {
      const lot = buildReservedPlot({ shadows, label: '待建' });
      bakeStatic(lot);
      lot.traverse((o) => { if (o.isMesh) { o.userData.info = { reserved: true, name: '待建用地', dept: '新成员加入后自动建造', state: '', label: '' }; pickables.push(o); } });
      g.add(lot);
      scene.add(g);
      continue;
    }
    const b = buildForStyle(p.bot.style, { color: p.bot.color, shadows, variant: p.variant || 0 });
    g.add(b.group);
    addUnit(p.bot, b, g, approachRoute(p), p.angle);
  }
  // Agents beyond the 18 core plots move into claimable city lots (filler skipped there, building scaled to the lot).
  for (const p of layout.claimed || []) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z); g.rotation.y = p.rotY;
    const b = buildForStyle(p.bot.style, { color: p.bot.color, shadows, variant: p.variant || 0 });
    b.group.scale.setScalar(p.size / PLOT);
    g.add(b.group);
    addUnit(p.bot, b, g, approachRoute(p), p.angle);
  }
  const city = buildMetropolis(scene, { claimedLots: new Set((layout.claimed || []).map((p) => p.id)), quality: lowPower ? 'low' : opts.quality || 'medium', pickables });

  // ---------- night street lamps + chinese lanterns ----------
  const lamps = new THREE.Group(); lamps.name = 'lamps'; lamps.visible = false; scene.add(lamps);
  {
    const N = 40;
    const geo = new THREE.SphereGeometry(0.18, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffc27a });
    const inst = new THREE.InstancedMesh(geo, mat, N);
    const d = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const ring = i % 2 ? ROAD_MID : ringRadius(1);
      const off = (((i * 7919) % 17) / 17 - 0.5);
      const p = polar(ring + off, (i * 360) / N + (i % 2) * 4.5);
      d.position.set(p.x, 0.9, p.z);
      d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    lamps.add(inst);
  }
  const lanterns = new THREE.Group(); lanterns.name = 'lanterns'; lanterns.visible = false; scene.add(lanterns);
  {
    const centers = (plan.wonders || []).filter((w) => w.district === 'chinese');
    const anchor = centers.length ? centers : [(() => { const p = polar(60, STYLE_ANGLE.chinese); return { x: p.x, z: p.z, radius: 8 }; })()];
    const geo = new THREE.BoxGeometry(0.5, 0.7, 0.5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6a2e });
    let hash = 13;
    const rnd = () => ((hash = (hash * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 24; i++) {
      const c = anchor[i % anchor.length];
      const ang = rnd() * Math.PI * 2;
      const rr = (c.radius || 6) * (0.35 + rnd() * 0.6) + 1.2;
      const m = new THREE.Mesh(geo, mat);
      m.position.set((c.x || 0) + Math.cos(ang) * rr, 0.85, (c.z || 0) + Math.sin(ang) * rr);
      lanterns.add(m);
    }
  }

  // ---------- ambient life (skipped on low power) ----------
  function birdGeo() {
    const l = new THREE.BoxGeometry(0.46, 0.03, 0.1); l.rotateZ(Math.PI / 6); l.translate(0.05, 0, 0);
    const r = new THREE.BoxGeometry(0.46, 0.03, 0.1); r.rotateZ(-Math.PI / 6); r.translate(0.05, 0, 0);
    return mergeGeometries([l, r]);
  }
  function boatGeo() {
    const hull = new THREE.BoxGeometry(1.2, 0.18, 0.5);
    const cabin = new THREE.BoxGeometry(0.42, 0.24, 0.34); cabin.translate(0, 0.21, 0);
    return mergeGeometries([hull, cabin]);
  }
  let birds = null, birdDummy = null, boatMesh = null, boatDummy = null, birdsData = [], boatsData = [], chimneySmokes = [];
  if (!lowPower) {
    birdDummy = new THREE.Object3D();
    boatDummy = new THREE.Object3D();
    birds = new THREE.InstancedMesh(birdGeo(), new THREE.MeshBasicMaterial({ color: 0x3b434b }), 12);
    birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(birds);
    for (let i = 0; i < 12; i++) birdsData.push({ r: CITY_R * 0.55 + (i % 5) * 7, ang: (i / 12) * Math.PI * 2, ph: i * 1.3 });
    const piers = city.stats.piers || [];
    const boatCount = piers.length || 6;
    boatsData = piers.length ? piers.map((p) => ({ x: p.x ?? 0, z: p.z ?? 0 })) : Array.from({ length: boatCount }, (_, i) => { const p = polar(CANAL.outer - 2.5, (i * 360) / boatCount + 14); return { x: p.x, z: p.z }; });
    boatMesh = new THREE.InstancedMesh(boatGeo(), new THREE.MeshBasicMaterial({ color: 0x7a5a3a }), boatCount);
    boatMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(boatMesh);
    for (const ch of (city.stats.chimneys || []).slice(0, 20)) {
      const sm = createSmoke();
      sm.object.position.set(ch.x ?? 0, ch.roof ?? ch.roofY ?? 8, ch.z ?? 0);
      sm.setActive(true);
      scene.add(sm.object);
      chimneySmokes.push(sm);
    }
  }
  const water = (city.root && (city.root.userData.water || city.root.getObjectByName('water'))) || scene.getObjectByName('water');

  // ---------- state visuals ----------
  function setMatsGrey(u, grey) {
    for (const m of u.b.mats) {
      const o = m.userData.orig; if (!o) continue;
      m.color.copy(o.color);
      if (grey) m.color.lerp(GREY, 0.8).multiplyScalar(0.85);
    }
  }
  function applyWindows(u) {
    const working = u.state === 'working';
    for (const m of u.b.windowMats || []) {
      const o = m.userData.orig;
      if (working) { m.emissive.copy(WIN_ON); m.emissiveIntensity = 1.5; }
      else if (nightOn) { m.emissive.copy(NIGHT_WIN); m.emissiveIntensity = 0.55; }
      else if (o) { m.emissive.copy(o.emissive); m.emissiveIntensity = o.emissiveIntensity; }
    }
  }
  function apply(u, state, prev) {
    const working = state === 'working';
    applyWindows(u);
    if (u.b.lanternMat) {
      const o = u.b.lanternMat.userData.orig;
      if (state === 'waiting') { u.b.lanternMat.emissive.copy(LANTERN_ON); u.b.lanternMat.emissiveIntensity = 2.2; }
      else if (o) { u.b.lanternMat.emissive.copy(o.emissive); u.b.lanternMat.emissiveIntensity = o.emissiveIntensity; }
    }
    setMatsGrey(u, state === 'stale' || state === 'disconnected');
    u.halo.visible = working;
    if (u.b.gate) u.b.gate.visible = state === 'disconnected';
    u.smoke.setActive(state === 'error');
    applyVisual(u.fig, state);
    // rest pose unless working
    if (!working) { u.fig.arms.forEach((a) => (a.rotation.x = 0)); u.fig.legs.forEach((l) => (l.rotation.x = 0)); u.fig.root.position.y = u.porch.y; }
    if (state === 'completed' && prev !== undefined && prev !== 'completed') {
      const top = u.smoke.object.position.clone(); top.y += 1;
      fireworks.burst(top, { count: 3 });
    }
  }
  function setBots(list) {
    for (const s of list || []) {
      const u = units.get(s.id); if (!u) continue;
      const prev = u.state;
      u.label = s.label || '';
      if (prev === s.state) continue;
      u.state = s.state;
      apply(u, s.state, prev);
    }
  }

  // ---------- messengers (handoff) ----------
  const messengers = [];
  function routeAngle(u) { return u.angle; }
  function handoff(fromId, toId) {
    const a = units.get(fromId), b = units.get(toId);
    if (!a || !b || a === b) return false;
    const V = (q) => new THREE.Vector3(q.x, 0, q.z);
    const pts = a.walkPoint.slice(1).reverse().map(V);
    const ra = routeAngle(a), rb = routeAngle(b);
    let d = ((rb - ra + 540) % 360) - 180; // shortest signed arc
    const steps = Math.max(1, Math.ceil(Math.abs(d) / 8));
    for (let i = 0; i <= steps; i++) { const p = polar(ROAD_MID, ra + (d * i) / steps); pts.push(new THREE.Vector3(p.x, 0, p.z)); }
    for (const q of b.walkPoint.slice(1)) pts.push(V(q));
    let m = messengers.find((x) => !x.active);
    if (!m) {
      const f = buildCharacter({ name: '', color: '#c8a26a', accessory: 'scroll' }, { shadows });
      f.tag.visible = false; f.root.scale.setScalar(FIG_SCALE * 0.85); scene.add(f.root);
      m = { f, active: false };
      messengers.push(m);
    }
    m.f.mats[0].color.set(a.def.color);
    Object.assign(m, { active: true, pts, seg: 0, segT: 0, hold: 0, phase: 0, from: fromId, to: toId });
    m.f.root.visible = true; m.f.root.position.copy(pts[0]);
    return true;
  }
  function updateMessengers(dt) {
    for (const m of messengers) {
      if (!m.active) continue;
      if (m.hold > 0) { m.hold -= dt; if (m.hold <= 0) { m.active = false; m.f.root.visible = false; } continue; }
      let move = WALK * dt;
      while (move > 0 && m.seg < m.pts.length - 1) {
        const p = m.f.root.position, q = m.pts[m.seg + 1];
        const dx = q.x - p.x, dz = q.z - p.z, dist = Math.hypot(dx, dz);
        if (dist > 1e-4) m.f.root.rotation.y = Math.atan2(dx, dz);
        if (dist <= move) { p.set(q.x, 0, q.z); move -= dist; m.seg++; }
        else { p.x += (dx / dist) * move; p.z += (dz / dist) * move; move = 0; }
      }
      m.phase += dt * 9;
      const sw = Math.sin(m.phase) * 0.6;
      m.f.legs[0].rotation.x = sw; m.f.legs[1].rotation.x = -sw;
      m.f.arms[1].rotation.x = -sw; m.f.arms[0].rotation.x = -0.9; // scroll held up front
      if (m.seg >= m.pts.length - 1) { m.hold = 1.4; m.f.legs.forEach((l) => (l.rotation.x = 0)); m.f.arms[0].rotation.x = -1.4; }
    }
  }

  // ---------- camera framing ----------
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 2400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.44; controls.minDistance = 12;
  controls.screenSpacePanning = true;
  let userMoved = false;
  controls.addEventListener('start', () => { userMoved = true; tween = null; stopTour(); });
  let tween = null; // { pos, target } camera glide destination
  const framePts = [];
  for (let i = 0; i < 24; i++) { const p = polar(CITY_R - 6, i * 15); framePts.push(new THREE.Vector3(p.x, 0, p.z)); }
  for (const w of city.wonders) framePts.push(new THREE.Vector3(w.x, Math.min(w.height, 40), w.z));
  for (const u of units.values()) { const top = u.smoke.object.position; framePts.push(top.clone()); }
  function fit() {
    const aspect = camera.aspect;
    const pitch = THREE.MathUtils.degToRad(aspect < 0.8 ? 60 : 47);
    const dir = new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch));
    const target = new THREE.Vector3(0, 0, 0);
    const box = { x0: -0.94, x1: 0.94, y0: aspect < 0.8 ? -0.68 : -0.8, y1: aspect < 0.8 ? 0.78 : 0.84 };
    const v = new THREE.Vector3();
    const project = (dist) => {
      camera.position.copy(target).addScaledVector(dir, dist); camera.lookAt(target); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of framePts) { v.copy(p).project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      return { x0, x1, y0, y1 };
    };
    let dist = 60;
    for (let it = 0; it < 4; it++) {
      let lo = 10, hi = 600;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2, bb = project(mid);
        const sx = (bb.x1 - bb.x0) / (box.x1 - box.x0), sy = (bb.y1 - bb.y0) / (box.y1 - box.y0);
        if (Math.max(sx, sy) > 1) lo = mid; else hi = mid;
      }
      dist = hi;
      const bb = project(dist);
      // shift target so the projected bbox is centered in the allowed box (screen-space)
      const cy = (bb.y0 + bb.y1) / 2 - (box.y0 + box.y1) / 2;
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      target.addScaledVector(up, cy * halfH);
      target.y = Math.max(target.y, -2);
    }
    camera.position.copy(target).addScaledVector(dir, dist); camera.lookAt(target);
    controls.target.copy(target); controls.maxDistance = dist * 1.8; controls.update();
    scene.fog.near = dist * 1.0; scene.fog.far = dist * 2.6;
  }

  let composer = null;
  function rebuildComposer(want) {
    if (composer) { composer.dispose?.(); composer = null; }
    if (!want || lowPower) return;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(el.clientWidth || 1, el.clientHeight || 1), 0.22, 0.5, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.setSize(el.clientWidth || 1, el.clientHeight || 1);
  }
  // Bloom is optional spectacle for night on high quality only (software GL often blacks out with bloom).
  if (!lowPower && opts.quality === 'high' && opts.night) rebuildComposer(true);

  // ---------- spectacle: wonder flash, tour, minimap ----------
  const flashes = [];
  let pendingFlash = null;
  function flashAt(pos) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.2, 48), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos); if (ring.position.y < 0.2) ring.position.y = 0.2;
    scene.add(ring);
    flashes.push({ ring, t: 0 });
  }
  let tour = null;
  function startTourLeg() {
    if (!tour || !tour.way.length) return;
    const wp = tour.way[tour.i];
    tour.target = wp.pos.clone();
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); dir.normalize();
    tour.camPos = wp.pos.clone().addScaledVector(dir, wp.dist);
    tour.arriveFired = false;
  }
  function tourWonders() {
    const way = city.wonders.map((w) => ({ pos: new THREE.Vector3(w.x, Math.min(w.height, 60) * 0.35, w.z), dist: Math.max(55, (w.radius || 8) * 3.1, Math.min(w.height || 20, 120) * 1.5) }));
    if (!way.length) return;
    tour = { way, i: 0, dwell: 0, paused: false, arriveFired: false };
    userMoved = true; tween = null;
    startTourLeg();
  }
  function tourAgents() {
    const way = [...units.values()].map((u) => ({ pos: u.porch.clone().setY(1.5), dist: 34 }));
    if (!way.length) return;
    tour = { way, i: 0, dwell: 0, paused: false, arriveFired: false };
    userMoved = true; tween = null;
    startTourLeg();
  }
  function stopTour() { tour = null; }
  let selected = new Set();
  let minimapCanvas = null, minimapOn = false, minimapTick = 0;
  function stateColor(s) {
    if (s === 'working') return '#ffb84a';
    if (s === 'waiting') return '#ff7a2e';
    if (s === 'error') return '#e5484d';
    if (s === 'completed') return '#46a758';
    if (s === 'stale' || s === 'disconnected') return '#9c9c9c';
    return null;
  }
  function drawMinimap() {
    if (!minimapCanvas || !minimapOn) return;
    const c = minimapCanvas;
    const w = c.width || c.clientWidth, h = c.height || c.clientHeight;
    if (!w || !h) return;
    const g = c.getContext('2d'); if (!g) return;
    const R = CITY_R;
    const sx = (x) => (x / R * 0.5 + 0.5) * w;
    const sy = (z) => (-z / R * 0.5 + 0.5) * h;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#c9d2d9'; g.fillRect(0, 0, w, h);
    const zoneColors = { chinese: '#c65a48', greek: '#5b8def', roman: '#9b59b6', modern: '#16a085', core: '#e2d7b8', water: '#5b8db0' };
    for (const lot of plan.lots || []) {
      const zone = lot.district || lot.zone || 'core';
      g.fillStyle = zoneColors[zone] || '#d8d0bd';
      g.beginPath(); g.arc(sx(lot.x), sy(lot.z), 2.2, 0, Math.PI * 2); g.fill();
    }
    for (const [id, u] of units) {
      g.fillStyle = stateColor(u.state) || u.def.color || '#333';
      g.beginPath(); g.arc(sx(u.porch.x), sy(u.porch.z), 2.6, 0, Math.PI * 2); g.fill();
      if (selected.has(id)) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
    }
    const tp = controls.target;
    const dx = tp.x - camera.position.x, dz = tp.z - camera.position.z;
    const a = Math.atan2(-dz, dx);
    const len = Math.max(14, 0.16 * w);
    g.save();
    g.translate(sx(tp.x), sy(tp.z));
    g.rotate(a);
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(len, -len * 0.22); g.lineTo(len, len * 0.22); g.closePath(); g.fill();
    g.restore();
  }
  function bindMinimap(canvas) {
    minimapCanvas = canvas;
    minimapOn = true;
    if (!canvas) return;
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width * 2 - 1;
      const ny = (e.clientY - r.top) / r.height * 2 - 1;
      const target = new THREE.Vector3(nx * CITY_R, 0.5, -ny * CITY_R);
      glide(target, Math.max(40, camera.position.distanceTo(controls.target)));
    });
  }
  function setMinimap(on) {
    minimapOn = !!on;
    if (minimapCanvas) {
      const host = minimapCanvas.parentElement;
      (host || minimapCanvas).style.display = minimapOn ? '' : 'none';
    }
  }

  // ---------- tooltip ----------
  const tip = document.createElement('div');
  Object.assign(tip.style, { position: 'absolute', pointerEvents: 'none', padding: '6px 9px', borderRadius: '8px', background: 'rgba(255,255,255,.93)', color: '#2b2d31', font: '12px system-ui,"Noto Sans SC",sans-serif', boxShadow: '0 4px 14px rgba(0,0,0,.12)', display: 'none', whiteSpace: 'nowrap', zIndex: 5 });
  container.appendChild(tip);
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  function pick(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    const u = hit && hit.object.userData.unit;
    const info = u ? { name: u.def.name, dept: u.def.dept, state: u.state || '', label: u.label } : hit && hit.object.userData.info;
    if (!info) { tip.style.display = 'none'; renderer.domElement.style.cursor = ''; return null; }
    tip.innerHTML = '';
    const b = document.createElement('b'); b.textContent = info.name; tip.appendChild(b);
    if (info.wonder) b.textContent = '奇观 · ' + info.name;
    const s = document.createElement('div'); s.style.color = '#666';
    s.textContent = [info.dept, info.state, info.label].filter(Boolean).join(' · '); tip.appendChild(s);
    tip.style.display = 'block';
    tip.style.left = Math.min(cx - r.left + 12, r.width - 200) + 'px';
    tip.style.top = Math.max(cy - r.top - 40, 4) + 'px';
    renderer.domElement.style.cursor = 'pointer';
    return u ? { type: 'agent', id: u.def.id } : info.reserved ? { type: 'reserved' } : info.wonder ? { type: 'wonder', id: info.id, name: info.name } : null;
  }
  let downAt = null;
  const onMove = (e) => { if (e.pointerType === 'mouse' && !e.buttons) pick(e.clientX, e.clientY); };
  const onDown = (e) => { downAt = [e.clientX, e.clientY]; };
  const onUp = (e) => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) { const hit = pick(e.clientX, e.clientY); if (hit && onPick) onPick(hit); }
    downAt = null;
  };
  const onLeave = () => { tip.style.display = 'none'; };
  const el = renderer.domElement;
  el.addEventListener('pointermove', onMove); el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp); el.addEventListener('pointerleave', onLeave);

  function resize() {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!userMoved) fit();
    const s = TAG_PX / (h * (0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * FIG_SCALE);
    for (const t of tags) t.scale.set(s * 4, s, 1);
    for (const ic of icons) ic.scale.set(s * 1.5, s * 1.5, 1);
    renderer.setPixelRatio(dpr()); renderer.setSize(w, h, false);
    el.style.width = w + 'px'; el.style.height = h + 'px';
    if (composer) { composer.setPixelRatio(dpr()); composer.setSize(w, h); }
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const clock = new THREE.Clock();
  let frameMs = 0;
  let raf = 0, t = 0, speed = 1, paused = false, visible = true, slow = 0, sampled = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !visible) return;
    const real = Math.min(clock.getDelta(), 0.1);
    if (composer && onAdaptive) { sampled += real; if (real > 0.05) slow += real; if (sampled > 4) { if (slow / sampled > 0.6) { composer = null; onAdaptive(); } sampled = 0; slow = 0; } }
    const dt = paused ? 0 : real * speed;
    t += dt;
    if (tween) {
      const k = 1 - Math.pow(0.002, real);
      camera.position.lerp(tween.pos, k); controls.target.lerp(tween.target, k);
      const d = camera.position.distanceTo(tween.pos);
      if (pendingFlash && d < 2) { flashAt(pendingFlash); pendingFlash = null; }
      if (d < 0.05) tween = null;
    }
    if (tour && !tour.paused) {
      const k = 1 - Math.pow(0.02, real);
      camera.position.lerp(tour.camPos, k); controls.target.lerp(tour.target, k);
      const d = camera.position.distanceTo(tour.camPos);
      if (d < 2 && !tour.arriveFired) { tour.arriveFired = true; flashAt(tour.target.clone().setY(0.2)); tour.dwell = 2.8; }
      if (tour.arriveFired) {
        tour.dwell -= real;
        if (tour.dwell <= 0) { tour.i = (tour.i + 1) % tour.way.length; startTourLeg(); }
      }
    }
    controls.update();
    // In the far overview only the lead keeps its name tag so the core does not turn into a pile of labels.
    const far = camera.position.distanceTo(controls.target) > 150;
    for (const tg of tags) tg.visible = labelsOn && (!far || tg === leadTag);
    for (const u of units.values()) {
      if (u.state === 'working') {
        const ph = t * 5 + u.phase;
        u.fig.arms[0].rotation.x = -0.7 + Math.sin(ph) * 0.55;
        u.fig.arms[1].rotation.x = -0.4 - Math.sin(ph) * 0.25;
        u.fig.root.position.y = u.porch.y + Math.abs(Math.sin(ph)) * 0.05;
        u.halo.scale.setScalar((u.selected ? 1.35 : 1) + 0.12 * Math.sin(t * 2.4 + u.phase));
      }
      u.smoke.update(dt);
    }
    updateMessengers(dt);
    fireworks.update(dt);
    if (birds) {
      for (let i = 0; i < birdsData.length; i++) {
        const b = birdsData[i];
        b.ang += dt * 0.15;
        const y = 27 + Math.sin(t * 0.55 + b.ph) * 4 + (i % 3) * 2.5;
        birdDummy.position.set(Math.cos(b.ang) * b.r, y, Math.sin(b.ang) * b.r);
        birdDummy.rotation.y = Math.atan2(-Math.sin(b.ang), Math.cos(b.ang));
        birdDummy.rotation.z = Math.sin(t * 1.7 + b.ph) * 0.3;
        birdDummy.updateMatrix();
        birds.setMatrixAt(i, birdDummy.matrix);
      }
      birds.instanceMatrix.needsUpdate = true;
    }
    if (boatMesh) {
      for (let i = 0; i < boatsData.length; i++) {
        const s = boatsData[i];
        boatDummy.position.set(s.x, 0.42 + Math.sin(t * 0.9 + i * 1.7) * 0.08, s.z);
        boatDummy.rotation.set(0, i * 0.7, Math.sin(t * 0.6 + i) * 0.06);
        boatDummy.updateMatrix();
        boatMesh.setMatrixAt(i, boatDummy.matrix);
      }
      boatMesh.instanceMatrix.needsUpdate = true;
    }
    for (const sm of chimneySmokes) sm.update(dt);
    if (water && water.material) {
      water.material.userData.t = (water.material.userData.t || 0) + dt;
      const tt = water.material.userData.t;
      if (water.material.map) water.material.map.offset.set(tt * 0.012, tt * 0.006);
      else if (water.material.opacity !== undefined) water.material.opacity = 0.85 + 0.05 * Math.sin(tt * 2);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.t += dt;
      const k = Math.min(1, f.t / 0.8);
      f.ring.scale.setScalar(1 + 3 * k);
      f.ring.material.opacity = 0.6 * (1 - k);
      if (k >= 1) { scene.remove(f.ring); f.ring.geometry.dispose(); f.ring.material.dispose(); flashes.splice(i, 1); }
    }
    if (++minimapTick % 4 === 0) drawMinimap();
    renderer.info.reset();
    const t0 = performance.now();
    if (composer) composer.render(); else renderer.render(scene, camera);
    frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
  }
  frame();

  function glide(target, dist) {
    if (tour) stopTour();
    const dir = camera.position.clone().sub(controls.target).normalize();
    tween = { target: target.clone(), pos: target.clone().addScaledVector(dir, dist) };
    userMoved = true;
  }
  function select(ids) {
    selected = new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean));
    for (const [id, u] of units) { u.selected = selected.has(id); u.ring.visible = u.selected; u.ring.scale.setScalar(u.selected ? 1.15 : 1); }
  }
  function focus(id, distance = 26) {
    const u = units.get(id); if (!u) return false;
    glide(u.porch.clone().setY(1.5), distance); return true;
  }
  function focusQuarter(style) {
    if (style === 'overview') { resetCamera(); return; }
    if (style === 'core') { glide(new THREE.Vector3(0, 2, 0), 78); return; }
    if (STYLE_ANGLE[style] === undefined) return;
    const p = polar(92, STYLE_ANGLE[style]);
    glide(new THREE.Vector3(p.x, 0, p.z), 120);
  }
  function focusWonder(id) { const w = city.wonders.find((x) => x.id === id); if (!w) return false; pendingFlash = new THREE.Vector3(w.x, 0.2, w.z); glide(new THREE.Vector3(w.x, Math.min(w.height, 60) * 0.35, w.z), Math.max(70, w.radius * 3.4, Math.min(w.height, 180) * 1.35)); return true; }
  function focusWonderByIndex(i) { const w = city.wonders[i]; if (!w) return false; pendingFlash = new THREE.Vector3(w.x, 0.2, w.z); return focusWonder(w.id); }
  function focusLead() { return layout.lead ? focus(layout.lead.id) : false; }
  function resetCamera() { userMoved = false; tween = null; stopTour(); fit(); }
  function setOptions(o = {}) {
    if (o.speed !== undefined) speed = Math.min(3, Math.max(0.25, Number(o.speed) || 1));
    if (o.paused !== undefined) paused = !!o.paused;
    if (o.sensitivity !== undefined) controls.rotateSpeed = controls.zoomSpeed = Math.min(2.5, Math.max(0.4, Number(o.sensitivity) || 1));
    if (o.labels !== undefined) labelsOn = !!o.labels;
    if (o.citizens !== undefined) for (const u of units.values()) u.fig.root.visible = !!o.citizens;
    if (o.night !== undefined) {
      nightOn = !!o.night;
      scene.background.copy(nightOn ? NIGHT_SKY : SKY); scene.fog.color.copy(nightOn ? NIGHT_SKY : SKY);
      hemi.intensity = nightOn ? 0.35 : 1.25; sun.intensity = nightOn ? 0.25 : 1.75;
      renderer.toneMappingExposure = nightOn ? 1.25 : 1;
      lamps.visible = nightOn; lanterns.visible = nightOn;
      for (const w of city.wonders || []) {
        w.group?.traverse((o) => {
          if (!o.isMesh || !o.material) return;
          const m = o.material;
          if (!m.userData) m.userData = {};
          if (m.userData._nightSaved == null) {
            m.userData._nightSaved = { ei: m.emissiveIntensity || 0, er: m.emissive?.r, eg: m.emissive?.g, eb: m.emissive?.b };
          }
          if (nightOn) {
            if (!m.emissive) m.emissive = new THREE.Color(0xffb35a);
            else m.emissive.setHex(0xffc27a);
            m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 0.35);
          } else if (m.userData._nightSaved) {
            const s = m.userData._nightSaved;
            if (m.emissive && s.er != null) m.emissive.setRGB(s.er, s.eg, s.eb);
            m.emissiveIntensity = s.ei;
          }
        });
      }
      if (!lowPower) rebuildComposer(nightOn && (opts.quality === 'high'));
      for (const u of units.values()) applyWindows(u);
    }
  }
  function setVisible(v) { visible = !!v; if (visible) clock.getDelta(); }

  return {
    setBots, handoff, select, focus, focusQuarter, focusWonder, focusWonderByIndex, focusLead, resetCamera, setOptions, setVisible,
    tourWonders, tourAgents, stopTour, setMinimap, bindMinimap,
    get tour() { return tour; },
    wonders: () => city.wonders.map((w) => ({ id: w.id, name: w.name })),
    perf: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, frameMs: +frameMs.toFixed(2), composer: !!composer, ...city.stats, lots: plan.lots.length, claimable: plan.lots.filter((l) => l.claimable).length }),
    // Debug/screenshot helper: put the camera at an exact spot looking at a target.
    view: (pos, target) => { tween = null; userMoved = true; camera.position.set(...pos); controls.target.set(...target); controls.maxDistance = 2000; controls.update(); },
    drawStats: () => {
      const by = {}; let total = 0, cast = 0;
      scene.traverseVisible((o) => { if (!o.isMesh && !o.isSprite && !o.isLine && !o.isPoints) return; total++; if (o.castShadow) cast++; let top = o; while (top.parent && top.parent !== scene) top = top.parent; const k = top.name || (top.type + (top.children.length > 8 ? ':' + top.uuid.slice(0, 4) : '')); by[k] = (by[k] || 0) + 1; });
      return { total, cast, by: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 30) };
    },
    setUsageLines: (lines) => stele.setLines(lines),
    setSimulation: () => {},
    debug: () => ({
      rings: layout.rings, plots: layout.plots.map((p) => ({ ring: p.ring, angle: p.angle, bot: p.bot ? p.bot.name : null })),
      units: [...units.values()].map((u) => ({ id: u.def.id, name: u.def.name, style: u.def.style, lead: !!u.def.lead, state: u.state, gate: !!(u.b.gate && u.b.gate.visible), smoke: u.smoke.object.visible, halo: u.halo.visible, selected: u.ring.visible })),
      messengers: messengers.filter((m) => m.active).map((m) => ({ from: m.from, to: m.to, x: +m.f.root.position.x.toFixed(2), z: +m.f.root.position.z.toFixed(2) })),
      fireworks: fireworks.active, camera: camera.position.toArray().map((v) => +v.toFixed(1)),
    }),
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp); el.removeEventListener('pointerleave', onLeave);
      renderer.dispose(); renderer.forceContextLoss?.(); tip.remove(); el.remove();
    },
  };
}
