import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind and React plugins
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/matches': {
        target: 'https://atleta-backend.vercel.app/api/v1',
        changeOrigin: true,
        secure: true,
      },
      '/users': {
        target: 'https://atleta-backend.vercel.app/api/v1',
        changeOrigin: true,
        secure: true,
      },
      '/api': {
        target: 'https://atleta-backend.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
