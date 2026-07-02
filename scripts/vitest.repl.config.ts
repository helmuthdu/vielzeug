/// <reference types="vitest" />

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { buildVielzeugSrcAliases, REPL_EXCLUDED_PACKAGES } from './vielzeug-packages';

const TMP_DIR = process.env['REPL_TMP_DIR'];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Resolve @vielzeug/* imports to package source files so examples run without a prior
// build step. DOM-output packages are excluded — they have no REPL examples to validate.
const vielzeugAliases: Record<string, string> = {
  ...buildVielzeugSrcAliases(path.resolve(ROOT, 'packages'), REPL_EXCLUDED_PACKAGES),
  '@vielzeug/orbit/presets': path.resolve(ROOT, 'packages/orbit/src/presets.ts'),
  'fake-indexeddb/auto': path.resolve(ROOT, 'packages/vault/node_modules/fake-indexeddb/auto/index.mjs'),
};

export default defineConfig({
  resolve: {
    alias: vielzeugAliases,
  },
  test: {
    // Run each test in isolation so snippet side-effects don't bleed across examples
    isolate: true,
    // jsdom simulates the browser environment that the REPL runs in
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://repl.vielzeug.test',
      },
    },
    setupFiles: [
      path.resolve(__dirname, 'repl-setup.ts'),
    ],
    include: TMP_DIR ? [`${TMP_DIR}/**/*.test.ts`] : [],
    testTimeout: 15_000,
    name: 'repl',
    globals: true,
    watch: false,
  },
});
