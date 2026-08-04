import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getBundleConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getBundleConfig(__dirname, {
      entry: resolve(__dirname, 'src/register.ts'),
      external: readWorkspaceDeps(__dirname),
      fileName: 'refine',
      name: 'Refine',
    }),
    {
      css: {
        lightningcss: {
          targets: browserslistToTargets(browserslist('>= 0.25%')),
        },
        transformer: 'lightningcss',
      },
    },
  ),
);
