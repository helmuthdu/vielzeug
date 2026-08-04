import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// external used to hand-list '@vielzeug/arsenal', which src/ no longer imports and
// package.json never declared as a dependency — readWorkspaceDeps() derives from
// package.json instead, so this can't silently drift out of sync again.
export default defineConfig(
  getConfig(__dirname, {
    entry: {
      devtools: resolve(__dirname, 'src/devtools.ts'),
      index: resolve(__dirname, 'src/index.ts'),
      testing: resolve(__dirname, 'src/testing/index.ts'),
    },
    external: readWorkspaceDeps(__dirname),
    name: 'herald',
  }),
);
