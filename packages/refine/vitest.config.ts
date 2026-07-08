/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@vielzeug\/ore\/observers$/,
        replacement: path.resolve(__dirname, '../ore/src/observers/index.ts'),
      },
      {
        find: /^@vielzeug\/ore\/testing$/,
        replacement: path.resolve(__dirname, '../ore/src/testing/index.ts'),
      },
      {
        find: /^@vielzeug\/ore\/forms$/,
        replacement: path.resolve(__dirname, '../ore/src/forms/index.ts'),
      },
      { find: /^@vielzeug\/ore$/, replacement: path.resolve(__dirname, '../ore/src/index.ts') },
      { find: /^@vielzeug\/dnd$/, replacement: path.resolve(__dirname, '../dnd/src/index.ts') },
      { find: /^@vielzeug\/orbit$/, replacement: path.resolve(__dirname, '../orbit/src/index.ts') },
      { find: /^@vielzeug\/ripple$/, replacement: path.resolve(__dirname, '../ripple/src/index.ts') },
      { find: /^@vielzeug\/arsenal$/, replacement: path.resolve(__dirname, '../arsenal/src/index.ts') },
      { find: /^@vielzeug\/scroll$/, replacement: path.resolve(__dirname, '../scroll/src/index.ts') },
      { find: /^@vielzeug\/scroll\/dom$/, replacement: path.resolve(__dirname, '../scroll/src/dom/index.ts') },
      { find: /^@vielzeug\/tempo$/, replacement: path.resolve(__dirname, '../tempo/src/index.ts') },
    ],
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    hookTimeout: 10_000,
    name: 'refine',
    pool: 'forks',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    teardownTimeout: 10_000,
    testTimeout: 10_000,
    watch: false,
  },
});
