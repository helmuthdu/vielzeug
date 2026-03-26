/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@vielzeug\/floatit$/, replacement: path.resolve(__dirname, '../floatit/src/index.ts') }],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    name: 'craftit',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    watch: false,
  },
});
