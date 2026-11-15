import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getBundleConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Bundles the browser-safe root contract only (schemas, constants, collection seam,
// errors). The worker/auth subpaths stay unbundled: they need D1/JWKS bindings the
// IIFE sandbox could never host.
export default defineConfig(
  getBundleConfig(__dirname, { external: readWorkspaceDeps(__dirname), fileName: 'archive', name: 'Archive' }),
);
