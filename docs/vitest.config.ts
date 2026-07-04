/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { buildVielzeugSrcAliases } from '../scripts/vielzeug-packages';
import { componentPreviewPlugin } from './.vitepress/plugins/component-preview/plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [componentPreviewPlugin()],
  resolve: {
    alias: {
      ...buildVielzeugSrcAliases(path.resolve(__dirname, '../packages')),
      vue: path.resolve(__dirname, '../node_modules/vue'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      '.vitepress/theme/components/repl/**/__tests__/**/*.test.ts',
      '.vitepress/theme/components/component-preview/**/__tests__/**/*.test.ts',
    ],
    name: 'docs',
    root: __dirname,
  },
});
