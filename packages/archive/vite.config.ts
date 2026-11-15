import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Two entries: the browser-safe root contract and the Worker-only subpath. The
// root contract additionally ships an IIFE bundle (vite.bundle.config.ts) for the
// REPL; deployments bundle the Worker entry with wrangler instead.
export default defineConfig(
  getConfig(__dirname, {
    entry: {
      auth: resolve(__dirname, 'src/auth.ts'),
      index: resolve(__dirname, 'src/index.ts'),
      worker: resolve(__dirname, 'src/worker.ts'),
    },
    external: readWorkspaceDeps(__dirname),
    name: 'archive',
  }),
);
