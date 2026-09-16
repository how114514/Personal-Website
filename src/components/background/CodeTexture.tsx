import { useEffect, useRef } from 'react'
import './CodeTexture.css'

/**
 * 最底层的 C# 代码纹理。
 * 静态层：散落的代码行，不滚动。
 * 动态层：几处代码在逐字生成 / 逐字删除，末尾带一个 cmd 风格光标。
 * 类名沿用简历中出现的模块名。
 */
const CODE_LINES = [
  'public class PlayerController : MonoBehaviour',
  '[SerializeField] private float moveSpeed = 6f;',
  'private readonly PlayerStateMachine stateMachine;',
  'void Update() => stateMachine.Tick(Time.deltaTime);',
  'public event Action<int> OnDamageTaken;',
  'var handle = Addressables.LoadAssetAsync<CardDataSO>(key);',
  '[CreateAssetMenu(menuName = "Events/IntEventSO")]',
  'private Rigidbody2D rb; private Animator anim;',
  'Physics2D.OverlapCircle(groundCheck.position, 0.2f, ground);',
  'stateMachine.ChangeState(new PlayerDashState(this));',
  'public interface IDamageable { void TakeDamage(int amount); }',
  'yield return new WaitForSeconds(0.15f);',
  'AudioMixer.SetFloat("SFXVolume", Mathf.Log10(v) * 20f);',
  'var json = JsonUtility.ToJson(saveData, true);',
  'rb.linearVelocity = new Vector2(input.x * moveSpeed, rb.linearVelocity.y);',
  'if (hit.collider.TryGetComponent(out HitBox box)) { }',
  'DOTween.To(() => volume, x => volume = x, target, 0.25f);',
  'impulseSource.GenerateImpulse();',
  'Debug.Log($"Blackjack! streak = {streak}");',
  'PlayerStats stats = GetComponent<PlayerStats>();',
  'SceneManager.LoadSceneAsync("Persistent", LoadSceneMode.Additive);',
  'private void OnTriggerEnter2D(Collider2D other)',
  'PhysicsCheck.Check(); PlayerAnimation.UpdateAnimator();',
  'case PlayerState.Dead: return;',
  'CardDataSO card = deck.Draw();',
  'public static Vector2 Dir(Vector2 a, Vector2 b) => (b - a).normalized;',
  'coroutine = StartCoroutine(Fade(0f, 1f, 0.3f));',
  'private const string BGM_KEY = "Audio/BGM_Main";',
  'foreach (var enemy in spawner.Active) enemy.Tick(dt);',
  'public float AttackSpeed { get; private set; }',
  'input.actions["Move"].ReadValue<Vector2>();',
  'spriteMask.alphaCutoff = 0.5f;',
  'while (countdown > 0f) countdown -= Time.deltaTime;',
]

const FRAGMENTS = [
  '{}', '=>', '[]', '!=', '&&', '||', '++', '::', '0x1F', '1e-6',
  '(int)', 'f;', 'var', 'null', 'out', 'ref', 'new', 'async', 'await',
  '0.016f', '512', '60f', '2D', 'SO', 'v1.0',
]

/** 逐字生成的位置（视口比例），集中在右半边，避开首页左侧标题 */
const TYPERS = [
  { x: 0.52, y: 0.15, size: 14 },
  { x: 0.68, y: 0.29, size: 13.5 },
  { x: 0.56, y: 0.56, size: 14.5 },
  { x: 0.74, y: 0.74, size: 13 },
  { x: 0.44, y: 0.87, size: 13.5 },
  { x: 0.86, y: 0.44, size: 14 },
]

type Typer = {
  x: number
  y: number
  size: number
  line: string
  chars: number
  phase: 'typing' | 'holding' | 'deleting' | 'waiting'
  timer: number
  typeSpeed: number
  deleteSpeed: number
}

const MONO = (size: number) =>
  `${size}px "JetBrains Mono", "Cascadia Code", Consolas, monospace`

export default function CodeTexture() {
  const staticRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)

  /* ---------- 静态层 ---------- */
  useEffect(() => {
    const canvas = staticRef.current
    if (!canvas) return

    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'

      // 代码行：随机散落，不做对齐、不加行号
      const lineCount = Math.max(12, Math.round((w * h) / 62000))
      for (let i = 0; i < lineCount; i++) {
        const size = 12.5 + Math.random() * 4.5
        ctx.font = MONO(size)
        ctx.fillStyle = `rgba(147, 173, 222, ${(0.09 + Math.random() * 0.06).toFixed(3)})`
        ctx.fillText(
          CODE_LINES[(Math.random() * CODE_LINES.length) | 0],
          Math.random() * w * 0.92,
          Math.random() * h,
        )
      }

      // 零散片段
      const fragCount = Math.max(10, Math.round((w * h) / 92000))
      for (let i = 0; i < fragCount; i++) {
        const size = 11 + Math.random() * 5
        ctx.font = MONO(size)
        ctx.fillStyle = `rgba(122, 162, 247, ${(0.08 + Math.random() * 0.05).toFixed(3)})`
        ctx.fillText(
          FRAGMENTS[(Math.random() * FRAGMENTS.length) | 0],
          Math.random() * w,
          Math.random() * h,
        )
      }
    }

    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [])

  /* ---------- 逐字生成 / 删除层 ---------- */
  useEffect(() => {
    const canvas = liveRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const typers: Typer[] = TYPERS.map((t, i) => ({
      ...t,
      line: CODE_LINES[i % CODE_LINES.length],
      chars: 0,
      phase: 'waiting',
      // 错开启动，避免同时开始
      timer: 0.4 + i * 0.5,
      typeSpeed: 26 + Math.random() * 14,
      deleteSpeed: 44 + Math.random() * 22,
    }))

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let last = performance.now()
    let clock = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      clock += dt

      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'

      for (const t of typers) {
        t.timer -= dt

        if (t.phase === 'typing') {
          t.chars += t.typeSpeed * dt
          if (t.chars >= t.line.length) {
            t.chars = t.line.length
            t.phase = 'holding'
            t.timer = 1.8 + Math.random() * 1.6
          }
        } else if (t.phase === 'holding') {
          if (t.timer <= 0) t.phase = 'deleting'
        } else if (t.phase === 'deleting') {
          t.chars -= t.deleteSpeed * dt
          if (t.chars <= 0) {
            t.chars = 0
            t.phase = 'waiting'
            t.timer = 0.3 + Math.random() * 0.8
          }
        } else if (t.timer <= 0) {
          t.line = CODE_LINES[(Math.random() * CODE_LINES.length) | 0]
          t.typeSpeed = 26 + Math.random() * 14
          t.deleteSpeed = 44 + Math.random() * 22
          t.phase = 'typing'
        }

        const x = t.x * w
        const y = t.y * h
        const text = t.line.slice(0, Math.floor(t.chars))

        ctx.font = MONO(t.size)
        ctx.fillStyle = 'rgba(160, 185, 232, 0.19)'
        ctx.fillText(text, x, y)

        // cmd 风格方块光标，等待下一句时暗下去，停留时闪烁
        const cursorOn =
          t.phase !== 'waiting' &&
          (t.phase !== 'holding' || Math.floor(clock / 0.5) % 2 === 0)

        if (cursorOn) {
          const width = ctx.measureText(text).width
          ctx.fillStyle = 'rgba(122, 162, 247, 0.5)'
          ctx.fillRect(x + width + 3, y - t.size * 0.5, t.size * 0.5, t.size)
        }
      }
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      <canvas ref={staticRef} className="code-texture" />
      <canvas ref={liveRef} className="code-texture code-texture--live" />
    </>
  )
}
