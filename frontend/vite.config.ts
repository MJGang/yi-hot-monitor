import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const backendTarget = process.env.VITE_BACKEND_TARGET || 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
