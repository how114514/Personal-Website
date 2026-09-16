import { useLayoutEffect, useRef } from 'react'
import { profile, summary, others } from '../data/resume'
import { gsap, reducedMotion } from '../lib/motion'
import PageArrow from './PageArrow'
import './Hero.css'

/** 首页四组小信息：数值 + 两行标签 */
const stats = [
  { value: '04', lines: ['PROJECTS', 'COMPLETED'] },
  { value: '02+', lines: ['YEAR FOR', 'UNITY'] },
  { value: '01', lines: ['GAME JAM', 'EXPERIENCE'] },
  { value: '∞', lines: ['FAILED &', 'ITERATED'] },
]

type Props = {
  /** 是否是当前页。回到首页时重新播一遍开场 */
  active: boolean
}

export default function Hero({ active }: Props) {
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return

    const pick = (name: string) => root.querySelector<HTMLElement>(`[data-open="${name}"]`)
    const eyebrow = pick('eyebrow')
    const name = pick('name')
    const title = pick('title')
    const intro = pick('intro')
    const scroll = pick('scroll')
    const statItems = gsap.utils.toArray<HTMLElement>('[data-open="stat"]', root)

    const all = [eyebrow, name, title, intro, scroll, ...statItems].filter(Boolean)

    if (reducedMotion()) {
      gsap.set(all, { clearProps: 'all' })
      return
    }

    // 起点：先摆好再画，避免闪一下
    gsap.set(eyebrow, { y: 16, opacity: 0 })
    // 姓名从遮罩下方推上来，同时纵向略微压扁再归位
    gsap.set(name, { yPercent: 116, scaleY: 1.14, transformOrigin: '50% 100%' })
    gsap.set(title, { y: 18, opacity: 0 })
    gsap.set(intro, { y: 22, opacity: 0 })
    gsap.set(statItems, { y: 30, opacity: 0 })
    gsap.set(scroll, { opacity: 0 })

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

    tl.to(eyebrow, { y: 0, opacity: 1, duration: 0.8 })
      .to(name, { yPercent: 0, scaleY: 1, duration: 1.5 }, '-=0.45')
      .to(title, { y: 0, opacity: 1, duration: 0.9 }, '-=0.95')
      .to(intro, { y: 0, opacity: 1, duration: 0.9 }, '-=0.72')
      .to(statItems, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 }, '-=0.6')
      .to(scroll, { opacity: 1, duration: 1, ease: 'power2.out' }, '-=0.5')

    return () => {
      tl.kill()
    }
  }, [active])

  return (
    <section id="top" className="hero" ref={ref}>
      <div className="container hero__main">
        <p className="hero__eyebrow" data-open="eyebrow">
          <span className="hero__dot" aria-hidden="true" />
          {others.target.replace('求职方向：', '')}
        </p>

        {/* 外层裁切、内层上推，做出遮罩揭开的进场 */}
        <h1 className="hero__name">
          <span className="hero__name-mask" data-parallax="46">
            <span className="hero__name-inner" data-open="name">
              {profile.name}
            </span>
          </span>
        </h1>

        <p className="hero__title" data-open="title">
          {profile.title}
        </p>

        <p className="hero__intro" data-open="intro">
          {summary[0]}
        </p>

        <ul className="hero__stats">
          {stats.map((stat) => (
            <li className="hero__stat" key={stat.lines[0]} data-open="stat">
              <span className="hero__stat-value">{stat.value}</span>
              <span className="hero__stat-label">
                {stat.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 点击翻到下一页，交给 FullPage 的锚点拦截处理 */}
      <PageArrow
        href="#about"
        label="向下滚动"
        className="hero__arrow"
        data-open="scroll"
      />
    </section>
  )
}
