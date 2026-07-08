import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getBundleConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getBundleConfig(__dirname, {
      // IIFE-only aggregate entry (index + directives + forms + observers merged
      // onto one `window.Ore` global) — see src/iife.ts for why.
      entry: resolve(__dirname, 'src/iife.ts'),
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
