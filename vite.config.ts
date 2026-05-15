import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; set base accordingly.
  // In dev, base must stay '/' so localhost works unchanged.
  base: process.env.NODE_ENV === 'production' ? '/nwa-tracker/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
