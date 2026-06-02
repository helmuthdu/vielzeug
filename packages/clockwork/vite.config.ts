import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        debug: resolve(__dirname, 'src/debug.ts'),
        index: resolve(__dirname, 'src/index.ts'),
      },
      name: 'clockwork',
    }),
    {
      build: {
        rolldownOptions: {
          external: ['@vielzeug/ripple'],
        },
      },
    },
  ),
);
