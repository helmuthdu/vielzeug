import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Entry keys map directly to package exports. Only `src/index` receives
// getConfig()'s special-cased `index.js` output name.
export default defineConfig(
  getConfig(__dirname, {
    entry: {
      'src/index': resolve(__dirname, 'src/index.ts'),
    },
    name: 'ripple',
  }),
);
