import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getBundleConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(getBundleConfig(__dirname, { fileName: 'lingua', name: 'Lingua' }), {
    // See vite.config.ts — the prod gate must be baked into every published artifact.
    define: {
      'globalThis.__LINGUA_PROD__': 'true',
    },
  }),
);
