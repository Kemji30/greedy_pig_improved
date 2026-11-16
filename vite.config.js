import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run dev:api` serves the /api routes on port 3001 while you develop
    proxy: { "/api": "http://localhost:3001" },
  },
  resolve: {
    alias: {
      src: "/src",
    },
  },
})
