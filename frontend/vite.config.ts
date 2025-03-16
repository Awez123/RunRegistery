import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss(),],
  base: '/',
  server: {
    host: "0.0.0.0",  // Allow access from Docker
    port: 5173,
  }
})
