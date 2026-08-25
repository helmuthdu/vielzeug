/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@vielzeug\/arsenal$/, replacement: path.resolve(__dirname, '../arsenal/src/index.ts') },
      { find: /^@vielzeug\/arsenal\/async$/, replacement: path.resolve(__dirname, '../arsenal/src/async/index.ts') },
      { find: /^@vielzeug\/courier$/, replacement: path.resolve(__dirname, '../courier/src/index.ts') },
      { find: /^@vielzeug\/vault$/, replacement: path.resolve(__dirname, '../vault/src/index.ts') },
      { find: /^@vielzeug\/vault\/indexeddb$/, replacement: path.resolve(__dirname, '../vault/src/indexeddb.ts') },
    ],
  },
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    name: 'postmaster',
    setupFiles: ['fake-indexeddb/auto'],
    watch: false,
  },
});
