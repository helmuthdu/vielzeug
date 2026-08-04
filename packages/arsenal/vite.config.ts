import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      'src/array/index': resolve(__dirname, 'src/array/index.ts'),
      'src/async/index': resolve(__dirname, 'src/async/index.ts'),
      'src/cache/index': resolve(__dirname, 'src/cache/index.ts'),
      'src/function/index': resolve(__dirname, 'src/function/index.ts'),
      'src/guards/index': resolve(__dirname, 'src/guards/index.ts'),
      'src/index': resolve(__dirname, 'src/index.ts'),
      'src/math/index': resolve(__dirname, 'src/math/index.ts'),
      'src/object/index': resolve(__dirname, 'src/object/index.ts'),
      'src/random/index': resolve(__dirname, 'src/random/index.ts'),
      'src/string/index': resolve(__dirname, 'src/string/index.ts'),
    },
    name: 'arsenal',
  }),
);
