import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// sourcerer's externals are exactly its own package.json dependencies, nothing more — derive
// them instead of hand-listing the same names a second time (see readWorkspaceDeps()'s JSDoc).
export default defineConfig(
  getConfig(__dirname, {
    entry: {
      devtools: resolve(__dirname, 'src/devtools.ts'),
      'src/index': resolve(__dirname, 'src/index.ts'),
    },
    external: readWorkspaceDeps(__dirname),
    name: 'sourcerer',
  }),
);
