import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Local dev: the site calls the API on its own address (localhost:5173/api), and Vite forwards
  // it to Django. Same site -> the httpOnly login session cookie works without cross-site rules.
  // (On Vercel the same is done with a rewrite of /api/* to the backend.)
  const backend = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/media': { target: backend, changeOrigin: true },
      },
    },
  }
})
