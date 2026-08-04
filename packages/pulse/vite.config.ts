import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(getConfig(__dirname, { external: readWorkspaceDeps(__dirname), name: 'pulse' }));
