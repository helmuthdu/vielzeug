/// <reference types="vitest" />

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const TMP_DIR = process.env['REPL_TMP_DIR'];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Resolve @vielzeug/* imports to package source files so examples run without
// a prior build step.
const vielzeugAliases: Record<string, string> = {
  '@vielzeug/arsenal': path.resolve(ROOT, 'packages/arsenal/src/index.ts'),
  '@vielzeug/clockwork': path.resolve(ROOT, 'packages/clockwork/src/index.ts'),
  '@vielzeug/coins': path.resolve(ROOT, 'packages/coins/src/index.ts'),
  '@vielzeug/conduit': path.resolve(ROOT, 'packages/conduit/src/index.ts'),
  '@vielzeug/courier': path.resolve(ROOT, 'packages/courier/src/index.ts'),
  '@vielzeug/dnd': path.resolve(ROOT, 'packages/dnd/src/index.ts'),
  '@vielzeug/familiar': path.resolve(ROOT, 'packages/familiar/src/index.ts'),
  '@vielzeug/flux': path.resolve(ROOT, 'packages/flux/src/index.ts'),
  '@vielzeug/forge': path.resolve(ROOT, 'packages/forge/src/index.ts'),
  '@vielzeug/herald': path.resolve(ROOT, 'packages/herald/src/index.ts'),
  '@vielzeug/keymap': path.resolve(ROOT, 'packages/keymap/src/index.ts'),
  '@vielzeug/ledger': path.resolve(ROOT, 'packages/ledger/src/index.ts'),
  '@vielzeug/lingua': path.resolve(ROOT, 'packages/lingua/src/index.ts'),
  '@vielzeug/orbit/presets': path.resolve(ROOT, 'packages/orbit/src/presets.ts'),
  '@vielzeug/orbit': path.resolve(ROOT, 'packages/orbit/src/index.ts'),
  '@vielzeug/pulse': path.resolve(ROOT, 'packages/pulse/src/index.ts'),
  '@vielzeug/ripple': path.resolve(ROOT, 'packages/ripple/src/index.ts'),
  '@vielzeug/rune': path.resolve(ROOT, 'packages/rune/src/index.ts'),
  '@vielzeug/scroll': path.resolve(ROOT, 'packages/scroll/src/index.ts'),
  '@vielzeug/sourcerer': path.resolve(ROOT, 'packages/sourcerer/src/index.ts'),
  '@vielzeug/spell': path.resolve(ROOT, 'packages/spell/src/index.ts'),
  '@vielzeug/tempo': path.resolve(ROOT, 'packages/tempo/src/index.ts'),
  '@vielzeug/vault': path.resolve(ROOT, 'packages/vault/src/index.ts'),
  '@vielzeug/ward': path.resolve(ROOT, 'packages/ward/src/index.ts'),
  '@vielzeug/wayfinder': path.resolve(ROOT, 'packages/wayfinder/src/index.ts'),
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
