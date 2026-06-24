import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to backend during dev (optional but nice)
    proxy: {
      '/jobs': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
