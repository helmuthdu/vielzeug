/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@vielzeug/courier': path.resolve(__dirname, '../courier/src/index.ts'),
      '@vielzeug/herald': path.resolve(__dirname, '../herald/src/index.ts'),
      '@vielzeug/pulse': path.resolve(__dirname, '../pulse/src/index.ts'),
      '@vielzeug/ripple': path.resolve(__dirname, '../ripple/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    name: 'flux',
  },
});
