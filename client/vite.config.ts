import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/historical': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path, // Keep the path as is
      },
    },
  }
})