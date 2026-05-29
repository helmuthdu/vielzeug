/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    'import.meta.env.DEV': JSON.stringify(false),
  },
  resolve: {
    alias: [
      { find: /^@vielzeug\/orbit\/inline$/, replacement: path.resolve(__dirname, 'src/inline.ts') },
      { find: /^@vielzeug\/orbit\/presets$/, replacement: path.resolve(__dirname, 'src/presets.ts') },
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
