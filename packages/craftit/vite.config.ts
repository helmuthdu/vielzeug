import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      index: resolve(__dirname, 'src/index.ts'),
      trial: resolve(__dirname, 'src/trial/index.ts'),
    },
    name: 'craftit',
  }),
);
