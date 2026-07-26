import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { collectLocalPackageMap } from './scripts/local-packages';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Local-dev alias: when working inside a full vielzeug monorepo checkout, set
// VIELZEUG_LOCAL_DEV=1 to resolve every `@vielzeug/*` import straight to that
// package's own TS source instead of the installed npm dependency. This makes
// edits to a package show up instantly in the demo without a build/reinstall
// cycle. StackBlitz (and anyone who copies just this `demos/kanban` folder)
// has no sibling `packages/` directory, so `collectLocalPackageMap()` returns
// an empty map and the app falls back to the real npm packages declared below —
// keeping the demo fully portable. See `scripts/write-local-tsconfig.mjs` for
// the equivalent mapping applied to `tsc`'s own module resolution.
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
