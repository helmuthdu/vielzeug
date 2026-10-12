/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

/**
 * The real-workerd integration suite: separate from the unit project so the
 * standard `test` script stays fast and hermetic. Spawns its own isolated
 * wrangler dev workers over local D1; see test/integration/api.test.ts.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    hookTimeout: 240_000,
    include: ['test/integration/**/*.test.ts'],
    name: 'archive-integration',
    testTimeout: 120_000,
  },
});
