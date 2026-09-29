import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      'src/index': resolve(__dirname, 'src/index.ts'),
      'src/locales/de': resolve(__dirname, 'src/locales/de.ts'),
      'src/locales/en': resolve(__dirname, 'src/locales/en.ts'),
      'src/locales/index': resolve(__dirname, 'src/locales/index.ts'),
    },
    external: ['@vielzeug/arsenal', '@vielzeug/coins', '@vielzeug/tempo'],
    name: 'illusionist',
  }),
);
