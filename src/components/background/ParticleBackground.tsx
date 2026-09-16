import { useEffect, useRef } from 'react'
import CodeTexture from './CodeTexture'
import './ParticleBackground.css'

/**
 * 固定在最底层的数字星云背景。
 * three.js 按需动态加载，不进入首屏包。
 */
export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let cleanup: (() => void) | undefined

    import('./particleSpace').then(({ createParticleSpace }) => {
      if (disposed) return
      cleanup = createParticleSpace(canvas)
    })

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [])

  return (
    <div className="bg" aria-hidden="true">
      <CodeTexture />
      <canvas ref={canvasRef} className="bg__canvas" />
    </div>
  )
}
