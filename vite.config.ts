import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// './' 便于 GitHub Pages 子路径部署；OCR 已迁服务端，不再打包 WASM/模型
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '粉丝橱窗抽奖',
        short_name: '粉丝抽奖',
        description: '用评论截图抽取粉丝福利名额',
        theme_color: '#21867a',
        background_color: '#e8eaed',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          {
            src: './favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2,webmanifest}'],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
})
