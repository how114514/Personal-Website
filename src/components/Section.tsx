import type { ReactNode } from 'react'

type SectionProps = {
  id: string
  /** 区块序号，如 "01" */
  index: string
  title: string
  /** 英文大字标题，纯装饰，不参与朗读 */
  en: string
  /** 首屏区块不显示顶部边框 */
  first?: boolean
  children: ReactNode
}

export default function Section({
  id,
  index,
  title,
  en,
  first,
  children,
}: SectionProps) {
  return (
    <section id={id} className={first ? 'section section--first' : 'section'}>
      <div className="container">
        <header className="section__head">
          {/* 外层负责裁切，进场时内层从下方推上来 */}
          <span className="section__display" data-parallax="30" aria-hidden="true">
            <span className="section__display-inner" data-anim="display">
              {en}
            </span>
          </span>
          <div className="section__row" data-anim="head">
            <span className="section__index">{index}</span>
            <h2 className="section__title">{title}</h2>
          </div>
          <span className="section__rule" data-anim="rule" aria-hidden="true" />
        </header>
        {children}
      </div>
    </section>
  )
}
