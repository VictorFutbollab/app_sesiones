/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` → PWA instalable en dist/ (service worker + manifest), funciona sin conexión.
// `npm run build:demo` → un único HTML autocontenido (prototipo para enseñar a entrenadores, sin service worker).
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'demo' ? viteSingleFile() : VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'FutbolLab Sesiones',
        short_name: 'Sesiones',
        description: 'Prepara el entrenamiento en 5 minutos y dirígelo desde el campo.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#EEF2F7',
        theme_color: '#0F2440',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Las llamadas a Supabase nunca se cachean en el service worker: los datos van por IndexedDB.
        navigateFallbackDenylist: [/^\/auth\//],
      },
    }),
  ],
  build: mode === 'demo' ? { outDir: 'dist-demo', chunkSizeWarningLimit: 4000 } : undefined,
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  test: { environment: 'node', pool: 'vmThreads', include: ['src/**/*.test.ts', 'supabase/**/*.test.ts'] },
}))
