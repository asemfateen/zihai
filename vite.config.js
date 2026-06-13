import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
      ignored: ['**/backend/**'],
    },
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || 3002}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          { urlPattern: /\/api\/word\/.*/i, handler: 'NetworkFirst',
            options: { cacheName: 'api-words', expiration: { maxEntries: 100, maxAgeSeconds: 60*60*24*7 }, cacheableResponse: { statuses: [0,200] } } },
          { urlPattern: /\/api\/search.*/i, handler: 'NetworkFirst',
            options: { cacheName: 'api-search', expiration: { maxEntries: 50, maxAgeSeconds: 60*60*24*7 }, cacheableResponse: { statuses: [0,200] } } },
        ],
      },
      manifest: {
        name: 'Zihai — Chinese Dictionary',
        short_name: 'Zihai',
        description: 'Learn Chinese characters with stroke order, pinyin, and vocabulary lists',
        start_url: '/',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
