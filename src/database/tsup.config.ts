import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'overlays/index': 'src/overlays/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['@large-event/database', 'drizzle-orm', 'pg'],
  treeshake: true,
  splitting: false,
  minify: false,
});
