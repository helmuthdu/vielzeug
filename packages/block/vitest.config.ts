/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@vielzeug\/craft\/testing$/,
        replacement: path.resolve(__dirname, '../craft/src/testing/index.ts'),
      },
      {
        find: /^@vielzeug\/craft\/observers$/,
        replacement: path.resolve(__dirname, '../craft/src/observers/index.ts'),
      },
      { find: /^@vielzeug\/craft$/, replacement: path.resolve(__dirname, '../craft/src/index.ts') },
      { find: /^@vielzeug\/grip$/, replacement: path.resolve(__dirname, '../grip/src/index.ts') },
      { find: /^@vielzeug\/orbit$/, replacement: path.resolve(__dirname, '../orbit/src/index.ts') },
      { find: /^@vielzeug\/ripple$/, replacement: path.resolve(__dirname, '../ripple/src/index.ts') },
      { find: /^@vielzeug\/toolkit$/, replacement: path.resolve(__dirname, '../toolkit/src/index.ts') },
      { find: /^@vielzeug\/scroll$/, replacement: path.resolve(__dirname, '../scroll/src/index.ts') },
      { find: /^@vielzeug\/scroll\/dom$/, replacement: path.resolve(__dirname, '../scroll/src/dom/index.ts') },
    ],
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    hookTimeout: 10_000,
    name: 'block',
    pool: 'forks',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    teardownTimeout: 10_000,
    testTimeout: 10_000,
    watch: false,
  },
});
