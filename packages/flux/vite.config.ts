import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        async: resolve(__dirname, 'src/async.ts'),
        courier: resolve(__dirname, 'src/courier.ts'),
        herald: resolve(__dirname, 'src/herald.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        pulse: resolve(__dirname, 'src/pulse.ts'),
        ripple: resolve(__dirname, 'src/ripple.ts'),
        subjects: resolve(__dirname, 'src/subjects.ts'),
      },
      name: 'flux',
    }),
    {
      build: {
        rolldownOptions: {
          external: readWorkspaceDeps(__dirname),
        },
      },
    },
  ),
);
