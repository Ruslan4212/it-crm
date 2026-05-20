import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const certDir = fs.existsSync('/certs') ? '/certs' : '../certs'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    https: {
      key: fs.readFileSync(`${certDir}/dev.key`),
      cert: fs.readFileSync(`${certDir}/dev.crt`),
    },
    proxy: {
      '/api': 'http://backend:3000',
    },
  },
})
