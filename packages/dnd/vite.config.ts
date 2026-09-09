import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        drop: resolve(__dirname, 'src/drop.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        sortable: resolve(__dirname, 'src/sortable.ts'),
      },
      external: readWorkspaceDeps(__dirname),
      name: 'dnd',
    }),
    {},
  ),
);
