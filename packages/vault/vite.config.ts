import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      index: resolve(__dirname, 'src/index.ts'),
      indexeddb: resolve(__dirname, 'src/indexeddb.ts'),
      'local-storage': resolve(__dirname, 'src/local-storage.ts'),
      memory: resolve(__dirname, 'src/memory.ts'),
      'session-storage': resolve(__dirname, 'src/session-storage.ts'),
      sqlite: resolve(__dirname, 'src/sqlite.ts'),
    },
    name: 'vault',
  }),
);
