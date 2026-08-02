import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type ExportConditions = {
  default?: string;
  import?: string;
  source?: string;
  types?: string;
};

const getSourcePath = (entry: ExportConditions | string): string | undefined => {
  if (typeof entry === 'string') return undefined;

  if (entry.source) return entry.source;

  const publishedPath = entry.types ?? entry.import ?? entry.default;

  if (!publishedPath?.startsWith('./dist/')) return undefined;

  return publishedPath.replace('./dist/', './src/').replace(/\.d\.ts$/, '.ts');
};

/**
 * Maps every `@vielzeug/*` dependency and any published sub-path export (e.g. `@vielzeug/ore/testing`)
 * to its real TS source file inside a sibling `../../packages/` checkout — the shared logic
 * behind both `vite.config.ts`'s dev-time module aliasing and `write-local-tsconfig.ts`'s `tsc`
 * `paths` generation, so the two can't drift out of sync as two hand-maintained copies.
 *
 * Returns an empty map if there's no sibling `packages/` directory (StackBlitz, or anyone who
 * copied just this demo's own folder) — callers fall back to the real npm dependencies.
 *
 * @param demoRoot absolute path to this demo's own directory (e.g. `demos/eshop`)
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
      exports?: Record<string, ExportConditions | string>;
    };
    const exportsMap = depPkg.exports ?? { '.': { source: './src/index.ts' } };

    for (const [subpath, condition] of Object.entries(exportsMap)) {
      const source = getSourcePath(condition);

      if (!source) continue;

      const specifier = subpath === '.' ? name : `${name}/${subpath.slice(2)}`;
      const sourcePath = path.join(packagesDir, shortName, source.slice(2));

      if (existsSync(sourcePath)) map[specifier] = sourcePath;
    }
  }

  return map;
}
