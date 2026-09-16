type Props = {
  /** 目标区块的锚点，翻页由 FullPage 的锚点拦截接管 */
  href: string
  label: string
  /** 额外的定位类名 */
  className?: string
  /** 首页开场动画的挂点 */
  'data-open'?: string
}

/** 页面底部的圆形箭头，点击翻到下一页 */
export default function PageArrow({
  href,
  label,
  className = '',
  'data-open': dataOpen,
}: Props) {
  return (
    <a
      className={`page-arrow ${className}`.trim()}
      href={href}
      aria-label={label}
      data-open={dataOpen}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </a>
  )
}
