/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@vielzeug\/arsenal\/guards$/, replacement: path.resolve(__dirname, '../arsenal/src/guards/index.ts') },
      { find: /^@vielzeug\/arsenal$/, replacement: path.resolve(__dirname, '../arsenal/src/index.ts') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    name: 'spell',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    watch: false,
  },
});
