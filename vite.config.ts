import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: true,
      clientPort: 5173
    },
    watch: {
      usePolling: true,
      interval: 1000
    },
    host: true,
    port: 5173,
    strictPort: true
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['react-toastify']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});