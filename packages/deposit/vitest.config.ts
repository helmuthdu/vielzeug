/// <reference types="vitest" />
import { fileURLToPath } from 'node:url';
import path, { resolve } from 'node:path';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    name: 'deposit',
    environment: 'jsdom',
    globals: true,
    setupFiles: [resolve(__dirname, './vitest.setup.ts'), 'fake-indexeddb/auto'],
  },
});
