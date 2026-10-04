import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dedicated port with strictPort: refuses to start if this exact address is already in use.
  // It does NOT detect another server on the same port over the other IP family (IPv4 vs IPv6):
  // after starting, check with lsof -nP -iTCP:5173 -sTCP:LISTEN that only one process listens.
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/vite.config.js', '**/.env', '**/.env.*', '**/node_modules/**'],
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
