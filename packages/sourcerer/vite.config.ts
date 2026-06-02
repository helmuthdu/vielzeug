import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(getConfig(__dirname, { name: 'sourcerer' }), {
    build: {
      rolldownOptions: {
        external: ['@vielzeug/arsenal', '@vielzeug/ripple'],
      },
    },
  }),
);
