import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
    },
  },
});

