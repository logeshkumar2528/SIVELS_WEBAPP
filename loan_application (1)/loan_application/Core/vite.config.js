import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'react': fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      'react/jsx-runtime': fileURLToPath(new URL('./node_modules/react/jsx-runtime', import.meta.url)),
      'react/jsx-dev-runtime': fileURLToPath(new URL('./node_modules/react/jsx-dev-runtime', import.meta.url)),
      'react-router-dom': fileURLToPath(new URL('./node_modules/react-router-dom', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-router-dom'],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
