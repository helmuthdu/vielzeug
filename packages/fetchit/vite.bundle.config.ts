import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Secondary build: bundles all fetchit internals into a single fetchit.{js,cjs}
 * file (with @vielzeug/toolkit kept external). Run after the main vite build so
 * it adds to dist/ rather than replacing it.
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: (format) => `fetchit.${format === 'es' ? 'js' : 'cjs'}`,
      formats: ['es', 'cjs'],
      name: 'fetchit',
    },
    rolldownOptions: {
      external: ['@vielzeug/toolkit'],
      output: {
        minify: true,
      },
    },
    sourcemap: true,
  },
});
