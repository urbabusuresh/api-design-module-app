import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import dotenv from 'dotenv'

// Load app.env properties into process.env so Vite can pick them up
if (fs.existsSync('app.env')) {
  const envConfig = dotenv.parse(fs.readFileSync('app.env'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Simple chunking to avoid module resolution issues with icons
        manualChunks: {
          'vendor': ['react', 'react-dom', 'lucide-react'],
          'swagger': ['swagger-ui-react']
        }
      }
    }
  },
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
