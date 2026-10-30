import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'

const LAYOUT = { china: [0, -46], rome: [46, 0], greece: [0, 46], metro: [-46, 0] }
const PRESETS = {
  overview: { pos: [64, 50, 64], target: [0, 0, 0] },
  china: { pos: [22, 24, -18], target: [0, 2, -46] },
  rome: { pos: [78, 26, 20], target: [46, 2, 0] },
  greece: { pos: [20, 26, 78], target: [0, 2, 46] },
  metro: { pos: [-78, 26, 20], target: [-46, 2, 0] },
}

export function createCity(stage, hooks = {}) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'civ-canvas'
  stage.append(renderer.domElement)
  const labels = new CSS2DRenderer()
  labels.domElement.className = 'civ-labels'
  stage.append(labels.domElement)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI * 0.46
  controls.minDistance = 8
  controls.maxDistance = 150
  controls.target.set(0, 0, 0)
  camera.position.set(64, 50, 64)

  const materials = new Map()
  const material = (color, extra = {}) => {
    const key = color + JSON.stringify(extra)
    let value = materials.get(key)
    if (!value) { value = new THREE.MeshStandardMaterial({ color, roughness: extra.roughness ?? 0.78, metalness: extra.metalness ?? 0.04, transparent: !!extra.transparent, opacity: extra.opacity ?? 1, emissive: extra.emissive || '#000', emissiveIntensity: extra.emissiveIntensity || 0 }); materials.set(key, value) }
    return value
  }
  const geos = new Map()
  const geo = (key, build) => { let value = geos.get(key); if (!value) { value = build(); geos.set(key, value) } return value }
  const box = (w, h, d) => geo('b' + w + h + d, () => new THREE.BoxGeometry(w, h, d))
  const column = geo('column', () => new THREE.CylinderGeometry(0.16, 0.2, 1, 7))
  const add = (parent, mesh, x, y, z) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh }
  const block = (parent, w, h, d, x, y, z, surface, shadow = false) => {
    const mesh = new THREE.Mesh(box(w, h, d), surface)
    mesh.castShadow = shadow
    mesh.receiveShadow = true
    return add(parent, mesh, x, y, z)
  }
  const roof = (parent, w, d, h, y, surface) => {
    const mesh = new THREE.Mesh(geo('roof' + w + d + h, () => new THREE.ConeGeometry(1, h, 4)), surface)
    mesh.scale.set(w * 0.62, 1, d * 0.62)
    mesh.rotation.y = Math.PI / 4
    mesh.castShadow = true
    return add(parent, mesh, 0, y + h / 2, 0)
  }
  const pillars = (parent, count, x0, z0, x1, z1, height, surface) => {
    for (let index = 0; index < count; index++) {
      const t = count === 1 ? 0.5 : index / (count - 1)
      const mesh = new THREE.Mesh(column, surface)
      mesh.scale.y = height
      mesh.castShadow = true
      add(parent, mesh, x0 + (x1 - x0) * t, height / 2, z0 + (z1 - z0) * t)
    }
  }
  const mark = (object, pick) => { object.traverse(child => { child.userData.pick = pick }); return object }

  const sun = new THREE.DirectionalLight('#fff4e4', 1.35)
  sun.position.set(36, 62, 24)
  sun.shadow.camera.left = -90
  sun.shadow.camera.right = 90
  sun.shadow.camera.top = 90
  sun.shadow.camera.bottom = -90
  sun.shadow.camera.near = 10
  sun.shadow.camera.far = 180
  sun.shadow.bias = -0.00035
  scene.add(sun, new THREE.AmbientLight('#f4f7ff', 0.42), new THREE.HemisphereLight('#d5e8f6', '#8d7b5d', 0.62))
  scene.fog = new THREE.Fog('#d5e2ea', 90, 210)
  scene.background = new THREE.Color('#d5e2ea')

  const ground = new THREE.Mesh(new THREE.CircleGeometry(92, 72), material('#7f9b70', { roughness: 1 }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 40), material('#e4dccb', { roughness: 0.9 }))
  plaza.rotation.x = -Math.PI / 2
  plaza.position.y = 0.03
  plaza.receiveShadow = true
  scene.add(plaza)
  const water = new THREE.Mesh(new THREE.TorusGeometry(23, 1.25, 12, 80), material('#6eabc4', { transparent: true, opacity: 0.78, roughness: 0.18, metalness: 0.08 }))
  water.rotation.x = -Math.PI / 2
  water.position.y = 0.05
  scene.add(water)
  for (const [name, point] of Object.entries(LAYOUT)) {
    const road = new THREE.Mesh(box(name === 'rome' || name === 'metro' ? 46 : 3.3, 0.06, name === 'rome' || name === 'metro' ? 3.3 : 46), material('#d9d0c0', { roughness: 0.95 }))
    road.position.set(point[0] / 2, 0.05, point[1] / 2)
    road.receiveShadow = true
    scene.add(road)
    const bridge = new THREE.Mesh(box(name === 'rome' || name === 'metro' ? 5.2 : 4.2, 0.16, name === 'rome' || name === 'metro' ? 4.2 : 5.2), material('#efe6d6'))
    const distance = 23
    bridge.position.set(Math.sign(point[0]) * distance, 0.16, Math.sign(point[1]) * distance)
    scene.add(bridge)
  }
  block(scene, 1.1, 4.2, 1.1, 0, 2.1, 0, material('#efe8da'), true)
  roof(scene, 2.2, 2.2, 0.7, 4.2, material('#8d3b34'))

  const districts = new THREE.Group()
  scene.add(districts)
  const built = {
    china: buildChina(material, block, roof, pillars, mark),
    rome: buildRome(material, block, roof, pillars, mark),
    greece: buildGreece(material, block, roof, pillars, mark),
    metro: buildMetro(material, block, roof, pillars, mark),
  }
  for (const [name, group] of Object.entries(built)) {
    const point = LAYOUT[name]
    group.position.set(point[0], 0, point[1])
    districts.add(group)
  }
  const trees = buildTrees(material, geo('trunk', () => new THREE.CylinderGeometry(0.08, 0.12, 0.7, 5)), geo('crown', () => new THREE.SphereGeometry(0.55, 8, 7)))
  scene.add(trees)
  const sites = new THREE.Group()
  scene.add(sites)
  const citizens = new THREE.Group()
  scene.add(citizens)
  const parcels = new THREE.Group()
  scene.add(parcels)

  const people = new Map()
  const workplaceMeshes = new Map()
  let buildingKey = ''
  let snapshot = null
  let settings = { quality: 'medium', speed: 1, sensitivity: 1, night: false, labels: true, citizens: true, buildings: true, paused: false }
  let visible = false
  let frame = 0
  let followId = null
  let userTurn = false
  let glide = null
  let qualityDropped = false
  const slowFrames = []
  const seenHandoffs = new Set()
  let source = ''
  const clock = new THREE.Clock()
  const bodyGeo = geo('body', () => new THREE.CapsuleGeometry(0.22, 0.62, 4, 8))
  const headGeo = geo('head', () => new THREE.SphereGeometry(0.2, 12, 10))
  const skin = material('#e6c8ad', { roughness: 0.7 })

  function applyLook() {
    const night = settings.night
    scene.background.set(night ? '#151922' : '#d5e2ea')
    scene.fog.color.set(night ? '#151922' : '#d5e2ea')
    sun.intensity = night ? 0.28 : 1.35
    sun.color.set(night ? '#9bb4d6' : '#fff4e4')
    renderer.toneMappingExposure = night ? 0.86 : 1.05
    const shadows = settings.quality !== 'low'
    renderer.shadowMap.enabled = shadows
    sun.castShadow = shadows
    sun.shadow.mapSize.set(settings.quality === 'high' ? 2048 : 1024, settings.quality === 'high' ? 2048 : 1024)
    renderer.setPixelRatio(settings.quality === 'high' ? Math.min(devicePixelRatio || 1, 2) : settings.quality === 'medium' ? Math.min(devicePixelRatio || 1, 1.5) : 1)
    controls.rotateSpeed = 0.85 * settings.sensitivity
    controls.zoomSpeed = 0.9 * settings.sensitivity
    controls.panSpeed = 0.8 * settings.sensitivity
    labels.domElement.hidden = !settings.labels
    citizens.visible = settings.citizens
    districts.visible = settings.buildings
    sites.visible = settings.buildings
  }
  function resize() {
    const width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    labels.setSize(width, height)
    poke()
  }
  function poke() { if (visible && !frame) frame = requestAnimationFrame(render) }
  function place(citizen) {
    if (citizen.activity === 'working' || citizen.activity === 'waiting') return workPoint(citizen)
    if (citizen.activity === 'delegating') {
      const target = snapshot?.citizens.find(item => snapshot.handoffs.some(handoff => handoff.fromAgentId === citizen.id && handoff.toAgentId === item.id))
      return target ? workPoint(target) : workPoint(citizen)
    }
    return idlePoint(citizen)
  }
  function idlePoint(citizen) {
    const center = LAYOUT[citizen.district] || [0, 0]
    const list = (snapshot?.citizens || [citizen]).filter(item => item.district === citizen.district)
    const index = Math.max(0, list.findIndex(item => item.id === citizen.id))
    const angle = (index / Math.max(list.length, 1)) * Math.PI * 2 + 0.6
    return new THREE.Vector3(center[0] + Math.cos(angle) * 9.2, 0, center[1] + Math.sin(angle) * 9.2)
  }
  function workPoint(citizen) {
    if (citizen.plot < 0) return new THREE.Vector3(LAYOUT.china[0], 0, LAYOUT.china[1] + 2.2)
    const center = LAYOUT[citizen.district]
    const angle = citizen.plot * 0.95
    const radius = 12 + Math.floor(citizen.plot / 6) * 4.5
    return new THREE.Vector3(center[0] + Math.cos(angle) * radius, 0, center[1] + Math.sin(angle) * radius)
  }
  function ensureCitizen(citizen) {
    let entry = people.get(citizen.id)
    if (entry) return entry
    const group = new THREE.Group()
    const cloth = material(citizen.color)
    const legGeo = geo('leg', () => new THREE.CapsuleGeometry(0.08, 0.46, 3, 6))
    const armGeo = geo('arm', () => new THREE.CapsuleGeometry(0.065, 0.34, 3, 6))
    const limb = (shape, x, y) => { const pivot = new THREE.Group(); const mesh = new THREE.Mesh(shape, cloth); mesh.position.y = -0.24; mesh.castShadow = settings.quality === 'high'; pivot.add(mesh); pivot.position.set(x, y, 0); return pivot }
    const leftLeg = limb(legGeo, -0.11, 0.78)
    const rightLeg = limb(legGeo, 0.11, 0.78)
    const leftArm = limb(armGeo, -0.3, 1.42)
    const rightArm = limb(armGeo, 0.3, 1.42)
    const body = new THREE.Mesh(bodyGeo, cloth)
    body.scale.set(0.92, 0.72, 0.92)
    body.position.y = 1.18
    body.castShadow = settings.quality === 'high'
    const head = new THREE.Mesh(headGeo, skin)
    head.position.y = 1.78
    const hat = districtHat(citizen.district, material, geo)
    const accessory = new THREE.Mesh(box(0.18, 0.12, 0.22), material('#f3e6c4'))
    accessory.position.set(0.34, 1.05, 0.16)
    const marker = new THREE.Mesh(geo('marker', () => new THREE.SphereGeometry(0.1, 8, 8)), material('#d7a441', { emissive: '#d7a441', emissiveIntensity: 0.4 }))
    marker.position.y = 2.35
    const tag = document.createElement('button')
    tag.type = 'button'
    tag.className = 'civ-tag'
    const title = document.createElement('strong')
    const state = document.createElement('small')
    tag.append(title, state)
    tag.onclick = event => { event.stopPropagation(); hooks.onPick?.({ type: 'agent', id: citizen.id }) }
    const label = new CSS2DObject(tag)
    label.position.set(0, 2.55, 0)
    group.add(leftLeg, rightLeg, body, leftArm, rightArm, head, hat, accessory, marker, label)
    mark(group, { type: 'agent', id: citizen.id })
    citizens.add(group)
    const goal = idlePoint(citizen)
    entry = { group, body, limbs: [leftLeg, rightLeg, leftArm, rightArm], accessory, marker, title, state, tag, goal, position: goal.clone(), activity: '', walk: 0 }
    group.position.copy(goal)
    people.set(citizen.id, entry)
    return entry
  }
  function syncBuildings() {
    const key = (snapshot?.buildings || []).map(item => item.id + item.kind + item.plot).join('|')
    if (key === buildingKey) return
    buildingKey = key
    for (const mesh of workplaceMeshes.values()) mesh.removeFromParent()
    workplaceMeshes.clear()
    if (!snapshot) return
    for (const building of snapshot.buildings) {
      if (building.kind === 'landmark') continue
      const point = buildingPoint(building)
      const mesh = building.kind === 'reserved'
        ? new THREE.Mesh(box(2.4, 0.05, 2.4), material('#d7d0c2', { transparent: true, opacity: 0.7 }))
        : workplace(building.district, material, block)
      mesh.position.set(point.x, building.kind === 'reserved' ? 0.04 : 0, point.z)
      mark(mesh, { type: 'building', id: building.id, district: building.district })
      sites.add(mesh)
      workplaceMeshes.set(building.id, mesh)
    }
  }
  function syncPeople() {
    if (!snapshot) return
    const alive = new Set(snapshot.citizens.map(citizen => citizen.id))
    for (const [id, entry] of people) if (!alive.has(id)) { entry.tag.remove(); entry.group.removeFromParent(); people.delete(id) }
    for (const citizen of snapshot.citizens) {
      const entry = ensureCitizen(citizen)
      entry.title.textContent = citizen.name
      const note = citizen.districtSource === 'fallback' ? citizen.detail + ' · 区划未按职责' : citizen.detail
      if (entry.state.textContent !== note) entry.state.textContent = note
      entry.tag.classList.toggle('selected', entry.tag.dataset.selected === 'true')
      entry.tag.dataset.activity = citizen.activity
      if (citizen.activity === 'waiting' || citizen.activity === 'error') entry.goal.copy(entry.position)
      else entry.goal.copy(place(citizen))
      entry.marker.visible = ['waiting', 'error', 'stale', 'unknown', 'complete'].includes(citizen.activity)
      entry.marker.material.color.set(citizen.activity === 'error' ? '#c4493a' : citizen.activity === 'stale' || citizen.activity === 'unknown' ? '#8d93a0' : citizen.activity === 'complete' ? '#3f8f62' : '#d7a441')
      entry.accessory.material.color.set(citizen.accessory === 'seal' ? '#9d2c2c' : citizen.accessory === 'scroll' ? '#f4efe2' : citizen.accessory === 'antenna' ? '#8fd0ea' : '#d7c4a1')
      entry.activity = citizen.activity
      entry.group.visible = settings.citizens
    }
  }
  function syncHandoffs() {
    if (!snapshot || snapshot.source !== source) { source = snapshot?.source || ''; seenHandoffs.clear(); parcels.clear() }
    for (const handoff of snapshot?.handoffs || []) {
      if (seenHandoffs.has(handoff.id)) continue
      if (seenHandoffs.size > 200) seenHandoffs.clear()
      seenHandoffs.add(handoff.id)
      const from = snapshot.citizens.find(item => item.id === handoff.fromAgentId)
      const to = snapshot.citizens.find(item => item.id === handoff.toAgentId)
      if (!from || !to) continue
      const mesh = new THREE.Mesh(box(0.28, 0.18, 0.28), material('#f2d48a'))
      mesh.position.copy(workPoint(from)).setY(1.2)
      parcels.add(mesh)
      mesh.userData.flight = { from: mesh.position.clone(), to: workPoint(to).setY(1.2), t: 0 }
    }
  }
  function render(now) {
    frame = 0
    if (!visible) return
    const dt = Math.min(0.05, clock.getDelta())
    const movingCamera = glide || controls.enabled
    let moving = !!glide
    if (glide) {
      glide.t = Math.min(1, glide.t + dt * 1.4 * Math.max(0.4, settings.speed))
      const k = 1 - (1 - glide.t) ** 3
      camera.position.lerpVectors(glide.from, glide.to, k)
      controls.target.lerpVectors(glide.targetFrom, glide.targetTo, k)
      if (glide.t >= 1) glide = null
    }
    controls.update()
    if (!settings.paused && snapshot) {
      const step = 4.2 * settings.speed * dt
      for (const citizen of snapshot.citizens) {
        const entry = people.get(citizen.id)
        if (!entry || citizen.activity === 'waiting') continue
        const offset = entry.goal.clone().sub(entry.position)
        const distance = offset.length()
        if (distance > 0.05) {
          offset.setLength(Math.min(step, distance))
          entry.position.add(offset)
          entry.group.position.copy(entry.position)
          entry.group.rotation.y = Math.atan2(offset.x, offset.z)
          entry.walk += 0.55
          const swing = Math.sin(entry.walk) * 0.55
          entry.limbs[0].rotation.x = swing
          entry.limbs[1].rotation.x = -swing
          entry.limbs[2].rotation.x = -swing * 0.7
          entry.limbs[3].rotation.x = swing * 0.7
          moving = true
        } else if (entry.limbs) for (const limb of entry.limbs) limb.rotation.x *= 0.82
        if (citizen.activity === 'working') entry.body.rotation.x = Math.sin(now / 280) * 0.06
        else entry.body.rotation.x *= 0.8
      }
      for (const mesh of [...parcels.children]) {
        const flight = mesh.userData.flight
        flight.t += dt / 2.4
        mesh.position.lerpVectors(flight.from, flight.to, Math.min(1, flight.t))
        mesh.position.y = 1.2 + Math.sin(Math.min(1, flight.t) * Math.PI) * 1.4
        moving = true
        if (flight.t >= 1) { mesh.removeFromParent() }
      }
    }
    if (followId && !userTurn) {
      const entry = people.get(followId)
      if (entry) { controls.target.lerp(entry.position.clone().setY(1.2), 0.12); camera.position.lerp(entry.position.clone().add(new THREE.Vector3(7, 6, 7)), 0.08); moving = true }
    }
    renderer.render(scene, camera)
    if (settings.labels) labels.render(scene, camera)
    if (!qualityDropped && settings.quality !== 'low') {
      slowFrames.push(dt)
      if (slowFrames.length > 20) slowFrames.shift()
      if (slowFrames.length === 20 && slowFrames.reduce((sum, item) => sum + item, 0) / 20 > 0.04) {
        qualityDropped = true
        settings = { ...settings, quality: 'low' }
        applyLook()
        hooks.onAdaptive?.('low')
      }
    }
    if (visible && (moving || parcels.children.length || glide)) frame = requestAnimationFrame(render)
  }
  function fly(preset) {
    userTurn = true
    followId = null
    glide = { t: 0, from: camera.position.clone(), to: new THREE.Vector3(...preset.pos), targetFrom: controls.target.clone(), targetTo: new THREE.Vector3(...preset.target) }
    poke()
  }
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(pointer, camera)
    return ray.intersectObjects(scene.children, true).find(hit => hit.object.userData.pick)?.object.userData.pick || null
  }
  let down = null
  renderer.domElement.addEventListener('pointerdown', event => { down = [event.clientX, event.clientY]; userTurn = true })
  renderer.domElement.addEventListener('pointerup', event => {
    if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return
    const hit = pick(event)
    if (hit) hooks.onPick?.(hit)
  })
  renderer.domElement.addEventListener('dblclick', event => { if (!pick(event)) fly(PRESETS.overview) })
  controls.addEventListener('start', () => { userTurn = true; glide = null })
  controls.addEventListener('change', poke)
  const observer = new ResizeObserver(() => resize())
  observer.observe(stage)
  applyLook()
  resize()

  return {
    resize, setVisible(value) { visible = value; if (value) { clock.getDelta(); poke() } else if (frame) { cancelAnimationFrame(frame); frame = 0 } },
    setSettings(next) { settings = { ...settings, ...next }; applyLook(); poke() },
    setSnapshot(next) { snapshot = next; syncBuildings(); syncPeople(); syncHandoffs(); poke() },
    focusDistrict(id) { if (PRESETS[id]) fly(PRESETS[id]) },
    follow(id) { followId = id; userTurn = false; poke() },
    resetCamera() { fly(PRESETS.overview) },
    select(id) { for (const [key, entry] of people) { entry.tag.dataset.selected = String(key === id); entry.tag.classList.toggle('selected', key === id) } },
    dispose() {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      for (const value of geos.values()) value.dispose()
      for (const value of materials.values()) value.dispose()
      renderer.domElement.remove()
      labels.domElement.remove()
    },
  }
}

