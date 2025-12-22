import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'fs';

const manifestIcons = [
  {
    src: '/android/android-launchericon-192-192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/android/android-launchericon-512-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/ios/180.png',
    sizes: '180x180',
    type: 'image/png',
    purpose: 'any apple-touch-icon',
  },
  {
    src: '/ios/512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
  {
    src: '/windows11/SplashScreen.scale-200.png',
    sizes: '1240x600',
    type: 'image/png',
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
        'android/android-launchericon-192-192.png',
        'android/android-launchericon-512-512.png',
        'ios/32.png',
        'ios/180.png',
        'ios/512.png',
        'windows11/SplashScreen.scale-200.png',
        'Obraz1.png',
      ],
      manifest: {
        name: 'OpenLP Remote Database',
        short_name: 'OpenLP DB',
        description: 'Zarządzaj pieśniami zborowymi i synchronizuj je z OpenLP nawet offline.',
        theme_color: '#1E3A5F',
        background_color: '#ffffff',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        lang: 'pl',
        icons: manifestIcons,
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
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

