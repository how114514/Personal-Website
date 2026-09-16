import UnityGame from './UnityGame'
import { consumeFromSite, navigate } from '../../lib/route'
import { profile, webglGames } from '../../data/resume'
import './PlayPage.css'

type Props = {
  /** 当前路由，如 /play/last-30-seconds */
  route: string
}

/** 说明正文：字符串按单段处理，数组按多段处理，缺省为空 */
const toParagraphs = (body?: string | string[]) =>
  body === undefined ? [] : Array.isArray(body) ? body : [body]

/** 独立试玩页：整站视觉风格一致，但只承载 Unity WebGL 本体 */
export default function PlayPage({ route }: Props) {
  const game = webglGames[route]

  const goBack = () => {
    // 从站内点进来 → 回退历史，Projects 页的 hash 与页码原样恢复
    if (consumeFromSite()) {
      history.back()
      return
    }
    // 直接打开 / 刷新试玩页 → 没有可回退的站内记录，直接回项目页
    navigate('/#projects')
  }

  if (!game) {
    return (
      <div className="play">
        <div className="container play__missing">
          <p className="play__status">没有找到这个试玩项目</p>
          <button type="button" className="play-btn" onClick={goBack}>
            返回项目经历
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="play">
      <header className="play__bar">
        <div className="play__bar-inner">
          <button
            type="button"
            className="play-btn play-btn--back"
            onClick={goBack}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            返回项目经历
          </button>

          <div className="play__meta">
            <h1 className="play__title">{game.title}</h1>
            <span className="play__subtitle">{game.subtitle}</span>
          </div>

          <span className="play__brand">
            {profile.name} <span>/ Unity Client</span>
          </span>
        </div>
      </header>

      <main className="play__main">
        <div className="container play__inner">
          <div className="play__stage">
            <UnityGame game={game} />
          </div>

          {/* 玩法说明：逐栏并排，每栏高度控制在几行内，保证整页不需要滚动 */}
          {game.guide ? (
            <div className="play__guide">
              {game.guide.map((section) => (
                <section className="play__guide-col" key={section.title}>
                  <h2 className="play__guide-title">{section.title}</h2>

                  {toParagraphs(section.body).map((text) => (
                    <p className="play__guide-text" key={text}>
                      {text}
                    </p>
                  ))}

                  {section.items && (
                    <ul className="play__guide-list">
                      {section.items.map((item) => {
                        const at = item.indexOf('：')
                        // 带「：」的是按键说明，其余（如强化项）当标签列出来
                        return at > 0 ? (
                          <li className="play__guide-key" key={item}>
                            <b>{item.slice(0, at)}</b>
                            <span>{item.slice(at + 1)}</span>
                          </li>
                        ) : (
                          <li className="play__guide-tag" key={item}>
                            {item}
                          </li>
                        )
                      })}
                      {/* 收尾文字（如「等」）跟着标签流排，但不套标签框 */}
                      {section.trailing && (
                        <li className="play__guide-trailing">{section.trailing}</li>
                      )}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <p className="play__tip">
              游戏由 Unity WebGL 构建直接运行在浏览器中，首次进入需要等待资源下载；
              加载完成后点击画面即可用键盘 / 鼠标操作，建议在桌面端游玩。
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
