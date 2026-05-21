import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    name: 'stateit',
    entry: {
      'src/index': resolve(__dirname, 'src/index.ts'),
      'src/adapters/svelte': resolve(__dirname, 'src/adapters/svelte.ts'),
      'src/adapters/react': resolve(__dirname, 'src/adapters/react.ts'),
      'src/adapters/vue': resolve(__dirname, 'src/adapters/vue.ts'),
    },
  }),
);
