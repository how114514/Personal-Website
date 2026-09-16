import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap, reducedMotion, queueRefresh } from '../lib/motion'
import PageArrow from './PageArrow'

type Props = {
  /** 是否是当前页。由 App 根据 FullPage 的页码传入 */
  active: boolean
  className?: string
  /** 下一页的锚点。不传（最后一页）就不显示翻页箭头 */
  nextHref?: string
  children: ReactNode
}

/**
 * 一页 = 一屏的进场外壳。
 *
 * 为什么不用 ScrollTrigger 触发进场：本站是自定义翻页容器（FullPage 接管滚轮 + 吸附），
 * 滚动位置是「跳」的，用滚动进度触发会误判。页面激活信号（FullPage.onPageChange）
 * 才是准确的时机。
 *
 * 元素通过属性声明参与：
 * - data-anim="display" 大字（外层需 overflow: hidden，做遮罩揭开）
 * - data-anim="head"    标题行（位移 + 渐显）
 * - data-anim="rule"    分隔线（从左展开）
 * - data-anim="item"    内容条目（依次 stagger）
 * - data-parallax="40"  轻微视差，值为位移像素，只在向上方向漂移
 */
export default function PageStage({
  active,
  className = 'page',
  nextHref,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // 进场：每次成为当前页都重放一遍
  useLayoutEffect(() => {
    // 离开时不重置，否则翻页途中上一页的内容会当场消失
    if (!active) return
    const root = ref.current
    if (!root) return

    const displays = gsap.utils.toArray<HTMLElement>('[data-anim="display"]', root)
    const heads = gsap.utils.toArray<HTMLElement>('[data-anim="head"]', root)
    const rules = gsap.utils.toArray<HTMLElement>('[data-anim="rule"]', root)
    const items = gsap.utils.toArray<HTMLElement>('[data-anim="item"]', root)

    if (reducedMotion()) {
      gsap.set([...displays, ...heads, ...rules, ...items], { clearProps: 'all' })
      return
    }

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

    // 先在绘制前把起点摆好，避免先闪一下再动
    gsap.set(displays, { yPercent: 118, opacity: 0 })
    gsap.set(heads, { y: 30, opacity: 0 })
    gsap.set(rules, { scaleX: 0 })
    gsap.set(items, { y: 36, opacity: 0 })

    if (displays.length) {
      tl.to(displays, {
        yPercent: 0,
        opacity: 1,
        duration: 1.15,
        stagger: 0.06,
        clearProps: 'transform,opacity',
      })
    }
    if (heads.length) {
      tl.to(
        heads,
        { y: 0, opacity: 1, duration: 0.95, clearProps: 'transform,opacity' },
        '-=0.8',
      )
    }
    if (rules.length) {
      tl.to(
        rules,
        { scaleX: 1, duration: 1.25, ease: 'power3.inOut', clearProps: 'transform' },
        '<0.1',
      )
    }
    if (items.length) {
      tl.to(
        items,
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.085,
          clearProps: 'transform,opacity',
        },
        '-=0.85',
      )
    }

    return () => {
      tl.kill()
    }
  }, [active])

  // 视差：只挂一次，离开页时也要继续跟随滚动
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || reducedMotion()) return
    const scroller = root.closest('.pages') as HTMLElement | null
    if (!scroller) return

    const created = gsap.utils
      .toArray<HTMLElement>('[data-parallax]', root)
      .map((el) => {
        const amount = Number(el.dataset.parallax) || 40
        // 只向上漂移：向下位移会撑高滚动区域，把这一页变成「长页」，
        // 那样就必须先滚到底才能翻页，翻页手感会被破坏
        return gsap.fromTo(
          el,
          { y: 0 },
          {
            y: -amount,
            ease: 'none',
            scrollTrigger: {
              trigger: root,
              scroller,
              start: 'top top',
              end: 'bottom top',
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          },
        ).scrollTrigger
      })
      .filter(Boolean)

    queueRefresh()

    return () => {
      created.forEach((st) => st?.kill())
    }
  }, [])

  return (
    <div className={className} ref={ref}>
      {children}
      {nextHref && <PageArrow href={nextHref} label="下一页" />}
    </div>
  )
}
