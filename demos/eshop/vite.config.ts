import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { collectLocalPackageMap } from './scripts/local-packages.ts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Local-dev alias: set VIELZEUG_LOCAL_DEV=1 to resolve every @vielzeug package
// directly to its TypeScript source. Regular development uses linked workspace
// package builds; local mode removes the build/reinstall cycle while changing a
// package. See scripts/write-local-tsconfig.ts for the matching tsc paths.
const useLocalPackages = process.env.VIELZEUG_LOCAL_DEV === '1';
const localPackageMap = useLocalPackages ? collectLocalPackageMap(__dirname) : {};

const aliases = Object.entries(localPackageMap).map(([specifier, replacement]) => ({
  // Exact-match regex — a plain string `find` would prefix-match, so
  // `@vielzeug/refine` would also swallow `@vielzeug/refine/toast`.
  find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  replacement,
}));

export default defineConfig({
  resolve: { alias: aliases },
});
