import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // `pnpm -r test` runs the demos in parallel and vitest's default cache lives at the
    // workspace root (node_modules/.vitest-cache), shared by every process: concurrent
    // startup clears raced and failed with ENOTEMPTY in CI. Each demo owns its cache dir.
    fsModuleCachePath: fileURLToPath(new URL('node_modules/.vitest-cache', import.meta.url)),
    include: ['src/**/*.test.ts'],
  },
});
