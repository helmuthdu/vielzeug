import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
      },
      name: 'flux',
    }),
    {
      build: {
        rolldownOptions: {
          external: ['@vielzeug/ripple', '@vielzeug/herald', '@vielzeug/pulse', '@vielzeug/courier'],
        },
      },
      define: {
        // Set to true in production builds so _warn.ts dev-only warnings are stripped.
        __FLUX_PROD__: 'import.meta.env.PROD',
      },
    },
  ),
);
