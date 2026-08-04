import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        json: resolve(__dirname, 'src/json.ts'),
        predicates: resolve(__dirname, 'src/predicates.ts'),
      },
      external: readWorkspaceDeps(__dirname),
      name: 'spell',
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
