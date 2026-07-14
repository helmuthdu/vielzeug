import { defineConfig } from 'vitest/config';

// Split into two projects so `pnpm test:unit` gives a fast local feedback loop that never
// touches the real monorepo: `*.integration.test.ts` files load real bundled data (real
// docs/, real sibling packages) and are noticeably slower — `pnpm test` (default) still runs
// both, CI and `pretest` are unaffected.
export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
    globals: true,
    globalSetup: ['./scripts/vitest-global-setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          exclude: ['src/__tests__/**/*.integration.test.ts'],
          include: ['src/__tests__/**/*.test.ts'],
          name: 'unit',
        },
      },
      {
        extends: true,
        test: { include: ['src/__tests__/**/*.integration.test.ts'], name: 'integration' },
      },
    ],
  },
});