function buildingPoint(building) {
  const center = LAYOUT[building.district]
  const angle = building.plot * 0.95
  const radius = 12 + Math.floor(Math.max(building.plot, 0) / 6) * 4.5
  return new THREE.Vector3(center[0] + Math.cos(angle) * radius, 0, center[1] + Math.sin(angle) * radius)
}
function districtHat(district, material, geo) {
  const hat = new THREE.Group()
  if (district === 'china') {
    const brim = new THREE.Mesh(geo('hat-brim', () => new THREE.CylinderGeometry(0.2, 0.26, 0.05, 8)), material('#2a2e36'))
    const crown = new THREE.Mesh(geo('hat-crown', () => new THREE.ConeGeometry(0.16, 0.16, 4)), material('#8c2f2c'))
    brim.position.y = 1.96
    crown.position.y = 2.06
    crown.rotation.y = Math.PI / 4
    hat.add(brim, crown)
  } else if (district === 'rome') {
    const crest = new THREE.Mesh(geo('crest', () => new THREE.BoxGeometry(0.06, 0.16, 0.22)), material('#8c2f2c'))
    crest.position.y = 2.02
    hat.add(crest)
  } else if (district === 'greece') {
    const wreath = new THREE.Mesh(geo('wreath', () => new THREE.TorusGeometry(0.16, 0.025, 6, 10)), material('#6f8f4e'))
    wreath.rotation.x = Math.PI / 2
    wreath.position.y = 1.9
    hat.add(wreath)
  } else {
    const band = new THREE.Mesh(geo('visor', () => new THREE.BoxGeometry(0.22, 0.04, 0.08)), material('#d7e7ee'))
    band.position.set(0, 1.86, 0.12)
    hat.add(band)
  }
  return hat
}
function hipRoof(width, depth, height, surface) {
  const columns = 8, rows = 8, positions = [], uvs = [], index = []
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const u = column / columns * 2 - 1, v = row / rows * 2 - 1
      const edge = Math.max(Math.abs(u), Math.abs(v))
      const ridge = (1 - edge) ** 0.75
      const kick = (Math.abs(u) * Math.abs(v)) ** 0.85 * 0.62
      positions.push(u * width / 2, (ridge + kick) * height, v * depth / 2)
      uvs.push(column / columns, row / rows)
    }
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1
    index.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, surface)
  mesh.castShadow = true
  return mesh
}
function placeHip(parent, width, depth, height, y, surface) {
  const mesh = hipRoof(width, depth, height, surface)
  mesh.position.y = y
  parent.add(mesh)
  return mesh
}
function disc(radius, color, material) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), material(color))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.04
  mesh.receiveShadow = true
  return mesh
}
function pediment(width, height, depth, surface) {
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2, 0)
  shape.lineTo(width / 2, 0)
  shape.lineTo(0, height)
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  geo.translate(0, 0, -depth / 2)
  const mesh = new THREE.Mesh(geo, surface)
  mesh.castShadow = true
  return mesh
}
function arch(parent, span, height, depth, stone, x, z, turn) {
  const pier = 0.38
  const group = new THREE.Group()
  const left = new THREE.Mesh(new THREE.BoxGeometry(pier, height, depth), stone)
  const right = left.clone()
  left.position.set(-span / 2, height / 2, 0)
  right.position.set(span / 2, height / 2, 0)
  const curve = new THREE.Mesh(new THREE.TorusGeometry(span / 2, 0.16, 6, 8, Math.PI), stone)
  curve.position.y = height
  const cap = new THREE.Mesh(new THREE.BoxGeometry(span + pier * 2, 0.28, depth + 0.08), stone)
  cap.position.y = height + 0.28
  group.add(left, right, curve, cap)
  if (turn) group.rotation.y = Math.PI / 2
  group.position.set(x, 0, z)
  parent.add(group)
}
function workplace(district, material, block) {
  const group = new THREE.Group()
  const wall = { china: '#8d3a34', rome: '#e4d0b2', greece: '#f7f3ea', metro: '#9ec4d2' }[district]
  const top = { china: '#2b3038', rome: '#b89a74', greece: '#efe6d4', metro: '#24343d' }[district]
  if (district === 'metro') {
    block(group, 2.4, 3.4, 2.2, 0, 1.7, 0, material(wall, { transparent: true, opacity: 0.78, roughness: 0.15, metalness: 0.2, emissive: '#8fb8c8', emissiveIntensity: 0.15 }), true)
    block(group, 2.7, 0.16, 2.5, 0, 3.45, 0, material(top), true)
  } else if (district === 'greece') {
    block(group, 2.8, 0.22, 2.2, 0, 0.16, 0, material('#e6dfd2'))
    block(group, 2.2, 1.5, 1.6, 0, 1.05, 0, material(wall), true)
    block(group, 3.1, 0.16, 2.4, 0, 1.9, 0, material(top), true)
  } else {
    block(group, 2.7, 1.7, 2.2, 0, 0.85, 0, material(wall), true)
    block(group, 3.3, 0.16, 2.8, 0, 1.75, 0, material(top), true)
    placeHip(group, district === 'china' ? 3.6 : 3.2, district === 'china' ? 3 : 2.6, 0.85, 1.82, material(top))
  }
  return group
}
function buildChina(material, block, roof, pillars, mark) {
  const group = new THREE.Group()
  group.add(disc(16, '#e7d3b8', material))
  const wall = material('#8c2f2c')
  const tile = material('#2a2e36')
  const red = material('#a33b34')
  const gold = material('#d7b56a', { metalness: 0.35, roughness: 0.4 })
  const cream = material('#f4ead8')
  block(group, 18, 0.35, 16, 0, 0.2, -0.4, material('#d9c7aa'))
  block(group, 17.2, 2.1, 0.42, 0, 1.25, -7.6, wall, true)
  block(group, 17.2, 2.1, 0.42, 0, 1.25, 7.6, wall, true)
  block(group, 0.42, 2.1, 14.6, -8.6, 1.25, 0, wall, true)
  block(group, 0.42, 2.1, 5.2, 8.6, 1.25, -4.6, wall, true)
  block(group, 0.42, 2.1, 5.2, 8.6, 1.25, 4.6, wall, true)
  for (const [x, z] of [[-8.2, -7.2], [8.2, -7.2], [-8.2, 7.2], [8.2, 7.2]]) {
    const tower = new THREE.Group()
    block(tower, 1.8, 3.6, 1.8, 0, 1.8, 0, wall, true)
    block(tower, 2.3, 0.16, 2.3, 0, 3.7, 0, gold)
    placeHip(tower, 2.8, 2.8, 1.15, 3.75, tile)
    tower.position.set(x, 0, z)
    group.add(tower)
  }
  const hall = new THREE.Group()
  block(hall, 9.2, 0.4, 6.2, 0, 0.45, -1.4, material('#cbb89a'))
  block(hall, 8.2, 3.1, 4.8, 0, 2.15, -1.4, red, true)
  pillars(hall, 6, -3.2, 1.15, 3.2, 1.15, 3.05, cream)
  block(hall, 10.6, 0.2, 7.2, 0, 3.75, -1.4, tile, true)
  placeHip(hall, 11.2, 7.6, 1.7, 3.85, tile)
  block(hall, 5.4, 1.35, 3.1, 0, 5.55, -1.4, red, true)
  block(hall, 6.8, 0.16, 4.2, 0, 6.3, -1.4, gold)
  placeHip(hall, 6.8, 4.4, 1.35, 6.35, tile)
  group.add(hall)
  for (const x of [-5.6, 5.6]) {
    const wing = new THREE.Group()
    block(wing, 3.2, 1.8, 2.6, 0, 0.9, 0, red, true)
    pillars(wing, 3, -1, 1.35, 1, 1.35, 1.7, cream)
    placeHip(wing, 4.4, 3.6, 1.05, 1.85, tile)
    wing.position.set(x, 0, 3.2)
    group.add(wing)
  }
  const gate = new THREE.Group()
  block(gate, 1.15, 3.5, 1.15, -1.7, 1.75, 0, wall, true)
  block(gate, 1.15, 3.5, 1.15, 1.7, 1.75, 0, wall, true)
  block(gate, 5, 0.28, 1.4, 0, 3.6, 0, gold)
  placeHip(gate, 5.8, 2.8, 1.15, 3.75, tile)
  gate.position.set(0, 0, 7.5)
  group.add(gate)
  return mark(group, { type: 'district', id: 'china' })
}
function buildRome(material, block, roof, pillars, mark) {
  const group = new THREE.Group()
  group.add(disc(16, '#eadcc6', material))
  const stone = material('#e7d3b4')
  const shade = material('#c4aa86')
  const marble = material('#f6f0e6')
  block(group, 14, 0.28, 8, 2.2, 0.2, 0, material('#d8c4a4'))
  block(group, 13, 0.22, 7.2, 2.2, 0.42, 0, material('#efe2cc'))
  block(group, 11.5, 4.2, 5.4, 2.4, 2.5, 0, stone, true)
  pillars(group, 7, -2.2, 2.85, 7.2, 2.85, 4.1, marble)
  block(group, 12.4, 0.28, 6.4, 2.4, 4.7, 0, shade, true)
  const front = pediment(12.2, 2.1, 0.45, marble)
  front.position.set(2.4, 4.9, 3.15)
  group.add(front)
  for (let index = 0; index < 5; index++) arch(group, 1.7, 2.5, 0.7, shade, 2.4, -3.4 + index * 1.7, true)
  for (let index = 0; index < 6; index++) arch(group, 1.8, 2.7, 0.85, stone, -6.5 - index * 2.4, 0.2, true)
  pillars(group, 8, -4, 5.4, 8, 5.4, 2.4, marble)
  pillars(group, 5, 8.2, -3.2, 8.2, 3.6, 2.4, marble)
  return mark(group, { type: 'district', id: 'rome' })
}
function buildGreece(material, block, roof, pillars, mark) {
  const group = new THREE.Group()
  group.add(disc(16, '#f3eee4', material))
  const marble = material('#f7f4ee')
  const step = material('#e5ddd0')
  const ink = material('#d9d0c2')
  block(group, 12.4, 0.28, 7.6, 0, 0.18, 1.2, step)
  block(group, 11.4, 0.24, 6.8, 0, 0.42, 1.2, step)
  block(group, 10.4, 0.22, 6, 0, 0.64, 1.2, marble)
  pillars(group, 8, -4.4, 3.9, 4.4, 3.9, 3.15, marble)
  pillars(group, 8, -4.4, -1.5, 4.4, -1.5, 3.15, marble)
  pillars(group, 4, -4.4, -1.1, -4.4, 3.5, 3.15, marble)
  pillars(group, 4, 4.4, -1.1, 4.4, 3.5, 3.15, marble)
  block(group, 10.2, 0.32, 6.2, 0, 3.4, 1.2, marble, true)
  const front = pediment(10.4, 2.2, 0.7, marble)
  front.position.set(0, 3.55, 4.15)
  group.add(front)
  const back = pediment(10.4, 2.2, 0.7, ink)
  back.rotation.y = Math.PI
  back.position.set(0, 3.55, -1.75)
  group.add(back)
  const stoa = new THREE.Group()
  block(stoa, 7.2, 0.2, 2.4, 0, 0.16, 0, step)
  pillars(stoa, 6, -3, 0.9, 3, 0.9, 2.1, marble)
  block(stoa, 7.6, 0.22, 2.8, 0, 2.25, 0, marble, true)
  stoa.position.set(-6.2, 0, -4.6)
  group.add(stoa)
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.8, 20), material('#8ec0cf', { transparent: true, opacity: 0.82, roughness: 0.12 }))
  pool.rotation.x = -Math.PI / 2
  pool.position.set(6.4, 0.07, -4.2)
  group.add(pool)
  return mark(group, { type: 'district', id: 'greece' })
}
function buildMetro(material, block, roof, pillars, mark) {
  const group = new THREE.Group()
  group.add(disc(16, '#d7e0dc', material))
  const glass = material('#b7d7e4', { transparent: true, opacity: 0.74, roughness: 0.08, metalness: 0.22, emissive: '#7eafc4', emissiveIntensity: 0.16 })
  const frame = material('#2c3b44')
  const band = material('#d5ecf2', { emissive: '#b7dbe8', emissiveIntensity: 0.35, roughness: 0.3 })
  const tower = (w, d, h, x, z) => {
    block(group, w, h, d, x, h / 2, z, glass, true)
    block(group, w + 0.25, 0.18, d + 0.25, x, h + 0.1, z, frame)
    const floors = Math.min(6, Math.floor(h / 2.2))
    for (let index = 1; index <= floors; index++) block(group, w + 0.08, 0.06, d + 0.08, x, index * (h / (floors + 1)), z, band)
  }
  tower(3.4, 3.4, 12.5, -4.2, -1.2)
  tower(2.8, 2.8, 9.2, 0.4, 2.2)
  tower(2.4, 3.6, 6.4, 3.6, -2.6)
  block(group, 7.4, 2.3, 3.2, 1.2, 1.15, -5.2, frame, true)
  for (let index = 0; index < 5; index++) block(group, 6.8, 0.08, 0.12, 1.2, 0.45 + index * 0.4, -3.55, band)
  block(group, 5.5, 0.16, 3.2, -1.5, 2.4, 5.2, frame)
  pillars(group, 4, -3.6, 5.2, 0.8, 5.2, 2.3, frame)
  return mark(group, { type: 'district', id: 'metro' })
}
function buildTrees(material, trunkGeo, crownGeo) {
  const group = new THREE.Group()
  const trunk = new THREE.InstancedMesh(trunkGeo, material('#7a5a3c'), 24)
  const crown = new THREE.InstancedMesh(crownGeo, material('#5f8f55'), 24)
  const matrix = new THREE.Matrix4()
  const spots = [[28, 28], [28, -28], [-28, 28], [-28, -28], [16, 16], [16, -16], [-16, 16], [-16, -16]]
  spots.forEach((spot, index) => {
    for (let copy = 0; copy < 3; copy++) {
      const id = index * 3 + copy
      const angle = copy * 2.1
      matrix.makeTranslation(spot[0] + Math.cos(angle) * 2.2, 0.35, spot[1] + Math.sin(angle) * 2.2)
      trunk.setMatrixAt(id, matrix)
      matrix.makeTranslation(spot[0] + Math.cos(angle) * 2.2, 1.15, spot[1] + Math.sin(angle) * 2.2)
      crown.setMatrixAt(id, matrix)
    }
  })
  trunk.instanceMatrix.needsUpdate = true
  crown.instanceMatrix.needsUpdate = true
  trunk.castShadow = false
  group.add(trunk, crown)
  return group
}
