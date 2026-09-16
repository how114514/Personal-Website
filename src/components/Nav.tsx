import { navItems } from '../data/resume'

/** 导航项落在第几页 */
const PAGE_OF: Record<string, number> = {
  about: 1,
  skills: 2,
  projects: 3,
  highlights: 4,
  contact: 5,
}

type NavProps = {
  /** 当前页码，用于标记菜单选中项 */
  page: number
}

export default function Nav({ page }: NavProps) {
  // 一页可能对应多个菜单项，只点亮该页的第一个
  const currentId = navItems.find((item) => PAGE_OF[item.id] === page)?.id

  return (
    <nav className="nav">
      <div className="nav__bar">
        <a className="nav__brand" href="#top">
          how114514 <span>/ Unity Client</span>
        </a>
        <div className="nav__links">
          {navItems.map((item) => (
            <a
              key={item.id}
              className={item.id === currentId ? 'nav__link is-current' : 'nav__link'}
              href={`#${item.id}`}
              aria-current={item.id === currentId ? 'true' : undefined}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
