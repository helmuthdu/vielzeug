import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          exclude: ['src/__tests__/**/*.integration.test.ts'],
          include: ['src/__tests__/**/*.test.ts'],
          name: 'unit',
        },
      },
      { extends: true, test: { include: ['src/__tests__/**/*.integration.test.ts'], name: 'integration' } },
    ],
    // Integration tests run generateSnapshot over the whole monorepo; under
    // coverage on CI runners that exceeds the 5s default.
    testTimeout: 60_000,
  },
});
