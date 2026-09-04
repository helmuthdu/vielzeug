import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type ExportConditions = { default?: string; import?: string; source?: string; types?: string };

function sourcePath(entry: ExportConditions | string): string | undefined {
  if (typeof entry === 'string') return undefined;
  if (entry.source) return entry.source;
  const published = entry.types ?? entry.import ?? entry.default;
  return published?.startsWith('./dist/') ? published.replace('./dist/', './src/').replace(/\.d\.ts$/, '.ts') : undefined;
}

export function collectLocalPackageMap(demoRoot: string): Record<string, string> {
  const packagesDir = path.resolve(demoRoot, '../../packages');
  if (!existsSync(packagesDir)) return {};
  const manifest = JSON.parse(readFileSync(path.join(demoRoot, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
  const map: Record<string, string> = {};
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (!name.startsWith('@vielzeug/')) continue;
    const packageRoot = path.join(packagesDir, name.slice('@vielzeug/'.length));
    const manifestPath = path.join(packageRoot, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const dependency = JSON.parse(readFileSync(manifestPath, 'utf8')) as { exports?: Record<string, ExportConditions | string> };
    for (const [subpath, condition] of Object.entries(dependency.exports ?? { '.': { source: './src/index.ts' } })) {
      const source = sourcePath(condition);
      if (!source) continue;
      const specifier = subpath === '.' ? name : `${name}/${subpath.slice(2)}`;
      const replacement = path.join(packageRoot, source.slice(2));
      if (existsSync(replacement)) map[specifier] = replacement;
    }
  }
  return map;
}
