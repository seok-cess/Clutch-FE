import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api 요청은 Spring Boot(8080)로 프록시 → CORS 문제 없음
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
