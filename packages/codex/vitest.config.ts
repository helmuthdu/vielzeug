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
  },
});
