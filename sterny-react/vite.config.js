import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/vite.config.js', '**/.env', '**/.env.*', '**/node_modules/**'],
    },
  },
})
