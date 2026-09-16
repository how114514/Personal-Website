import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * 全站动效统一出口。
 *
 * 节奏约定（创意机构式的「慢而稳」）：
 * - 出场一律 expo.out：起步快、收尾极慢，不会出现弹跳感
 * - 收线类（下划线展开）用 power3.inOut
 * - 只动 transform / opacity，全部走合成层，不触发重排
 */

/** 默认出场缓动 */
export const EASE_OUT = 'expo.out'
/** 线条、遮罩收线 */
export const EASE_LINE = 'power3.inOut'

export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 一帧内多次挂载时只刷一次，避免每页各刷一次造成卡顿 */
let refreshQueued = false
export function queueRefresh() {
  if (refreshQueued) return
  refreshQueued = true
  requestAnimationFrame(() => {
    refreshQueued = false
    ScrollTrigger.refresh()
  })
}

export { gsap, ScrollTrigger }
