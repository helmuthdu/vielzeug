import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getBundleConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getBundleConfig(__dirname, {
    external: ['@js-temporal/polyfill', '@vielzeug/arsenal'],
    fileName: 'tempo',
    globals: { '@js-temporal/polyfill': 'Temporal' },
    name: 'Tempo',
  }),
);
