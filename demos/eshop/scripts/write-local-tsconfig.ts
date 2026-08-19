#!/usr/bin/env node --experimental-strip-types
// Generates tsconfig.local-dev.json — the same '@vielzeug/*' -> local-source mapping
// vite.config.ts applies for bundling (see collectLocalPackageMap() in ./local-packages.ts),
// but as tsc `paths`, since tsc has its own module resolution and never sees Vite's aliases.
// Without this, `tsc` always type-checks against whatever's installed in node_modules — the
// last-published npm release — even when VIELZEUG_LOCAL_DEV=1 tells Vite to bundle local source
// instead. That mismatch is exactly what broke this demo after an unpublished ore API change:
// Vite happily bundled the new API, but `tsc` still failed against the old published types.
//
// Only ever run explicitly via `pnpm build:local` — never wired into the default `build` script,
// which must keep type-checking against the real, portable, publishable dependency set.
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { collectLocalPackageMap } from './local-packages.ts';

const demoRoot = path.resolve(import.meta.dirname, '..');
const localPackageMap = collectLocalPackageMap(demoRoot);

// Ambient global .d.ts files (e.g. refine's HTMLElementTagNameMap augmentation for its custom
// elements) have no import/export of their own, so `paths` alone never pulls them into tsc's
// program the way it does for the actual imported modules above — they need to be listed in
// `include` explicitly. Only a couple of these exist across every @vielzeug/* package today
// (both in refine); glob for them under each referenced package's `src/` root rather than
// hand-listing the two current ones, so a future package's own ambient .d.ts doesn't need this
// script to be updated by hand.
const packageShortNames = new Set(Object.keys(localPackageMap).map((specifier) => specifier.split('/')[1]));
const packagesDir = path.resolve(demoRoot, '../../packages');
const ambientDeclarationFiles = [...packageShortNames].flatMap((shortName) =>
  globSync('src/**/*.d.ts', { cwd: path.join(packagesDir, shortName) }).map((file) =>
    path.join(packagesDir, shortName, file),
  ),
);

interface TsconfigShape {
  compilerOptions?: Record<string, unknown>;
  include?: string[];
}

const baseConfig = JSON.parse(readFileSync(path.join(demoRoot, 'tsconfig.json'), 'utf8')) as TsconfigShape;
const outPath = path.join(demoRoot, 'tsconfig.local-dev.json');

writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      compilerOptions: {
        ...baseConfig.compilerOptions,
        paths: Object.fromEntries(Object.entries(localPackageMap).map(([specifier, file]) => [specifier, [file]])),
      },
      include: [...(baseConfig.include ?? []), ...ambientDeclarationFiles],
    },
    null,
    2,
  )}\n`,
);

console.log(
  `[write-local-tsconfig] Wrote ${path.relative(demoRoot, outPath)} (${Object.keys(localPackageMap).length} path entries)`,
);
