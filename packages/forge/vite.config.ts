import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        'adapters/validators': resolve(__dirname, 'src/adapters/validators.ts'),
        devtools: resolve(__dirname, 'src/devtools.ts'),
        'src/index': resolve(__dirname, 'src/index.ts'),
      },
      name: 'forge',
    }),
    {
      build: {
        rolldownOptions: {
          external: ['@vielzeug/arsenal', '@vielzeug/ripple'],
        },
      },
    },
  ),
);
