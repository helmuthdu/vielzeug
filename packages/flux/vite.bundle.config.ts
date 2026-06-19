import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getBundleConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getBundleConfig(__dirname, {
    external: ['@vielzeug/ripple', '@vielzeug/herald', '@vielzeug/pulse', '@vielzeug/courier'],
    fileName: 'flux',
    name: 'Flux',
  }),
);
