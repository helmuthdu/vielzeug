import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const base = getConfig(__dirname, {
  entry: {
    'src/debug': resolve(__dirname, 'src/debug.ts'),
    'src/index': resolve(__dirname, 'src/index.ts'),
    'src/ssr/index': resolve(__dirname, 'src/ssr/index.ts'),
  },
  name: 'ripple',
});

export default defineConfig({
  ...base,
  build: {
    ...base.build,
    rolldownOptions: {
      ...base.build.rolldownOptions,
      external: ['async_hooks'],
    },
  },
});
