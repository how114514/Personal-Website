import {
  Color,
  LinearSRGBColorSpace,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  AdditiveBlending,
  WebGLRenderer,
} from 'three'

export type GridScanOptions = {
  linesColor: string
  scanColor: string
  lineThickness: number
  scanOpacity: number
  gridScale: number
  lineStyle: 'solid' | 'dashed'
  lineJitter: number
  scanDirection: 'pingpong' | 'forward' | 'reverse' | 'horizontal' | 'vertical' | 'diagonal'
  noiseIntensity: number
  scanGlow: number
  scanSoftness: number
  scanDuration: number
  scanDelay: number
}

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// 相机位于一条方形隧道内，对所有可见面（地/顶/左右壁/尽头）做射线求交，
// 在命中点画三维格线；一块扫描平面沿隧道纵深往返，把近处的格线与空气点亮。
const FRAG = `
uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uLinesColor;
uniform vec3  uScanColor;
uniform float uLineThickness;
uniform float uScanOpacity;
uniform float uGridScale;
uniform float uLineJitter;
uniform float uLineStyle;
uniform float uNoiseIntensity;
uniform float uScanGlow;
uniform float uScanSoftness;
uniform float uScanDuration;
uniform float uScanDelay;
uniform float uScanPingPong;
uniform float uScanFlip;

varying vec2 vUv;

const float FAR_Z  = 7.5;   // 隧道纵深
const float FOV    = 0.85;  // 距离 1 处的半高
// 隧道横截面取格子的整数倍（3 格 × 2 格），棱边本身才落在格线上，转角是一条线而不是两条

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// 扫描位置 0 → 1：匀速移动，不在两端停留
float scanPhase(float t) {
  float run = max(uScanDuration, 0.001);
  if (uScanPingPong < 0.5) return fract(t / run);
  return 1.0 - abs(mod(t / run, 2.0) - 1.0);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0) * 2.0;

  // 相机在原点，看向 -z
  vec3 rd = normalize(vec3(uv.x * FOV, uv.y * FOV, -1.0));

  float cell = max(uGridScale, 0.001) * 6.0;
  float HW = cell * 3.0;   // 隧道半宽
  float HH = cell * 2.0;   // 隧道半高

  // 与隧道四个侧面求交取最近命中；没有尽头，轴向的射线落进黑暗
  float t = 1e5;
  float surf = 0.0;
  if (rd.y < -1e-4) { float tt = -HH / rd.y; if (tt < t) { t = tt; surf = 0.0; } }
  if (rd.y >  1e-4) { float tt =  HH / rd.y; if (tt < t) { t = tt; surf = 1.0; } }
  if (rd.x < -1e-4) { float tt = -HW / rd.x; if (tt < t) { t = tt; surf = 2.0; } }
  if (rd.x >  1e-4) { float tt =  HW / rd.x; if (tt < t) { t = tt; surf = 3.0; } }
  t = min(t, 200.0);

  vec3 p = rd * t;

  // 按面取格线所在的两个坐标轴与法线
  vec2 g   = surf < 1.5 ? p.xz : p.zy;
  vec3 nrm = surf < 1.5
    ? vec3(0.0, surf < 0.5 ? 1.0 : -1.0, 0.0)
    : vec3(surf < 2.5 ? 1.0 : -1.0, 0.0, 0.0);

  // 格线
  vec2 gp = g / cell;
  // 只抖动「横向」那一维：等 z 的环形线在四个面上都严格落在同一位置，
  // 转角处两条边才能接成一条线，而不会错开成两条
  float jit = (noise(gp * 0.28 + 3.1) - 0.5) * uLineJitter * 0.6;
  gp += surf < 1.5 ? vec2(jit, 0.0) : vec2(0.0, jit);

  vec2 f = abs(fract(gp) - 0.5);
  float lineDist = min(f.x, f.y) * cell;

  // 透视尺寸：世界单位 / 像素（等于沿纵深方向的真实足迹，远处按 t² 增长）
  float grazing = abs(dot(nrm, rd));
  float perPx = 2.0 * FOV / max(uResolution.y, 1.0);
  float footprint = t * perPx / max(grazing, 1e-3);
  float lw = max(uLineThickness, 0.01) * footprint;
  float line = 1.0 - smoothstep(lw * 0.4, lw * 1.2, lineDist);

  if (uLineStyle > 0.5) {
    line *= step(0.4, fract((gp.x + gp.y) * 2.0));
  }

  // 一格在屏幕上不足几像素时淡出，避免远处糊成摩尔纹
  line *= smoothstep(2.5, 9.0, cell / max(footprint, 1e-5));
  // 掠射角过大的面（贴近地平线）淡出
  line *= smoothstep(0.0, 0.12, grazing);

  // 扫描平面：沿隧道纵深匀速往返，两端渐隐，不在端点停留
  float ph = scanPhase(uTime);
  if (uScanFlip > 0.5) ph = 1.0 - ph;
  float scanZ = mix(-0.9, -FAR_Z, ph);
  float envelope = smoothstep(0.0, 0.22, ph) * smoothstep(1.0, 0.72, ph);

  float width = max(uScanSoftness, 0.1) * 0.55;
  float band = exp(-pow(abs(p.z - scanZ) / width, 2.0)) * envelope;
  float core = exp(-pow(abs(p.z - scanZ) / (width * 0.3), 2.0)) * envelope;

  float fog = exp(-t / 7.0);
  float fogScan = mix(fog, 1.0, 0.6);

  vec3 col = uLinesColor * line * fog;
  col += uScanColor * line * band * uScanOpacity * 2.4 * fogScan;
  col += uScanColor * band * uScanGlow * 0.16 * fogScan;
  col += uScanColor * core * uScanGlow * 0.3 * fogScan;

  // 边缘压暗
  float vign = smoothstep(1.35, 0.2, length((vUv - 0.5) * vec2(1.15, 1.0)) * 1.6);
  col *= mix(0.3, 1.0, vign);

  col += (hash(gl_FragCoord.xy + fract(uTime * 30.0) * 91.0) - 0.5) * uNoiseIntensity;

  float alpha = clamp(line * fog * 0.9 + band * 0.8 + core * 0.5, 0.0, 1.0) * mix(0.35, 1.0, vign);
  gl_FragColor = vec4(max(col, 0.0), alpha);
}
`

