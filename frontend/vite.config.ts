import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // Libraries change far less often than the app: give them their own
          // long-lived chunks so a new release only re-downloads app code.
          codeSplitting: {
            groups: [
              { name: 'vendor-react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/, priority: 30 },
              { name: 'vendor-query', test: /[\\/]node_modules[\\/]@tanstack[\\/]/, priority: 25 },
              { name: 'vendor-leaflet', test: /[\\/]node_modules[\\/](leaflet|react-leaflet|@react-leaflet)[\\/]/, priority: 25 },
              { name: 'vendor-ui', test: /[\\/]node_modules[\\/](@base-ui|@floating-ui|lucide-react)[\\/]/, priority: 20 },
            ],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: env.DEV_API_TARGET ?? 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})

