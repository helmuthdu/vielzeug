/// <reference types="vitest" />

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: [path.resolve(__dirname, './src/**/__tests__/*.test.ts')],
    name: 'sourcerer',
    watch: false,
  },
});
