import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@tanstack/react-router', '@large-event/api', '@large-event/api-types'],
  treeshake: true,
  splitting: false,
  minify: false,
});
