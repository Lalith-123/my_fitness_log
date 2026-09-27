import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Fitness Log',
        short_name: 'Fitness Log',
        description: 'Private, local-first calorie and weight tracking.',
        theme_color: '#0f5132',
        background_color: '#faf9f6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  // Where the built app is served from, which has to match the host:
  //
  //   GitHub Pages  a project site lives under /<repo-name>/, so assets have to
  //                 be prefixed or every one of them 404s
  //   Vercel        serves the domain root, so the prefix must be absent
  //   local dev     root, same as Vercel
  //
  // BASE_PATH is the explicit override and wins when set: the Pages workflow
  // passes the real path in, and `npm run deploy:pages` passes it on the command
  // line. GITHUB_ACTIONS is the fallback so a workflow run is still correct even
  // if that variable is ever dropped.
  base:
    process.env.BASE_PATH ??
    (process.env.GITHUB_ACTIONS === 'true' ? '/my_fitness_log/' : '/'),
});
