import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';
import TeamDConfig from '../../teamd.config.mts';

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['react-native', '@large-event/mobile-components', '@teamd/mobile-components'],
  },
  server: {
    port: TeamDConfig.webAdmin.port,
    proxy: {
      '/api': {
        target: TeamDConfig.api.url.local,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true,
    rollupOptions: {
      external: ['react-native'],
    },
  },
  define: {
    'import.meta.env.VITE_PORT': JSON.stringify(TeamDConfig.webAdmin.port),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.JWT_SECRET': JSON.stringify(''),
  },
});
