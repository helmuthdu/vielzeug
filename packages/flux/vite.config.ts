import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        async: resolve(__dirname, 'src/async.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        subjects: resolve(__dirname, 'src/subjects.ts'),
      },
      name: 'flux',
    }),
    {
      build: {
        rolldownOptions: {
          external: readWorkspaceDeps(__dirname),
        },
      },
    },
  ),
);
