import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

/** Serve onnxruntime-web wasm from /ort/ so version matches the installed package */
function copyOrtWasmPlugin(): Plugin {
  const copy = () => {
    const src = resolve(rootDir, 'node_modules/onnxruntime-web/dist')
    const dst = resolve(rootDir, 'public/ort')
    if (!existsSync(src)) return
    if (!existsSync(dst)) mkdirSync(dst, { recursive: true })
    for (const name of readdirSync(src)) {
      // Only runtime wasm binaries + their glue loaders (not full ort.*.mjs bundles)
      if (!/^ort-wasm.*\.(wasm|mjs)$/.test(name)) continue
      const srcPath = join(src, name)
      const dstPath = join(dst, name)
      try {
        const srcMtime = statSync(srcPath).mtimeMs
        const dstMtime = existsSync(dstPath) ? statSync(dstPath).mtimeMs : 0
        if (srcMtime > dstMtime) copyFileSync(srcPath, dstPath)
      } catch {
        // best-effort
      }
    }
  }

  return {
    name: 'copy-ort-wasm',
    buildStart: copy,
    configureServer() {
      copy()
    },
  }
}

// './' 便于 GitHub Pages 子路径、自定义域名、任意静态服务器部署
export default defineConfig({
  base: './',
  plugins: [
    react(),
    copyOrtWasmPlugin(),
    VitePWA({
      // OCR 大包本来就不适合 SW 预缓存；自毁式 SW 用于清掉历史部署留下的旧缓存
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '粉丝橱窗抽奖',
        short_name: '粉丝抽奖',
        description: '用评论截图抽取粉丝福利名额',
        theme_color: '#2a9d8f',
        background_color: '#f3faf7',
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
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2,webmanifest}'],
        globIgnores: [
          '**/ort/**',
          '**/*.wasm',
          '**/worker-entry-*.js',
          '**/dist-*.js',
          '**/ort.bundle*.js',
        ],
        navigateFallbackDenylist: [/^\/ort\//],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web', '@techstark/opencv-js'],
  },
  worker: {
    format: 'es',
  },
  build: {
    chunkSizeWarningLimit: 15000,
  },
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
})
