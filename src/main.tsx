import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { recoverFromStaleAssets } from './lib/staleCache'
import './index.css'

// Vite fires this when a hashed dynamic import 404s after redeploy (common on Pages + PWA).
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  void recoverFromStaleAssets()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
