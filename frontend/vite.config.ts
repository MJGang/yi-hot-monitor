import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const backendTarget = 'http://localhost:3001'

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
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
      },

    },
  },
})
