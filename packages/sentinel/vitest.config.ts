/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    'import.meta.env.DEV': JSON.stringify(true),
  },
  resolve: {
    alias: [{ find: /^@vielzeug\/ripple$/, replacement: path.resolve(__dirname, '../ripple/src/index.ts') }],
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', 'src/**/*.e2e.ts'],
    globals: true,
    name: 'sentinel',
    watch: false,
  },
});
