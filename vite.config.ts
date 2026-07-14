import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// base '/finance/' saat build (GitHub Pages sub-path), '/' saat dev lokal.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/finance/' : '/',
  plugins: [react()],
}))
