import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(getConfig(__dirname, { external: readWorkspaceDeps(__dirname), name: 'spell' }), {
    build: {
      rolldownOptions: {
        output: {
          minify: true,
        },
      },
    },
  }),
);
