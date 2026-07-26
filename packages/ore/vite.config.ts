import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        directives: resolve(__dirname, 'src/directives/index.ts'),
        forms: resolve(__dirname, 'src/forms/index.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        observers: resolve(__dirname, 'src/observers/index.ts'),
        testing: resolve(__dirname, 'src/testing/index.ts'),
      },
      external: readWorkspaceDeps(__dirname),
      name: 'ore',
    }),
    {
      build: {
        rolldownOptions: {
          output: {
            minify: true,
          },
        },
      },
    },
  ),
);
