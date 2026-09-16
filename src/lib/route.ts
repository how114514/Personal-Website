import { useEffect, useState } from 'react'

/**
 * 极简路由：只用来在主站（/）和独立试玩页（/play/xxx）之间切换。
 * 不引入路由库——本站只有两个顶层视图，用 History API 足够，
 * 也不会和 FullPage 已有的站内锚点（#projects 这类）打架。
 */

/** Vite 的 BASE_URL，部署到 GitHub Pages 子路径时形如 /Personal-Website/ */
const BASE = import.meta.env.BASE_URL

/**
 * 去掉部署子路径前缀，拿到站内路由（/、/play/xxx）。
 * BASE 以 / 结尾，减 1 是为了保留路由开头的 /；根路径部署时 BASE 为 /，原样返回。
 */
const stripBase = (pathname: string) =>
  pathname.startsWith(BASE) ? pathname.slice(BASE.length - 1) : '/'

/** 给站内路由补上部署子路径，用于 pushState 与 <a href> */
export function withBase(path: string) {
  return BASE === '/' ? path : BASE.replace(/\/$/, '') + path
}

const normalize = (path: string) => path.replace(/\/+$/, '') || '/'

const read = () => normalize(stripBase(window.location.pathname))

export function useRoute() {
  const [path, setPath] = useState(read)

  useEffect(() => {
    const onPop = () => setPath(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return path
}

/** 前进到某个站内路径（不会重新加载页面） */
export function navigate(to: string) {
  if (normalize(to) === read()) return
  window.history.pushState(null, '', withBase(to))
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/** 记录「试玩页是从站内点进来的」，返回时才能安全地用 history.back()。
    刷新后这个标记消失，返回键改为直接回项目页锚点。 */
let fromSite = false

export const markFromSite = () => {
  fromSite = true
}

export const consumeFromSite = () => {
  const v = fromSite
  fromSite = false
  return v
}

const SCROLL_KEY = 'pw:pages-scroll-top'

/** 分页容器是 fixed 的，卸载后位置会丢，离开前先记下来 */
export function savePagesScroll() {
  const el = document.querySelector('.pages')
  if (el) sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop))
}

/** 取一次就清掉，避免刷新后又被拽回旧位置 */
export function takePagesScroll(): number | null {
  const raw = sessionStorage.getItem(SCROLL_KEY)
  if (raw === null) return null
  sessionStorage.removeItem(SCROLL_KEY)
  const top = Number(raw)
  return Number.isFinite(top) ? top : null
}
