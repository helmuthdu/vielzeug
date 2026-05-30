import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Secondary build: bundles all vault internals into a single vault.{js,cjs}
 * file. Run after the main vite build so
 * it adds to dist/ rather than replacing it.
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: (format) => `vault.${format === 'es' ? 'js' : 'cjs'}`,
      formats: ['es', 'cjs'],
      name: 'vault',
    },
    rolldownOptions: {
      external: [],
      output: {
        minify: true,
      },
    },
    sourcemap: true,
  },
});
