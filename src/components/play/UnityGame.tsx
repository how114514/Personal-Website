import { useEffect, useRef, useState } from 'react'
import type { WebglGame } from '../../data/resume'
import './UnityGame.css'

/**
 * Unity WebGL 加载器。
 *
 * 构建产物放在 public/webgl，由 Vite 原样拷到站点根目录，
 * 运行时就按 Unity 官方 index.html 的方式加载：先插入 *.loader.js，
 * 再用它暴露的 createUnityInstance 启动。
 */

type UnityInstance = {
  Quit: () => Promise<void>
  SetFullscreen: (value: number) => void
}

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: Record<string, unknown>,
      onProgress?: (progress: number) => void,
    ) => Promise<UnityInstance>
  }
}

/** Vite 的 BASE_URL 始终以 / 结尾，部署到子路径时这里也会跟着变 */
const BASE = import.meta.env.BASE_URL

/** 同一时刻只允许一个实例：React 严格模式会重跑 effect，不能重复启动 */
let cache: { canvas: HTMLCanvasElement; instance: UnityInstance } | null = null
let running: Promise<UnityInstance> | null = null
let mounted = 0

function injectLoader(url: string) {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-unity-loader="${url}"]`)
  if (existing) return existing.dataset.loaded === '1'
    ? Promise.resolve()
    : new Promise<void>((resolve, reject) => {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('loader script failed')))
      })

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.dataset.unityLoader = url
    script.addEventListener('load', () => {
      script.dataset.loaded = '1'
      resolve()
    })
    script.addEventListener('error', () => reject(new Error('loader script failed')))
    document.body.appendChild(script)
  })
}

function boot(canvas: HTMLCanvasElement, game: WebglGame, onProgress: (p: number) => void) {
  if (cache && cache.canvas === canvas) return Promise.resolve(cache.instance)
  if (running) return running

  const root = `${BASE}webgl/${game.dir}`
  const buildUrl = `${root}/Build`

  running = injectLoader(`${buildUrl}/${game.loaderFile}`)
    .then(() => {
      if (typeof window.createUnityInstance !== 'function') {
        throw new Error('createUnityInstance 未就绪')
      }
      return window.createUnityInstance(
        canvas,
        {
          dataUrl: `${buildUrl}/${game.dataFile}`,
          frameworkUrl: `${buildUrl}/${game.frameworkFile}`,
          codeUrl: `${buildUrl}/${game.codeFile}`,
          streamingAssetsUrl: `${root}/StreamingAssets`,
          companyName: 'DefaultCompany',
          productName: game.title,
          productVersion: '1.0',
          // 关键：关掉 Unity 默认的「渲染缓冲跟随 DOM 尺寸 × 设备像素比」。
          // 否则画布尺寸会随屏幕缩放变化，2D 游戏按 1280×720 摆的 UI 会错位。
          // 关掉后固定按画布属性的 1280×720 渲染，再交给 CSS 等比缩放。
          matchWebGLToCanvasSize: false,
          // Unity 默认会往页面插警告条，这里改成走控制台（错误本身由页面统一提示）
          showBanner: (msg: string, type: string) => {
            console[type === 'error' ? 'error' : 'warn']('[Unity]', msg)
          },
        },
        onProgress,
      )
    })
    .then((instance) => {
      // 加载期间用户可能已经退出试玩页，这时直接销毁，否则会留一个看不见的实例在跑
      if (mounted === 0) {
        instance.Quit().catch(() => {})
        throw new Error('已离开试玩页')
      }
      cache = { canvas, instance }
      running = null
      return instance
    })
    .catch((err) => {
      running = null
      throw err
    })

  return running
}

function quit() {
  const current = cache
  cache = null
  running = null
  current?.instance.Quit().catch(() => {})
}

type Props = {
  game: WebglGame
}

export default function UnityGame({ game }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    mounted += 1

    setStatus('loading')
    setError('')
    setProgress(0)

    let cancelled = false
    boot(canvas, game, (p) => {
      if (!cancelled) setProgress(p)
    })
      .then(() => {
        if (cancelled) return
        setStatus('ready')
        // 进入即把焦点交给画布：Unity 的键盘事件挂在 canvas 上，
        // 不主动聚焦时方向键/攻击键要先点一下画面才生效
        canvas.focus({ preventScroll: true })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setStatus('error')
      })

    return () => {
      cancelled = true
      mounted -= 1
      // 严格模式会立刻重挂一次，等一拍再决定要不要真的销毁
      setTimeout(() => {
        if (mounted === 0) quit()
      }, 0)
    }
  }, [game])

  return (
    <div className="unity">
      {/* id 必须是 unity-canvas：Unity 的输入系统按 #id 查找画布注册键盘事件，
          用官方模板以外的 id（或干脆没有 id）会在启动时报 querySelector 语法错误 */}
      <canvas
        id="unity-canvas"
        ref={canvasRef}
        className="unity__canvas"
        width={game.canvasWidth ?? 1280}
        height={game.canvasHeight ?? 720}
        tabIndex={-1}
      />

      {status !== 'ready' && (
        <div className="unity__overlay">
          {status === 'loading' ? (
            <>
              <p className="unity__status">游戏加载中 {Math.round(progress * 100)}%</p>
              <div className="unity__bar">
                <span className="unity__bar-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="unity__hint">首次加载需下载约 70MB 资源，请稍候</p>
            </>
          ) : (
            <>
              <p className="unity__status unity__status--error">游戏加载失败</p>
              <p className="unity__hint">
                {error || '请检查网络后刷新页面重试'}
                <br />
                若长期无法加载，可能是浏览器未启用 WebGL2 或资源路径不正确。
              </p>
              <button
                type="button"
                className="play-btn"
                onClick={() => window.location.reload()}
              >
                重新加载
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
