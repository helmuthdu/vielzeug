/// <reference types="vitest" />

import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@vielzeug/arsenal': path.resolve(__dirname, '../arsenal/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://vault.test',
      },
    },
    globals: true,
    name: 'vault',
    setupFiles: [resolve(__dirname, './vitest.setup.ts'), 'fake-indexeddb/auto'],
    watch: false,
  },
});
