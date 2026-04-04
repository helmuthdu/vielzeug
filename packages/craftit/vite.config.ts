import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        controls: resolve(__dirname, 'src/controls/index.ts'),
        directives: resolve(__dirname, 'src/directives/index.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        observers: resolve(__dirname, 'src/observers/index.ts'),
        testing: resolve(__dirname, 'src/testing/index.ts'),
      },
      name: 'craftit',
    }),
    {
      build: {
        rolldownOptions: {
          external: ['@vielzeug/stateit', '@vielzeug/floatit'],
          output: {
            minify: true,
          },
        },
      },
    },
  ),
);
