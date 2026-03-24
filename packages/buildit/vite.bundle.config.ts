import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Secondary build: bundles all buildit internals into a single buildit.{js,cjs}
 * file (with @vielzeug/stateit kept external). Run after the main vite build so
 * it adds to dist/ rather than replacing it.
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: (format) => `buildit.${format === 'es' ? 'js' : 'cjs'}`,
      formats: ['es', 'cjs'],
      name: 'buildit',
    },
    rolldownOptions: {
      external: [
        '@vielzeug/craftit',
        '@vielzeug/dragit',
        '@vielzeug/floatit',
        '@vielzeug/virtualit',
        '@vielzeug/toolkit',
      ],
      output: {
        minify: true,
      },
    },
    sourcemap: true,
  },
  css: {
    lightningcss: {
      targets: browserslistToTargets(browserslist('>= 0.25%')),
    },
    transformer: 'lightningcss',
  },
});
