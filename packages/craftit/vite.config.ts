import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        'directives/index': resolve(__dirname, 'src/directives/index.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        labs: resolve(__dirname, 'src/labs/index.ts'),
        test: resolve(__dirname, 'src/test/index.ts'),
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
