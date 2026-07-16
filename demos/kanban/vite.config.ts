import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

// Local-dev alias: when working inside a full vielzeug monorepo checkout, set
// VIELZEUG_LOCAL_DEV=1 to resolve every `@vielzeug/*` import straight to that
// package's own TS source instead of the installed npm dependency. This makes
// edits to a package show up instantly in the demo without a build/reinstall
// cycle. StackBlitz (and anyone who copies just this `demos/kanban` folder)
// has neither the env var nor a sibling `packages/` directory, so the alias
// is skipped and the app falls back to the real npm packages declared below —
// keeping the demo fully portable.
const packagesDir = fileURLToPath(new URL('../../packages', import.meta.url));
const useLocalPackages = process.env.VIELZEUG_LOCAL_DEV === '1' && existsSync(packagesDir);

// Read each dependency's own `exports` map (rather than assuming `src/index.ts`)
// so subpath imports like `@vielzeug/refine/toast` or `@vielzeug/ore/directives`
// resolve to their real source file, not just the package root.
function collectLocalAliases(): { find: RegExp; replacement: string }[] {
  const aliases: { find: RegExp; replacement: string }[] = [];

  for (const name of Object.keys(pkg.dependencies)) {
    if (!name.startsWith('@vielzeug/')) continue;

    const shortName = name.slice('@vielzeug/'.length);
    const depPkgPath = fileURLToPath(new URL(`../../packages/${shortName}/package.json`, import.meta.url));

    if (!existsSync(depPkgPath)) continue;

    const depPkg = JSON.parse(readFileSync(depPkgPath, 'utf8')) as {
      exports?: Record<string, { source?: string } | string>;
    };
    const exportsMap = depPkg.exports ?? { '.': { source: './src/index.ts' } };

    for (const [subpath, condition] of Object.entries(exportsMap)) {
      const source = typeof condition === 'string' ? undefined : condition.source;

      if (!source) continue; // skip asset-only exports (e.g. `./styles`) with no TS source

      const specifier = subpath === '.' ? name : `${name}/${subpath.slice(2)}`;

      aliases.push({
        // Exact-match regex — a plain string `find` would prefix-match, so
        // `@vielzeug/refine` would also swallow `@vielzeug/refine/toast`.
        find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        replacement: fileURLToPath(new URL(`../../packages/${shortName}/${source.slice(2)}`, import.meta.url)),
      });
    }
  }

  return aliases;
}

export default defineConfig({
  resolve: { alias: useLocalPackages ? collectLocalAliases() : [] },
});
