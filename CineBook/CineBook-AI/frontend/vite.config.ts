import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backend = env.BACKEND_BASE_URL || 'http://localhost:8080';
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': { target: backend, changeOrigin: false, xfwd: true },
        '/oauth2': { target: backend, changeOrigin: false, xfwd: true },
        '/login/oauth2': { target: backend, changeOrigin: false, xfwd: true }
      }
    },
    build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 900 }
  };
});
