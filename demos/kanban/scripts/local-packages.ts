import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Maps every `@vielzeug/*` dependency and any published sub-path export (e.g. `@vielzeug/ore/testing`)
 * to its real TS source file inside a sibling `../../packages/` checkout — the shared logic
 * behind both `vite.config.ts`'s dev-time module aliasing and `write-local-tsconfig.ts`'s `tsc`
 * `paths` generation, so the two can't drift out of sync as two hand-maintained copies.
 *
 * Returns an empty map if there's no sibling `packages/` directory (StackBlitz, or anyone who
 * copied just this demo's own folder) — callers fall back to the real npm dependencies.
 *
 * @param demoRoot absolute path to this demo's own directory (e.g. `demos/kanban`)
 * @returns specifier (e.g. '@vielzeug/ore/testing') -> absolute source path
 */
export function collectLocalPackageMap(demoRoot: string): Record<string, string> {
  const packagesDir = path.resolve(demoRoot, '../../packages');

  if (!existsSync(packagesDir)) return {};

  const pkg = JSON.parse(readFileSync(path.join(demoRoot, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const map: Record<string, string> = {};

  for (const name of Object.keys(pkg.dependencies ?? {})) {
    if (!name.startsWith('@vielzeug/')) continue;

    const shortName = name.slice('@vielzeug/'.length);
    const depPkgPath = path.join(packagesDir, shortName, 'package.json');

    if (!existsSync(depPkgPath)) continue;

    const depPkg = JSON.parse(readFileSync(depPkgPath, 'utf8')) as {
      exports?: Record<string, { source?: string } | string>;
    };
    const exportsMap = depPkg.exports ?? { '.': { source: './src/index.ts' } };

    for (const [subpath, condition] of Object.entries(exportsMap)) {
      const source = typeof condition === 'string' ? undefined : condition.source;

      if (!source) continue; // skip asset-only exports (e.g. `./styles`) with no TS source

      const specifier = subpath === '.' ? name : `${name}/${subpath.slice(2)}`;

      map[specifier] = path.join(packagesDir, shortName, source.slice(2));
    }
  }

  return map;
}
