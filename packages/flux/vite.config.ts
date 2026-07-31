import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// herald/pulse/courier are optional peers (adapters flux integrates with if present), not
// regular dependencies — readWorkspaceDeps() only covers the required '@vielzeug/ripple'
// portion, so the optional ones stay explicit here rather than being silently dropped.
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
          external: [...readWorkspaceDeps(__dirname), '@vielzeug/herald', '@vielzeug/pulse', '@vielzeug/courier'],
        },
      },
    },
  ),
);
