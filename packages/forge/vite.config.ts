import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      dom: resolve(__dirname, 'src/dom.ts'),
      'form-data': resolve(__dirname, 'src/form-data.ts'),
      persist: resolve(__dirname, 'src/persist.ts'),
      schema: resolve(__dirname, 'src/schema.ts'),
      'src/index': resolve(__dirname, 'src/index.ts'),
    },
    external: readWorkspaceDeps(__dirname),
    name: 'forge',
  }),
);
