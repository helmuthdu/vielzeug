import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Entry keys below map 1:1 onto the `exports` map in package.json (dist/devtools.js,
// dist/history.js, dist/ssr/index.js) — only 'src/index' gets getConfig()'s special-cased
// 'index.js' rename. Do not reintroduce a 'src/' prefix on the other keys: that mismatch
// between build output and package.json's `exports` paths previously made every sub-path
// import (`@vielzeug/ripple/devtools`, `/history`, `/ssr`) 404 once published.
const base = getConfig(__dirname, {
  entry: {
    devtools: resolve(__dirname, 'src/devtools.ts'),
    history: resolve(__dirname, 'src/history.ts'),
    'src/index': resolve(__dirname, 'src/index.ts'),
    'ssr/index': resolve(__dirname, 'src/ssr/index.ts'),
  },
  name: 'ripple',
});

export default defineConfig({
  ...base,
  build: {
    ...base.build,
    rolldownOptions: {
      ...base.build?.rolldownOptions,
      external: ['node:async_hooks'],
    },
  },
});
