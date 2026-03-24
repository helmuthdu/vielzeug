/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@vielzeug\/craftit\/test$/, replacement: path.resolve(__dirname, '../craftit/src/test/test.ts') },
      {
        find: /^@vielzeug\/craftit\/directives$/,
        replacement: path.resolve(__dirname, '../craftit/src/directives/index.ts'),
      },
      { find: /^@vielzeug\/craftit\/labs$/, replacement: path.resolve(__dirname, '../craftit/src/labs/index.ts') },
      { find: /^@vielzeug\/craftit$/, replacement: path.resolve(__dirname, '../craftit/src/index.ts') },
      { find: /^@vielzeug\/floatit$/, replacement: path.resolve(__dirname, '../floatit/src/index.ts') },
      { find: /^@vielzeug\/toolkit$/, replacement: path.resolve(__dirname, '../toolkit/src/index.ts') },
    ],
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
