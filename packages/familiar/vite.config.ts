import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        'src/index': resolve(__dirname, 'src/index.ts'),
        'src/testing': resolve(__dirname, 'src/testing/index.ts'),
      },
      name: 'familiar',
    }),
    {
      build: {
        rolldownOptions: {
          external: ['@vielzeug/arsenal'],
        },
      },
    },
  ),
);
