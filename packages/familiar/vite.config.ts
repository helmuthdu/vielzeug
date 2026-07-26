import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      index: resolve(__dirname, 'src/index.ts'),
      protocol: resolve(__dirname, 'src/protocol.ts'),
      testing: resolve(__dirname, 'src/testing/index.ts'),
    },
    external: readWorkspaceDeps(__dirname),
    name: 'familiar',
  }),
);
