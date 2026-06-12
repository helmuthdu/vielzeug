import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        devtools: resolve(__dirname, 'src/devtools.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        inline: resolve(__dirname, 'src/inline.ts'),
        presets: resolve(__dirname, 'src/presets.ts'),
        reactive: resolve(__dirname, 'src/reactive.ts'),
        ssr: resolve(__dirname, 'src/ssr.ts'),
      },
      name: 'orbit',
    }),
    {
      build: {
        rolldownOptions: {
          external: ['@vielzeug/arsenal', '@vielzeug/ripple'],
          output: {
            minify: true,
          },
        },
      },
    },
  ),
);
