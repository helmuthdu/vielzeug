/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    hookTimeout: 10_000,
    projects: [
      'packages/*',
    ],
    teardownTimeout: 10_000,
    testTimeout: 10_000,
  },
});
