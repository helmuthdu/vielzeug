import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['demos/voyage/src/**/*.test.ts'],
  },
});
