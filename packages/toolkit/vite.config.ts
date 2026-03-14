import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = getConfig(__dirname, { linkedDependencies: ['@vielzeug/logit'], name: 'toolkit' });

// Override the dts plugin: drop rollupTypes so each module gets its own .d.ts,
// which is required for sub-path exports to have type declarations.
export default defineConfig({
  ...base,
  plugins: [dts({ include: [resolve(__dirname, 'src')], insertTypesEntry: true })],
});
