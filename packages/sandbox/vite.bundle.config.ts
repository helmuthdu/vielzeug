import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { getBundleConfig } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(getBundleConfig(__dirname, { fileName: 'sandbox', name: 'Sandbox' }));
