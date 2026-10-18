import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the browser talks to Vite, which proxies /api to the Express server,
// so no CORS or backend URL is needed locally. For a separately hosted API set VITE_API_URL.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true } },
  },
  test: { environment: 'node', include: ['src/**/*.test.js'] },
});
