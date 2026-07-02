/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { buildVielzeugSrcAliases } from '../scripts/vielzeug-packages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: buildVielzeugSrcAliases(path.resolve(__dirname, '../packages')),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['.vitepress/theme/components/repl/**/__tests__/**/*.test.ts'],
    name: 'docs',
    root: __dirname,
  },
});
