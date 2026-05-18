import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    name: 'mcpit',
    watch: false,
  },
});
