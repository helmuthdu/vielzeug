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
    alias: [
      { find: /^@vielzeug\/arsenal$/, replacement: path.resolve(__dirname, '../arsenal/src/index.ts') },
      { find: /^@vielzeug\/ripple$/, replacement: path.resolve(__dirname, '../ripple/src/index.ts') },
      { find: /^@vielzeug\/orbit\/inline$/, replacement: path.resolve(__dirname, 'src/inline.ts') },
      { find: /^@vielzeug\/orbit\/presets$/, replacement: path.resolve(__dirname, 'src/presets.ts') },
      { find: /^@vielzeug\/orbit\/reactive$/, replacement: path.resolve(__dirname, 'src/reactive.ts') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    name: 'orbit',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    watch: false,
  },
});
