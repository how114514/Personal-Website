import type { MouseEvent } from 'react'
import BorderGlow from './BorderGlow'
import Section from './Section'
import { projects } from '../data/resume'
import { markFromSite, navigate, savePagesScroll, withBase } from '../lib/route'
import './Projects.css'

/** 开始游戏：先记下当前滚动位置，再跳到独立试玩页，返回时能回到原位 */
function startGame(e: MouseEvent<HTMLAnchorElement>, route: string) {
  // 修饰键 / 中键点击保持浏览器默认行为（新标签页打开）
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  savePagesScroll()
  markFromSite()
  navigate(route)
}

export default function Projects() {
  return (
    <Section id="projects" index="03" title="项目经历" en="PROJECTS">
      <div className="projects">
        {projects.map((project) => (
          <BorderGlow
            key={project.name}
            data-anim="item"
            edgeSensitivity={30}
            glowColor="221 89 72"
            backgroundColor="#120F17"
            borderRadius={50}
            glowRadius={10}
            glowIntensity={0.1}
            coneSpread={15}
            animated={false}
            colors={['#38bdf8', '#60a5fa', '#818cf8']}
          >
            <article className="project">
              <header className="project__head">
                <h3 className="project__name">{project.name}</h3>
                <div className="project__meta">
                  <span className="project__type">{project.type}</span>
                  <span>{project.period}</span>
                </div>
              </header>
              <ul className="bullet-list">
                {project.points.map((point) => (
                  <li key={point.text}>
                    {point.label && <b>{point.label}：</b>}
                    {point.text}
                  </li>
                ))}
              </ul>

              {/* 有 WebGL 构建的项目才出试玩入口，卡片本身不内嵌游戏 */}
              {project.play && (
                <footer className="project__actions">
                  <a
                    className="play-btn"
                    href={withBase(project.play)}
                    onClick={(e) => startGame(e, project.play!)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5.5v13l11-6.5z" />
                    </svg>
                    开始游戏
                  </a>
                  <span className="project__actions-note">
                    在线试玩 · Unity WebGL
                  </span>
                </footer>
              )}
            </article>
          </BorderGlow>
        ))}
      </div>
    </Section>
  )
}
