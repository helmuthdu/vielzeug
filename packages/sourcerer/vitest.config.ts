/// <reference types="vitest" />

import path from 'node:path';
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
    globals: true,
    include: [path.resolve(__dirname, './src/**/__tests__/*.test.ts')],
    name: 'sourcerer',
    watch: false,
  },
});
