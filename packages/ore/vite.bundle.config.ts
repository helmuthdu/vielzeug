import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getBundleConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getBundleConfig(__dirname, {
      external: ['@vielzeug/ripple'],
      fileName: 'ore',
      name: 'Ore',
    }),
    {
      define: {
        'globalThis.__ORE_PROD__': 'true',
      },
    },
  ),
);
