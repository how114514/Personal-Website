import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 先引入全局样式，组件样式在其后覆盖
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
