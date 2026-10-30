import * as THREE from 'three';

const SMOKE_COUNT = 10;
const SMOKE_LIFE = 3;
const SMOKE_RISE = 4;

export function createSmoke() {
  const object = new THREE.Group();
  object.visible = false;

  const geometry = new THREE.IcosahedronGeometry(0.5, 0);
  const colorStart = new THREE.Color(0xd23a2a);
  const colorEnd = new THREE.Color(0x5a1a14);
  const puffs = [];
  const phaseStep = SMOKE_LIFE / SMOKE_COUNT;

  for (let i = 0; i < SMOKE_COUNT; i++) {
    const colorT = SMOKE_COUNT === 1 ? 0 : i / (SMOKE_COUNT - 1);
    const color = new THREE.Color().lerpColors(colorStart, colorEnd, colorT);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);

    object.add(mesh);
    puffs.push({
      mesh,
      material,
      phase: i * phaseStep,
      driftX: (Math.random() - 0.5) * 1.2,
      driftZ: (Math.random() - 0.5) * 1.2
    });
  }

  let active = false;
  let elapsed = 0;

  function apply() {
    for (let i = 0; i < puffs.length; i++) {
      const puff = puffs[i];
      const age = (elapsed + puff.phase) % SMOKE_LIFE;
      const progress = age / SMOKE_LIFE;
      const scale = 0.4 + progress * 1.2;

      puff.mesh.position.set(
        puff.driftX * progress,
        progress * SMOKE_RISE,
        puff.driftZ * progress
      );
      puff.mesh.scale.setScalar(scale);
      puff.material.opacity = 0.75 * (1 - progress);
    }
  }

  function reset() {
    elapsed = 0;
    apply();
  }

  reset();

  return {
    object,
    setActive(value) {
      active = !!value;
      object.visible = active;
      reset();
    },
    update(dt) {
      if (!active) return;

      elapsed += dt;
      if (elapsed >= SMOKE_LIFE) elapsed %= SMOKE_LIFE;
      apply();
    }
  };
}

const FIREWORK_POOL = 12;
const FIREWORK_PARTICLES = 70;
const FIREWORK_STAGGER = 0.35;
const FIREWORK_LAUNCH_TIME = 0.6;
const FIREWORK_FADE_TIME = 1.4;
const FIREWORK_GRAVITY = 4;
const FIREWORK_COLORS = [0xffd24a, 0xff3b30, 0x28e7ff, 0xb56cff];