/** 创建 GridScan 背景，返回销毁函数 */
export function createGridScan(canvas: HTMLCanvasElement, o: GridScanOptions) {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearAlpha(0)

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const pingpong = o.scanDirection !== 'forward' && o.scanDirection !== 'reverse'
  const flip = o.scanDirection === 'reverse'

  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: AdditiveBlending,
    uniforms: {
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      // shader 直接输出到 sRGB 帧缓冲，这里不做 sRGB→linear 转换，保证颜色所见即所得
      uLinesColor: { value: new Color().setStyle(o.linesColor, LinearSRGBColorSpace) },
      uScanColor: { value: new Color().setStyle(o.scanColor, LinearSRGBColorSpace) },
      uLineThickness: { value: o.lineThickness },
      uScanOpacity: { value: o.scanOpacity },
      uGridScale: { value: o.gridScale },
      uLineJitter: { value: o.lineJitter },
      uLineStyle: { value: o.lineStyle === 'dashed' ? 1 : 0 },
      uNoiseIntensity: { value: o.noiseIntensity },
      uScanGlow: { value: o.scanGlow },
      uScanSoftness: { value: o.scanSoftness },
      uScanDuration: { value: o.scanDuration },
      uScanDelay: { value: o.scanDelay },
      uScanPingPong: { value: pingpong ? 1 : 0 },
      uScanFlip: { value: flip ? 1 : 0 },
    },
  })

  const quad = new Mesh(new PlaneGeometry(2, 2), material)
  quad.frustumCulled = false
  scene.add(quad)

  const resize = () => {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    ;(material.uniforms.uResolution.value as Vector2).set(w, h)
  }
  resize()

  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  let raf = 0
  let last = performance.now()
  let elapsed = 0

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    elapsed += Math.min((now - last) / 1000, 0.05)
    last = now
    material.uniforms.uTime.value = elapsed
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    quad.geometry.dispose()
    material.dispose()
    renderer.dispose()
  }
}
