import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // '@/' → src/ (ya existía)
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // '@shared/' → shared/ en la raíz del monorepo
      // Permite: import { SyncPushRequestSchema } from '@shared/contracts/sync'
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    // Dev proxy: redirige /api/* al backend (evita CORS en desarrollo local)
    // Configura VITE_DEV_API_TARGET en .env.local con la URL de tu backend
    proxy: process.env.VITE_DEV_API_TARGET
      ? {
          '/api': {
            target: process.env.VITE_DEV_API_TARGET,
            changeOrigin: true,
            secure: false,
          },
        }
      : undefined,
  },
})
