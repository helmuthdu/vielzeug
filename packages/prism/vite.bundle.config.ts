import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getBundleConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getBundleConfig(__dirname, {
    external: readWorkspaceDeps(__dirname),
    fileName: 'prism',
    name: 'Prism',
  }),
);
