import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getBundleConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// sourcerer's externals are exactly its own package.json dependencies, nothing more — derive
// them instead of hand-listing the same names a second time (see readWorkspaceDeps()'s JSDoc).
export default defineConfig(
  getBundleConfig(__dirname, {
    external: readWorkspaceDeps(__dirname),
    fileName: 'sourcerer',
    name: 'Sourcerer',
  }),
);
