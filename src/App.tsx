import { useEffect, useState } from 'react'
import ParticleBackground from './components/background/ParticleBackground'
import GridScan from './components/background/GridScan'
import FullPage from './components/FullPage'
import PageStage from './components/PageStage'
import PlaneGame from './components/game/PlaneGame'
import Nav from './components/Nav'
import Hero from './components/Hero'
import About from './components/About'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Highlights from './components/Highlights'
import Contact from './components/Contact'
import Footer from './components/Footer'
import PlayPage from './components/play/PlayPage'
import { takePagesScroll, useRoute } from './lib/route'

/**
 * 全站采用整屏分页：一页 = 一屏。
 * 第 1 页（Hero）跑飞机小游戏，离开第 1 页游戏整体卸载，
 * 星云背景贯穿所有页面。
 *
 * /play/xxx 是独立试玩页，整站换成它渲染，主站原样卸载；
 * 返回时恢复分页容器的滚动位置（页码由 URL 上的锚点还原）。
 */
export default function App() {
  const [page, setPage] = useState(0)
  const route = useRoute()

  // 子组件的 effect 先跑：FullPage 已按锚点跳好页，这里再补上页内滚动位置
  useEffect(() => {
    const top = takePagesScroll()
    if (top === null) return
    const el = document.querySelector('.pages')
    if (el) el.scrollTop = top
  }, [])

  if (route.startsWith('/play/')) {
    return <PlayPage route={route} />
  }

  return (
    <>
      {/* 第 1 页：星云背景 + 飞机小游戏；其余页：网格扫描 + 磨砂玻璃背景 */}
      {page === 0 ? (
        <ParticleBackground />
      ) : (
        <GridScan
          lineThickness={1}
          linesColor="#452263"
          scanColor="#9fc4ff"
          scanOpacity={0.4}
          gridScale={0.1}
          lineStyle="solid"
          lineJitter={0.1}
          scanDirection="pingpong"
          noiseIntensity={0.01}
          scanGlow={0.5}
          scanSoftness={2}
          scanDuration={2}
          scanDelay={2}
        />
      )}

      {/* 飞机小游戏只在第一页激活 */}
      <PlaneGame active={page === 0} />
      <Nav page={page} />

      {/* 每页套一层 PageStage：成为当前页时播进场动画，并挂上轻微视差 */}
      <FullPage onPageChange={setPage}>
        {/* 01 首页：个人名片 + 飞机小游戏 */}
        <PageStage className="page page--hero" active={page === 0}>
          <Hero active={page === 0} />
        </PageStage>

        {/* 02 关于（含教育背景） */}
        <PageStage className="page" active={page === 1} nextHref="#skills">
          <div className="container page__body">
            <About />
          </div>
        </PageStage>

        {/* 03 技能 / 技术栈 */}
        <PageStage className="page" active={page === 2} nextHref="#projects">
          <div className="container page__body">
            <Skills />
          </div>
        </PageStage>

        {/* 04 项目经历 */}
        <PageStage className="page" active={page === 3} nextHref="#highlights">
          <div className="container page__body">
            <Projects />
          </div>
        </PageStage>

        {/* 05 项目亮点 */}
        <PageStage className="page" active={page === 4} nextHref="#contact">
          <div className="container page__body">
            <Highlights />
          </div>
        </PageStage>

        {/* 06 联系方式 */}
        <PageStage className="page" active={page === 5}>
          <div className="container page__body">
            <Contact />
          </div>
          <Footer />
        </PageStage>
      </FullPage>
    </>
  )
}
