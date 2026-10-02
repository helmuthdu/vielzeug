import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['demos/brettzeug/src/**/*.test.ts'],
  },
});
