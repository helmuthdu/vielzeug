import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const oreExternals = ['@vielzeug/ripple'];

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        devtools: resolve(__dirname, 'src/devtools.ts'),
        directives: resolve(__dirname, 'src/directives/index.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        observers: resolve(__dirname, 'src/observers/index.ts'),
        testing: resolve(__dirname, 'src/testing/index.ts'),
      },
      name: 'ore',
    }),
    {
      build: {
        rolldownOptions: {
          external: oreExternals,
          output: {
            minify: true,
          },
        },
      },
    },
  ),
);
