import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind and React plugins
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