export function createFireworks() {
  const object = new THREE.Group();
  object.visible = false;

  const shells = [];
  let activeCount = 0;
  let colorCursor = 0;

  for (let i = 0; i < FIREWORK_POOL; i++) {
    const positions = new Float32Array(FIREWORK_PARTICLES * 3);
    const colors = new Float32Array(FIREWORK_PARTICLES * 3);
    const velocities = new Float32Array(FIREWORK_PARTICLES * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      opacity: 1
    });

    const points = new THREE.Points(geometry, material);
    points.visible = false;
    points.frustumCulled = false;
    object.add(points);

    shells.push({
      points,
      geometry,
      material,
      positions,
      colors,
      velocities,
      state: 'idle',
      time: 0,
      delay: 0,
      height: 0,
      driftX: 0,
      driftZ: 0,
      start: new THREE.Vector3(),
      explodeAt: new THREE.Vector3(),
      color: new THREE.Color()
    });
  }

  function acquireShell() {
    for (let i = 0; i < shells.length; i++) {
      if (shells[i].state === 'idle') return shells[i];
    }
    return null;
  }

  function setupShell(shell, position, delay) {
    shell.state = 'delay';
    shell.time = 0;
    shell.delay = delay;
    shell.start.copy(position);
    shell.height = 5 + Math.random() * 2;
    shell.driftX = (Math.random() - 0.5) * 0.8;
    shell.driftZ = (Math.random() - 0.5) * 0.8;
    shell.explodeAt.set(
      position.x + shell.driftX,
      position.y + shell.height,
      position.z + shell.driftZ
    );

    shell.color.setHex(FIREWORK_COLORS[colorCursor % FIREWORK_COLORS.length]);
    colorCursor++;

    const r = shell.color.r;
    const g = shell.color.g;
    const b = shell.color.b;

    for (let i = 0; i < FIREWORK_PARTICLES; i++) {
      const i3 = i * 3;
      const brightness = 0.75 + Math.random() * 0.45;

      shell.colors[i3] = Math.min(1, r * brightness);
      shell.colors[i3 + 1] = Math.min(1, g * brightness);
      shell.colors[i3 + 2] = Math.min(1, b * brightness);

      const dirY = Math.random() * 2 - 1;
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(1 - dirY * dirY);
      const speed = 3 + Math.random() * 2;

      shell.velocities[i3] = Math.cos(theta) * radius * speed;
      shell.velocities[i3 + 1] = dirY * speed;
      shell.velocities[i3 + 2] = Math.sin(theta) * radius * speed;
    }

    shell.colors[0] = r;
    shell.colors[1] = g;
    shell.colors[2] = b;

    shell.positions.fill(0);
    shell.geometry.attributes.position.needsUpdate = true;
    shell.geometry.attributes.color.needsUpdate = true;
    shell.geometry.setDrawRange(0, 0);
    shell.material.opacity = 1;
    shell.points.visible = false;
  }

  function beginLaunch(shell) {
    shell.state = 'launch';
    shell.geometry.setDrawRange(0, 1);
    shell.positions[0] = shell.start.x;
    shell.positions[1] = shell.start.y;
    shell.positions[2] = shell.start.z;
    shell.geometry.attributes.position.needsUpdate = true;
    shell.points.visible = true;
    shell.material.opacity = 1;
  }

  function beginExplosion(shell) {
    shell.state = 'explode';

    for (let i = 0; i < FIREWORK_PARTICLES; i++) {
      const i3 = i * 3;
      shell.positions[i3] = shell.explodeAt.x;
      shell.positions[i3 + 1] = shell.explodeAt.y;
      shell.positions[i3 + 2] = shell.explodeAt.z;
    }

    shell.geometry.setDrawRange(0, FIREWORK_PARTICLES);
    shell.geometry.attributes.position.needsUpdate = true;
    shell.points.visible = true;
    shell.material.opacity = 1;
  }

  function deactivate(shell) {
    shell.state = 'idle';
    shell.time = 0;
    shell.points.visible = false;
    shell.geometry.setDrawRange(0, 0);
    activeCount--;

    if (activeCount <= 0) {
      activeCount = 0;
      object.visible = false;
    }
  }

  function updateShell(shell, dt) {
    if (shell.state === 'idle') return;

    if (shell.state === 'delay') {
      shell.time += dt;
      if (shell.time < shell.delay) return;

      const remainder = shell.time - shell.delay;
      beginLaunch(shell);
      shell.time = remainder;
    } else {
      shell.time += dt;
    }

    if (shell.state === 'launch') {
      const progress = Math.min(shell.time / FIREWORK_LAUNCH_TIME, 1);

      shell.positions[0] = shell.start.x + (shell.explodeAt.x - shell.start.x) * progress;
      shell.positions[1] = shell.start.y + (shell.explodeAt.y - shell.start.y) * progress;
      shell.positions[2] = shell.start.z + (shell.explodeAt.z - shell.start.z) * progress;
      shell.geometry.attributes.position.needsUpdate = true;

      if (shell.time < FIREWORK_LAUNCH_TIME) return;

      const extra = shell.time - FIREWORK_LAUNCH_TIME;
      beginExplosion(shell);
      shell.time = extra;
    }

    if (shell.state === 'explode') {
      if (shell.time >= FIREWORK_FADE_TIME) {
        deactivate(shell);
        return;
      }

      shell.material.opacity = 1 - shell.time / FIREWORK_FADE_TIME;

      const t = shell.time;
      const gravityOffset = -0.5 * FIREWORK_GRAVITY * t * t;
      const originX = shell.explodeAt.x;
      const originY = shell.explodeAt.y + gravityOffset;
      const originZ = shell.explodeAt.z;

      for (let i = 0; i < FIREWORK_PARTICLES; i++) {
        const i3 = i * 3;
        shell.positions[i3] = originX + shell.velocities[i3] * t;
        shell.positions[i3 + 1] = originY + shell.velocities[i3 + 1] * t;
        shell.positions[i3 + 2] = originZ + shell.velocities[i3 + 2] * t;
      }

      shell.geometry.attributes.position.needsUpdate = true;
    }
  }

  return {
    object,
    burst(position, opts = {}) {
      let count = opts && opts.count !== undefined ? Number(opts.count) : 3;

      if (!Number.isFinite(count) || count < 0) count = 0;
      count = Math.min(Math.floor(count), FIREWORK_POOL);

      for (let i = 0; i < count; i++) {
        const shell = acquireShell();
        if (!shell) break;

        setupShell(shell, position, i * FIREWORK_STAGGER);
        activeCount++;
        object.visible = true;
      }
    },
    update(dt) {
      for (let i = 0; i < shells.length; i++) {
        updateShell(shells[i], dt);
      }

      object.visible = activeCount > 0;
    },
    get active() {
      return activeCount > 0;
    }
  };
}

