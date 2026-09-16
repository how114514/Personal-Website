import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * /play/xxx 是真实路径（History API 路由），静态托管默认会对它返回 404。
 * 构建时把 index.html 复制一份成 404.html，GitHub Pages 等会自动用它兜底，
 * 刷新试玩页就不会 404。（Netlify / Vercel 需要各自的 rewrite 配置。）
 *
 * enforce: 'post' 是为了让本插件的 generateBundle 排在 Vite 内部 build-html 之后，
 * 那时 bundle 里才拿得到已经处理过的 index.html。
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') return
      this.emitFile({ type: 'asset', fileName: '404.html', source: index.source })
    },
  }
}

export default defineConfig({
  /**
   * GitHub Pages 的项目站点部署在 https://<用户名>.github.io/<仓库名>/ 下，
   * 资源必须带这个前缀才加载得到。仓库改名时同步改这里（大小写敏感）。
   * dev / preview 会自动处理 base 前缀，本地开发不受影响。
   */
  base: '/Personal-Website/',
  plugins: [react(), spaFallback()],
  server: {
    port: 5173,
    open: true,
  },
})
