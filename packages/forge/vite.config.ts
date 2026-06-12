import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        'src/adapters/react': resolve(__dirname, 'src/adapters/react.ts'),
        'src/adapters/svelte': resolve(__dirname, 'src/adapters/svelte.ts'),
        'src/adapters/validators': resolve(__dirname, 'src/adapters/validators.ts'),
        'src/adapters/vue': resolve(__dirname, 'src/adapters/vue.ts'),
        'src/index': resolve(__dirname, 'src/index.ts'),
      },
      name: 'forge',
    }),
    {
      build: {
        rolldownOptions: {
          external: ['@vielzeug/arsenal', '@vielzeug/ripple'],
        },
      },
    },
  ),
);
