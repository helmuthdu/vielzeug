import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getBundleConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// See vite.config.ts — herald/pulse/courier are optional peers, not regular dependencies.
export default defineConfig(
  getBundleConfig(__dirname, {
    external: [...readWorkspaceDeps(__dirname), '@vielzeug/herald', '@vielzeug/pulse', '@vielzeug/courier'],
    fileName: 'flux',
    name: 'Flux',
  }),
);
