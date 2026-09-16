import { useEffect, useRef, type CSSProperties } from 'react'
import './GridScan.css'

type Props = {
  className?: string
  style?: CSSProperties
  /** 预留：当前不做鼠标交互 */
  sensitivity?: number
  lineThickness?: number
  linesColor?: string
  scanColor?: string
  scanOpacity?: number
  gridScale?: number
  lineStyle?: 'solid' | 'dashed'
  lineJitter?: number
  scanDirection?: 'pingpong' | 'forward' | 'reverse' | 'horizontal' | 'vertical' | 'diagonal'
  noiseIntensity?: number
  scanGlow?: number
  scanSoftness?: number
  scanDuration?: number
  scanDelay?: number
  scanOnClick?: boolean
}

/** 网格扫描背景 + 一层磨砂玻璃：three.js 按需加载，铺满视口 */
export default function GridScan({
  className = '',
  style,
  lineThickness = 1,
  linesColor = '#452263',
  scanColor = '#9fc4ff',
  scanOpacity = 0.4,
  gridScale = 0.1,
  lineStyle = 'solid',
  lineJitter = 0.1,
  scanDirection = 'pingpong',
  noiseIntensity = 0.01,
  scanGlow = 0.5,
  scanSoftness = 2,
  scanDuration = 2,
  scanDelay = 2,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let cleanup: (() => void) | undefined

    import('./gridScanScene').then(({ createGridScan }) => {
      if (disposed) return
      cleanup = createGridScan(canvas, {
        linesColor,
        scanColor,
        lineThickness,
        scanOpacity,
        gridScale,
        lineStyle,
        lineJitter,
        scanDirection,
        noiseIntensity,
        scanGlow,
        scanSoftness,
        scanDuration,
        scanDelay,
      })
    })

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [
    linesColor,
    scanColor,
    lineThickness,
    scanOpacity,
    gridScale,
    lineStyle,
    lineJitter,
    scanDirection,
    noiseIntensity,
    scanGlow,
    scanSoftness,
    scanDuration,
    scanDelay,
  ])

  return (
    <div className={`gs ${className}`.trim()} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="gs__canvas" />
      <div className="gs__frost" />
    </div>
  )
}
