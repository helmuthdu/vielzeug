import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      'src/cadence/index': resolve(__dirname, 'src/cadence/index.ts'),
      'src/index': resolve(__dirname, 'src/index.ts'),
    },
    external: readWorkspaceDeps(__dirname),
    name: 'tempo',
  }),
);
