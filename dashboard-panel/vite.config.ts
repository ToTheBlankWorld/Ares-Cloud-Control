import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keep the heavy third-party libraries in stable, separately cached
        // chunks so an app-code change does not invalidate all of them.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // Normalise Windows separators so one set of patterns covers both.
          const path = id.split('\\').join('/')
          if (/\/node_modules\/(react|react-dom|scheduler|react-router)/.test(path)) return 'react'
          if (/\/node_modules\/(recharts|d3-|victory-|internmap|decimal)/.test(path)) return 'charts'
          if (/\/node_modules\/(motion|framer-motion)/.test(path)) return 'motion'
          if (/\/node_modules\/lucide-react/.test(path)) return 'icons'
          return 'vendor'
        },
      },
    },
  },
})
