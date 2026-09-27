import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // regista o service worker com um ficheiro à parte (registerSW.js), e
      // não com um <script> inline, por causa da Content-Security-Policy
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'tema.js', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Bancada',
        short_name: 'Bancada',
        description: 'Folhas de obra digitais para oficinas',
        lang: 'pt-PT',
        theme_color: '#0f1012',
        background_color: '#0f1012',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // guarda a "casca" da aplicação (JS, CSS, fontes, ícones) para abrir
        // depressa e mesmo com a internet em baixo. As respostas da API
        // nunca ficam em cache: têm dados pessoais e têm de estar sempre atuais
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // em desenvolvimento, /api vai para a API (porta 3000). Assim frontend e
    // API parecem a mesma origem, como em produção, e os cookies funcionam
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    target: 'es2022',
  },
});
