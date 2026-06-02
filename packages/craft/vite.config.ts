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
        observers: resolve(__dirname, 'src/observers/index.ts'),
        testing: resolve(__dirname, 'src/testing/index.ts'),
      },
      name: 'craft',
    }),
    {
      build: {
        rolldownOptions: {
          external: ['@vielzeug/arsenal', '@vielzeug/ripple', '@vielzeug/orbit'],
          output: {
            minify: true,
          },
        },
      },
    },
  ),
);
