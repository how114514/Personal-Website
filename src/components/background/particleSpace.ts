import * as THREE from 'three'

/**
 * 数字星云背景：星尘粒子在空间中缓慢向后掠过。
 * 粒子越过相机后在着色器里回绕到最远处，因此星云永不耗尽。
 */

const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute vec3  aColor;

  uniform float uPixelRatio;
  uniform float uSizeScale;
  uniform float uMaxSize;
  uniform float uFadeNear;
  uniform float uFadeFar;
  uniform float uFieldDepth;
  uniform float uScroll;
  uniform vec3  uMouseOrigin;
  uniform vec3  uMouseDir;
  uniform float uMouseRadius;
  uniform float uMouseStrength;
  uniform float uTime;

  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    // 相机固定在原点，靠 uScroll 推进。粒子按视距回绕：
    // 越过相机之后直接出现在最远处，而不是被销毁重建
    vec3 p = position;
    p.z = -mod(position.z - uScroll, uFieldDepth);

    vec4 world = modelMatrix * vec4(p, 1.0);

    // 鼠标影响区是沿视线方向的一根柱子，而不是某个深度的平面，
    // 这样才能扰动到远近不同的粒子
    vec3 v = world.xyz - uMouseOrigin;
    float along = max(dot(v, uMouseDir), 0.0);
    vec3 closest = uMouseOrigin + uMouseDir * along;
    float md = distance(world.xyz, closest);

    float radius = uMouseRadius + along * 0.06;
    float infl = 1.0 - smoothstep(0.0, radius, md);
    float amp = uMouseStrength * (1.0 + along * 0.02) * 0.2;

    // 光标附近的粒子乱飞：噪声驱动，位移均值为零，幅度小于影响半径，
    // 所以不会把粒子推出去留下空洞；鼠标一走 infl 归零，自动复位
    vec3 n = vec3(
      sin(uTime * 3.70 + world.x * 0.31 + world.y * 0.17),
      sin(uTime * 4.30 + world.y * 0.27 + world.z * 0.23),
      sin(uTime * 3.10 + world.z * 0.35 + world.x * 0.19)
    );
    world.xyz += n * infl * amp;

    vec4 mv = viewMatrix * world;
    float dist = -mv.z;

    gl_PointSize = clamp(
      aSize * uSizeScale * uPixelRatio * (1100.0 / max(dist, 1.0)),
      0.8,
      uMaxSize
    );

    // t: 0 = 最远, 1 = 最近。越靠近屏幕越亮
    float t = 1.0 - smoothstep(uFadeNear, uFadeFar, dist);
    float near = smoothstep(5.0, 30.0, dist);
    vAlpha = t * near * (0.45 + 1.05 * t);

    vColor = aColor;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d2 = dot(c, c);
    if (d2 > 0.25) discard;

    float a = smoothstep(0.25, 0.0, d2);
    a *= a;

    gl_FragColor = vec4(vColor, a * vAlpha * 0.3);
  }
`

const PALETTE = ['#7d8ba6', '#6d7f9c', '#94a9cc', '#7aa2f7', '#b9c7de'].map(
  (hex) => new THREE.Color(hex),
)
const PALETTE_WEIGHTS = [0.34, 0.26, 0.2, 0.08, 0.12]

function pickColor(target: THREE.Color) {
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < PALETTE.length; i++) {
    acc += PALETTE_WEIGHTS[i]
    if (r <= acc) return target.copy(PALETTE[i])
  }
  return target.copy(PALETTE[0])
}

/* ---------- 运行参数 ---------- */

const SCROLL_SPEED = 12 // 单位 / 秒
const FIELD_DEPTH = 1500 // 星尘场的纵深，也是回绕周期
const DUST_COUNT = 7000
const DUST_SPREAD_X = 560
const DUST_SPREAD_Y = 360

const MOUSE_RADIUS = 3
const MOUSE_STRENGTH = 4.5

const DUST_FADE_NEAR = 150
const DUST_FADE_FAR = 1600

export function createParticleSpace(canvas: HTMLCanvasElement): () => void {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
  })
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 3000)
  camera.position.set(0, 0, 0)

  /* ---------- 星尘点云 ---------- */

  const uPixelRatio = { value: 1 }
  const uFieldDepth = { value: FIELD_DEPTH }
  const uScroll = { value: 0 }
  const uMouseOrigin = { value: new THREE.Vector3(0, 0, 0) }
  const uMouseDir = { value: new THREE.Vector3(0, 0, -1) }
  const uMouseRadius = { value: MOUSE_RADIUS }
  const uMouseStrength = { value: 0 }
  const uMouseStrengthTarget = { value: 0 }
  const uTime = { value: 0 }

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uPixelRatio,
      uFieldDepth,
      uScroll,
      uMouseOrigin,
      uMouseDir,
      uMouseRadius,
      uMouseStrength,
      uTime,
      uSizeScale: { value: 1.5 },
      uMaxSize: { value: 6.8 },
      uFadeNear: { value: DUST_FADE_NEAR },
      uFadeFar: { value: DUST_FADE_FAR },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })

  {
    const positions = new Float32Array(DUST_COUNT * 3)
    const sizes = new Float32Array(DUST_COUNT)
    const colors = new Float32Array(DUST_COUNT * 3)
    const color = new THREE.Color()

    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * DUST_SPREAD_X
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * DUST_SPREAD_Y
      // z 取 [0, FIELD_DEPTH)，着色器再按 uScroll 回绕到相机前方
      positions[i * 3 + 2] = Math.random() * FIELD_DEPTH

      sizes[i] = 1.4 + Math.random() * 1.4

      pickColor(color)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))

    const dust = new THREE.Points(geometry, material)
    dust.frustumCulled = false
    scene.add(dust)
  }

  /* ---------- 尺寸 ---------- */

  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    uPixelRatio.value = dpr
  }
  resize()

  /* ---------- 光标扰动 ---------- */

  const pointer = new THREE.Vector2(0, 0)
  const raycaster = new THREE.Raycaster()

  let pointerInside = false

  const onPointerMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    pointerInside = true
  }

  const onPointerLeave = () => {
    pointerInside = false
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerleave', onPointerLeave)
  window.addEventListener('resize', resize)

  /* ---------- 主循环 ---------- */

  let raf = 0
  let last = performance.now()
  let elapsed = 0
  let scroll = 0

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    elapsed += dt
    uTime.value = elapsed

    // mod 以 FIELD_DEPTH 为周期，回绕后相位不变，所以这里可以直接取模防止精度丢失
    scroll = (scroll + SCROLL_SPEED * dt) % FIELD_DEPTH
    uScroll.value = scroll

    uMouseStrengthTarget.value = pointerInside ? MOUSE_STRENGTH : 0
    uMouseStrength.value +=
      (uMouseStrengthTarget.value - uMouseStrength.value) * Math.min(1, dt * 4)

    if (pointerInside) {
      raycaster.setFromCamera(pointer, camera)
      uMouseOrigin.value.copy(raycaster.ray.origin)
      uMouseDir.value.copy(raycaster.ray.direction)
    }

    renderer.render(scene, camera)
  }

  raf = requestAnimationFrame(tick)

  /* ---------- 清理 ---------- */

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerleave', onPointerLeave)
    window.removeEventListener('resize', resize)

    scene.traverse((obj) => {
      const points = obj as THREE.Points
      if (points.isPoints) {
        points.geometry.dispose()
        ;(points.material as THREE.Material).dispose()
      }
    })
    renderer.dispose()
  }
}
