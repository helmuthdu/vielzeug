/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@vielzeug/craftit/test': path.resolve(__dirname, '../craftit/src/test/test.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    hookTimeout: 10_000,
    name: 'buildit',
    pool: 'forks',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    teardownTimeout: 10_000,
    testTimeout: 10_000,
  },
});
