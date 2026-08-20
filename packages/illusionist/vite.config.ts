import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getConfig(__dirname, {
    entry: {
      'src/commerce/index': resolve(__dirname, 'src/commerce/index.ts'),
      'src/date/index': resolve(__dirname, 'src/date/index.ts'),
      'src/finance/index': resolve(__dirname, 'src/finance/index.ts'),
      'src/index': resolve(__dirname, 'src/index.ts'),
      'src/internet/index': resolve(__dirname, 'src/internet/index.ts'),
      'src/locales/de': resolve(__dirname, 'src/locales/de.ts'),
      'src/locales/en': resolve(__dirname, 'src/locales/en.ts'),
      'src/locales/index': resolve(__dirname, 'src/locales/index.ts'),
      'src/location/index': resolve(__dirname, 'src/location/index.ts'),
      'src/lorem/index': resolve(__dirname, 'src/lorem/index.ts'),
      'src/person/index': resolve(__dirname, 'src/person/index.ts'),
      'src/seed/index': resolve(__dirname, 'src/seed/index.ts'),
      'src/system/index': resolve(__dirname, 'src/system/index.ts'),
    },
    external: ['@vielzeug/arsenal', '@vielzeug/coins', '@vielzeug/tempo'],
    name: 'illusionist',
  }),
);
