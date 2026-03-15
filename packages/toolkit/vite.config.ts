import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Override the dts plugin: drop rollupTypes so each module gets its own .d.ts,
// which is required for sub-path exports to have type declarations.
export default defineConfig(getConfig(__dirname, { name: 'toolkit' }));
