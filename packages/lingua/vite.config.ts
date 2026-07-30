import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        format: resolve(__dirname, 'src/format.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        validate: resolve(__dirname, 'src/validate.ts'),
      },
      name: 'lingua',
    }),
    {
      // The dist build IS the production artifact — bake the prod gate in so
      // published ESM/CJS ships with dev warnings compiled out. Without this,
      // `_dev.ts`'s gate is always open: warns fire in prod AND `validateCatalogInDev()`
      // lazily fetches the validate chunk at runtime — the exact thing its design
      // promises can't happen.
      define: {
        'globalThis.__LINGUA_PROD__': 'true',
      },
    },
  ),
);
