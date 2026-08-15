import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      dom: resolve(__dirname, 'src/dom.ts'),
      spell: resolve(__dirname, 'src/spell.ts'),
      'src/index': resolve(__dirname, 'src/index.ts'),
      vault: resolve(__dirname, 'src/vault.ts'),
    },
    external: readWorkspaceDeps(__dirname),
    name: 'forge',
  }),
);
