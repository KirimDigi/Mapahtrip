import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api-local-wa': {
        target: 'http://localhost:2026',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-local-wa/, ''),
      },
      '/api-wa': {
        target: 'https://hypnotic-curtly-dealt.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-wa/, ''),
      },
    },
  },
})
