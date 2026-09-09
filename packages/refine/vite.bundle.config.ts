import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { defineConfig, mergeConfig } from 'vite';

import { getBundleConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dependencies = readWorkspaceDeps(__dirname);

export default defineConfig(
  mergeConfig(
    getBundleConfig(__dirname, {
      entry: resolve(__dirname, 'src/register.ts'),
      external: [...dependencies, /^@vielzeug\/dnd\/.+/],
      fileName: 'refine',
      name: 'Refine',
    }),
    {
      build: {
        rolldownOptions: {
          output: { globals: { '@vielzeug/dnd/drop': 'Dnd' } },
        },
      },
      css: {
        lightningcss: {
          targets: browserslistToTargets(browserslist('>= 0.25%')),
        },
        transformer: 'lightningcss',
      },
    },
  ),
);
