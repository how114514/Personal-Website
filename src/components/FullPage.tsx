import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import './FullPage.css'

/**
 * 整屏分页滚动容器（一屏 = 一页）。
 *
 * 实现：一个 fixed 的滚动容器，每页 min-height: 100vh。
 * 桌面端滚轮被接管，一次滚动 = 翻一页，翻页动画期间锁定输入，避免连跳；
 * 内容比视口高的「长页」（如项目经历）先按原生方式读完，滚到边缘才翻页。
 * 站内锚点（导航、Hero 按钮）也由这里接管，保证落在正确的页上。
 */

const LOCK_MS = 780 // 翻页动画期间忽略新的滚轮/按键输入
const LOCK_MAX = 1700 // 跨多页跳转时锁定的上限
const LOCK_PER_PX = 0.15 // 行程越长动画越久，锁定时间随之延长，避免中途被当成新输入
const TALL_TOL = 24 // 页高超出视口这么多像素才算「长页」
const KEY_SCROLL = 0.6 // 长页内方向键/翻页键一次滚动的视口比例

const pagesOf = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLElement>(':scope > .page'))

type Props = {
  children: ReactNode
  /** 当前页码变化时回调，从 0 开始 */
  onPageChange?: (index: number) => void
}

export default function FullPage({ children, onPageChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const lockRef = useRef(0)
  const rafRef = useRef(0)
  const count = Children.count(children)

  /** 翻页行程越长，动画越久，锁定时间跟着延长 */
  const lockFor = (el: HTMLElement, top: number) =>
    performance.now() +
    Math.min(LOCK_MAX, LOCK_MS + Math.abs(top - el.scrollTop) * LOCK_PER_PX)

  const goTo = useCallback(
    (i: number, smooth = true) => {
      const el = rootRef.current
      if (!el) return
      const page = pagesOf(el)[i]
      if (!page) return
      lockRef.current = lockFor(el, page.offsetTop)
      el.scrollTo({ top: page.offsetTop, behavior: smooth ? 'smooth' : 'auto' })
      if (indexRef.current !== i) {
        indexRef.current = i
        setIndex(i)
      }
      onPageChange?.(i)
    },
    [onPageChange],
  )

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    /** 当前页是长页、且这个方向还有内容没读完 → 交给原生滚动 */
    const canReadInside = (dir: number) => {
      const page = pagesOf(el)[indexRef.current]
      if (!page || page.offsetHeight <= el.clientHeight + TALL_TOL) return false
      const top = page.offsetTop
      const end = top + page.offsetHeight - el.clientHeight
      return dir > 0 ? el.scrollTop < end - 1 : el.scrollTop > top + 1
    }

    const step = (dir: number) => {
      const next = indexRef.current + dir
      if (next < 0 || next >= pagesOf(el).length) return
      goTo(next)
    }

    // 监听挂在 window 上：导航栏、页码指示器这些固定浮层悬在分页容器之上，
    // 指针压在它们上面时，浏览器找不到可滚动元素，滚轮会没有反应。
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < 1) return
      const dir = e.deltaY > 0 ? 1 : -1
      if (canReadInside(dir)) {
        // 长页内部阅读交给原生滚动；指针在浮层上时容器收不到，这里手动补上
        if (!el.contains(e.target as Node)) {
          e.preventDefault()
          el.scrollTop += e.deltaY
        }
        return
      }
      e.preventDefault()
      if (performance.now() < lockRef.current) return
      step(dir)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return

      if (e.key === 'Home') {
        e.preventDefault()
        goTo(0)
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        goTo(pagesOf(el).length - 1)
        return
      }

      let dir = 0
      if (e.key === 'PageDown' || e.key === 'ArrowDown' || e.key === ' ') dir = 1
      else if (e.key === 'PageUp' || e.key === 'ArrowUp') dir = -1
      if (!dir) return

      e.preventDefault()
      if (performance.now() < lockRef.current) return
      if (canReadInside(dir)) {
        // 容器是 fixed 的，浏览器不会自己用方向键滚它，这里手动滚
        el.scrollBy({ top: dir * el.clientHeight * KEY_SCROLL, behavior: 'smooth' })
        return
      }
      step(dir)
    }

    /**
     * 站内锚点（导航、Hero 按钮）：翻到目标所在页，落点与滚轮翻页一致。
     * 必须挂在 document 上：悬浮导航是分页容器的兄弟节点，挂在容器上收不到它的点击，
     * 那样浏览器会自己按锚点滚到元素位置，落点就和滚轮翻页对不上了。
     */
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
      const link = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]')
      if (!(link instanceof HTMLAnchorElement)) return
      const id = decodeURIComponent(link.hash.slice(1))
      if (!id) return
      const target = document.getElementById(id)
      if (!target || !el.contains(target)) return
      e.preventDefault()

      const pi = pagesOf(el).findIndex((p) => p.contains(target))
      if (pi < 0) return
      // 落点与滚轮翻页完全一致：都停在页首，不按被点元素二次定位
      history.replaceState(null, '', `#${id}`)
      goTo(pi)
    }

    // 长页内部自由滚动时同步页码
    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        if (performance.now() < lockRef.current) return
        const pages = pagesOf(el)
        let best = 0
        let min = Infinity
        for (let i = 0; i < pages.length; i++) {
          const d = Math.abs(pages[i].offsetTop - el.scrollTop)
          if (d < min) {
            min = d
            best = i
          }
        }
        if (best !== indexRef.current) {
          indexRef.current = best
          setIndex(best)
          onPageChange?.(best)
        }
      })
    }

    // 只在宽度变化时重新对齐。移动端地址栏收起只改高度，不能把页面拽回页首
    let lastW = window.innerWidth
    const onResize = () => {
      if (window.innerWidth === lastW) return
      lastW = window.innerWidth
      const page = pagesOf(el)[indexRef.current]
      if (page) el.scrollTo({ top: page.offsetTop, behavior: 'auto' })
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('click', onClick)
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)

    // 带 hash 打开时直接落到对应页
    if (location.hash.length > 1) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)))
      if (target && el.contains(target)) {
        const pi = pagesOf(el).findIndex((p) => p.contains(target))
        if (pi > 0) {
          indexRef.current = pi
          setIndex(pi)
          onPageChange?.(pi)
          el.scrollTo({ top: pagesOf(el)[pi].offsetTop, behavior: 'auto' })
        }
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('wheel', onWheel)
      document.removeEventListener('click', onClick)
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [goTo, onPageChange])

  return (
    <>
      <div className="pages" ref={rootRef}>
        {children}
      </div>

      <nav className="pager" aria-label="页面导航">
        <span className="pager__num pager__num--current">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="pager__dots">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              className={i === index ? 'pager__dot is-active' : 'pager__dot'}
              aria-label={`第 ${i + 1} 页`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <span className="pager__num">{String(count).padStart(2, '0')}</span>
      </nav>

      {/* 返回最上：首页无意义，用透明度隐藏而不是卸载，避免进场动画重放 */}
      <a
        className={index > 0 ? 'to-top is-visible' : 'to-top'}
        href="#top"
        aria-label="返回最上"
        aria-hidden={index === 0}
        tabIndex={index === 0 ? -1 : undefined}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 15l6-6 6 6" />
        </svg>
      </a>
    </>
  )
}
