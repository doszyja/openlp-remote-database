import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'fs';

const manifestIcons = [
  {
    src: '/web-app-manifest-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/web-app-manifest-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/web-app-manifest-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
  {
    src: '/apple-touch-icon.png',
    sizes: '180x180',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/favicon.svg',
    sizes: 'any',
    type: 'image/svg+xml',
    purpose: 'any',
  },
];

// Read version from package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
const appVersion = packageJson.version;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-version',
      transformIndexHtml(html) {
        return html.replace(
          /<meta name="app-version" content="[^"]*" \/>/,
          `<meta name="app-version" content="${appVersion}" />`
        );
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'web-app-manifest-192x192.png',
        'web-app-manifest-512x512.png',
        'Obraz1.png',
      ],
      manifest: {
        id: '/',
        name: 'Świętochłowice Kościół Wolnych Chrześcijan - Śpiewnik',
        short_name: 'Śpiewnik',
        description:
          'Śpiewnik pieśni zborowych — przeglądaj, edytuj i synchronizuj z OpenLP. Działa offline po wczytaniu cache.',
        theme_color: '#1E3A5F',
        background_color: '#ffffff',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pl',
        categories: ['music', 'utilities'],
        icons: manifestIcons,
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/ws/], // Don't intercept API and WebSocket requests
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  build: {
    sourcemap: true, // Generate sourcemaps for production builds
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@openlp/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Proxy API requests to backend to avoid CORS issues in development
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Don't rewrite the /api path
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Silently handle WebSocket proxy errors (ECONNRESET is common when client disconnects)
            if (err.message !== 'read ECONNRESET' && err.message !== 'write ECONNRESET') {
              console.error('WebSocket proxy error:', err);
            }
          });
        },
      },
    },
  },
});
