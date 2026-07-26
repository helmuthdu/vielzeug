import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        devtools: resolve(__dirname, 'src/devtools.ts'),
        'src/index': resolve(__dirname, 'src/index.ts'),
      },
      external: readWorkspaceDeps(__dirname),
      name: 'courier',
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
