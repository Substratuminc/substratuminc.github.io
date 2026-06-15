import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',  // Root domain — substratuminc.github.io serves from '/' directly
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('rot-js')) return 'rot';
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('zustand')) return 'zustand';
            if (id.includes('dexie')) return 'dexie';
            return 'vendor';
          }
        }
      },
    },
  },
});
