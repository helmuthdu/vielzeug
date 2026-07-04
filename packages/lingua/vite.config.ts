import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      format: resolve(__dirname, 'src/format.ts'),
      index: resolve(__dirname, 'src/index.ts'),
      validate: resolve(__dirname, 'src/validate.ts'),
    },
    name: 'lingua',
  }),
);
