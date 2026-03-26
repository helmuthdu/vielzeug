import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Secondary build: bundles all craftit internals into a single craftit.{js,cjs}
 * file (with @vielzeug/stateit kept external). Run after the main vite build so
 * it adds to dist/ rather than replacing it.
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: (format) => `craftit.${format === 'es' ? 'js' : 'cjs'}`,
      formats: ['es', 'cjs'],
      name: 'craftit',
    },
    rolldownOptions: {
      external: ['@vielzeug/stateit'],
      output: {
        minify: true,
      },
    },
    sourcemap: true,
  },
});
