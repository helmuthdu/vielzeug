import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
  .process?.env;
const disablePluginTimings = processEnv?.CI === 'true' || processEnv?.RUSHSTACK_FILE_ERROR_BASE_FOLDER !== undefined;

/**
 * Secondary build: bundles all block internals into a single block.{js,cjs}
 * file (with /ripple kept external). Run after the main vite build so
 * it adds to dist/ rather than replacing it.
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: (format) => `sigil.${format === 'es' ? 'js' : 'cjs'}`,
      formats: ['es', 'cjs'],
      name: 'sigil',
    },
    rolldownOptions: {
      checks: {
        pluginTimings: !disablePluginTimings,
      },
      external: ['/craft', '/grip', '/orbit', '/scroll', '@vielzeug/arsenal'],
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
