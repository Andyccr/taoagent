import * as THREE from 'three';

const waterMaterials = new Set();

function seededHash(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

function makeWaves() {
  const waves = [];
  for (let i = 0; i < 5; i += 1) {
    const angle = seededHash(i * 5 + 1) * Math.PI * 2;
    const wavelength = 1.5 + seededHash(i * 5 + 2) * 7.5;
    const amplitude = 0.012 + seededHash(i * 5 + 3) * 0.026;
    const omega = 1.1 + seededHash(i * 5 + 4) * 1.9;
    const phase = seededHash(i * 5 + 5) * Math.PI * 2;
    waves.push({
      dx: Math.cos(angle).toFixed(5),
      dz: Math.sin(angle).toFixed(5),
      amplitude: amplitude.toFixed(5),
      k: (Math.PI * 2 / wavelength).toFixed(5),
      omega: omega.toFixed(5),
      phase: phase.toFixed(5)
    });
  }
  return waves;
}

const waves = makeWaves();

function waveCalls() {
  return waves.map((wave, index) => `
    waterWave(waterP, vec2(${wave.dx}, ${wave.dz}), ${wave.amplitude}, ${wave.k}, ${wave.omega}, ${wave.phase} + float(${index}) * 0.37, waterHeight, waterGrad);
  `).join('');
}

const fragmentHeader = `
  varying vec3 vWaterWorld;
  uniform float uTime;
  uniform float uScale;
  uniform vec3 uDeep;
  uniform float uNight;

  float waterHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float waterNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(waterHash(i), waterHash(i + vec2(1.0, 0.0)), u.x),
      mix(waterHash(i + vec2(0.0, 1.0)), waterHash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void waterWave(vec2 p, vec2 dir, float amp, float k, float omega, float phase, inout float height, inout vec2 grad) {
    float angle = dot(dir, p) * k + uTime * omega + phase;
    float wave = sin(angle);
    height += amp * wave;
    grad += dir * (amp * k * cos(angle));
  }
`;

const fragmentBody = `
  vec2 waterP = vWaterWorld.xz / max(uScale, 0.001);
  float waterHeight = 0.0;
  vec2 waterGrad = vec2(0.0);
  ${waveCalls()}

  float viewDist = length(vViewPosition);
  float aaFade = smoothstep(0.0, 0.01, fwidth(viewDist) / max(viewDist, 0.001));
  float rippleFade = (1.0 - smoothstep(25.0, 140.0, viewDist)) * (1.0 - aaFade * 0.75);
  waterGrad *= rippleFade;
  // Long swells survive to the horizon so distant water still catches the light.
  vec2 swellGrad = vec2(0.0);
  float swellHeight = 0.0;
  waterWave(waterP, vec2(0.83, 0.56), 0.05, 0.21, 0.55, 0.0, swellHeight, swellGrad);
  waterWave(waterP, vec2(-0.38, 0.92), 0.04, 0.13, 0.42, 1.7, swellHeight, swellGrad);
  waterWave(waterP, vec2(0.12, -0.99), 0.03, 0.33, 0.8, 3.1, swellHeight, swellGrad);
  waterGrad += swellGrad * (1.0 - smoothstep(400.0, 1400.0, viewDist));

  vec3 waterWorldNormal = normalize(vec3(-waterGrad.x, 1.0, -waterGrad.y));
  normal = normalize((viewMatrix * vec4(waterWorldNormal, 0.0)).xyz);

  vec2 wp = vWaterWorld.xz;
  float largeNoise = waterNoise(wp * 0.011 + vec2(uTime * 0.004, -uTime * 0.003)) * 0.65 + waterNoise(wp * 0.043 - vec2(uTime * 0.01, 0.0)) * 0.35 * (1.0 - smoothstep(120.0, 400.0, viewDist));
  float depthMix = smoothstep(0.2, 0.85, largeNoise) * 0.55;
  vec3 waterColor = mix(diffuseColor.rgb, uDeep, depthMix);
  float crest = smoothstep(0.0, 0.1, waterHeight) * 0.07;
  waterColor *= 0.985 + crest;

  float fresnel = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
  float skyMix = fresnel * mix(0.5, 0.1, uNight);
  waterColor = mix(waterColor, vec3(0.75, 0.85, 0.92), skyMix);
  diffuseColor.rgb = waterColor;
`;

export function createWaterMaterial({ color = '#4f86a3', deep = '#2d5f7a', opacity = 0.9, scale = 1 } = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uScale: { value: scale },
    uDeep: { value: new THREE.Color(deep) },
    uNight: { value: 0 }
  };

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.18,
    metalness: 0.15,
    transparent: true,
    opacity
  });

  material.userData.uniforms = uniforms;
  material.customProgramCacheKey = () => 'city-water-v1';

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uScale = uniforms.uScale;
    shader.uniforms.uDeep = uniforms.uDeep;
    shader.uniforms.uNight = uniforms.uNight;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWaterWorld;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        ${fragmentHeader}`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        ${fragmentBody}`
      );
  };

  waterMaterials.add(material);
  return material;
}

export function updateWater(time, night = false) {
  const nightValue = typeof night === 'number'
    ? Math.min(1, Math.max(0, night))
    : (night ? 1 : 0);

  waterMaterials.forEach((material) => {
    const uniforms = material.userData.uniforms;
    uniforms.uTime.value = time;
    uniforms.uNight.value = nightValue;
  });
}

export function disposeWater() {
  waterMaterials.forEach((material) => material.dispose());
  waterMaterials.clear();
}
