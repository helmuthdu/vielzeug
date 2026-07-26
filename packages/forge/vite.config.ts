import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      'adapters/validators': resolve(__dirname, 'src/adapters/validators.ts'),
      devtools: resolve(__dirname, 'src/devtools.ts'),
      'src/index': resolve(__dirname, 'src/index.ts'),
    },
    external: readWorkspaceDeps(__dirname),
    name: 'forge',
  }),
);
