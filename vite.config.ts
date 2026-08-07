import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

const REPO = 'price-comparator'

export default defineConfig({
  // GitHub Pages sirve el sitio en /<repo>/ (si el repo se llama distinto,
  // actualizar REPO y el base del manifest).
  base: `/${REPO}/`,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        lang: 'es',
        name: 'Comparador de Precios',
        short_name: 'Precios',
        description: 'Comparador de precios para uso personal',
        theme_color: '#4338ca',
        background_color: '#4338ca',
        display: 'standalone',
        start_url: `/${REPO}/`,
        scope: `/${REPO}/`,
        icons: [
          {
            src: `/${REPO}/pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `/${REPO}/pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `/${REPO}/pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // precache de assets estáticos (cache-first) al instalarse la PWA
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
