import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 6444,
    proxy: {
      // Forward all /api/* requests to the Express backend
      '/api': {
        target: 'http://localhost:6445',
        changeOrigin: true,
        secure: false,
      },
      // Forward all /auth/* requests to the Express backend
      '/auth': {
        target: 'http://localhost:6445',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
