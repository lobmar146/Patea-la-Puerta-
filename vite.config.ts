import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiPort = Number(process.env.PORT ?? 3000);

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], realtime: ['socket.io-client'], qr: ['qrcode'] } } },
  },
  server: {
    port: 5173,
    host: true, // accesible desde los celulares de la red local
    proxy: {
      '/api': `http://localhost:${apiPort}`,
      '/socket.io': { target: `http://localhost:${apiPort}`, ws: true },
    },
  },
});
