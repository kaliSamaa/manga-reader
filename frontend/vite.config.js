import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/suwayomi': {
        target: 'http://suwayomi:4567',
        rewrite: path => path.replace(/^\/api\/suwayomi/, ''),
        changeOrigin: true,
      },
    },
  },
})
