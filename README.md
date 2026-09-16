# Personal Website

个人作品集网站（求职用），包含简历信息展示与 Unity WebGL 项目在线试玩。

## 技术栈

- React 19 + TypeScript
- Vite 7
- Three.js（首页背景：粒子空间、网格扫描）
- GSAP（滚动与入场动画）
- 无路由库，用 History API 处理主站（`/`）与试玩页（`/play/xxx`）

## 本地运行

```bash
npm install
npm run dev      # 开发服务器，默认 http://localhost:5173
npm run build    # 类型检查 + 生产构建，产物在 dist/
npm run preview  # 预览构建产物
```

## 目录结构

```
src/
  components/            页面与区块组件
    background/          首页 Three.js 背景
    game/                站内小游戏（打飞机）
    play/                试玩页外壳 + Unity WebGL 加载器
  data/resume.ts         站点全部文案的唯一来源，改内容只改这里
  lib/                   路由与动效工具
public/webgl/            Unity WebGL 构建产物，按项目分目录
  blackjack/             Blackjack 21 点（1920×1080）
  hollow-knight/         空洞骑士战斗系统复刻（1280×720）
  last-30-seconds/       Last 30 Seconds（1280×720）
```

## 试玩页说明

`/play/<项目名>` 是独立试玩页，运行时按 Unity 官方方式加载：先插入 `Build/*.loader.js`，再用 `createUnityInstance` 启动。画布按 16:9 等比缩放显示，渲染分辨率由 `src/data/resume.ts` 里每个游戏的 `canvasWidth / canvasHeight` 决定。

新增一个可试玩项目：

1. 把 WebGL 构建放到 `public/webgl/<dir>/`（保留 `Build/`，用到 Addressables 时还要保留 `StreamingAssets/`）；
2. 在 `src/data/resume.ts` 的 `webglGames` 里加一条记录（含构建文件名、分辨率、玩法说明）；
3. 给对应项目的 `play` 字段填上路由，卡片就会自动出现「开始游戏」入口。

## 部署

```bash
npm run build
```

构建产物 `dist/` 可直接托管到任意静态站点服务。站点使用 History API 路由，`vite.config.ts` 里的插件会在构建时额外输出一份 `404.html` 作为兜底，GitHub Pages / 静态托管开箱可用（Netlify、Vercel 需配各自的 rewrite 规则）。
