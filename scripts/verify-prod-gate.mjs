/**
 * Repo-wide prod-gate assertion: no published artifact may contain a raw
 * `__<PKG>_PROD__` global reference. Every package's `src/_dev.ts` gates dev
 * warnings behind that global, and the shared build config (root vite.config.ts's
 * `prodGateDefine`) bakes it to the literal `true`, so a surviving reference means
 * the define was lost from some build path and dev warns are live in production.
 *
 * Run after a full build (`bun run build`). Exits non-zero on any violation.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isMain } from './lib/cli.mjs';

const PACKAGES_DIR = new URL('../packages/', import.meta.url).pathname;

/** Every "pkg: file still references __X_PROD__" failure across `packagesDir`: one per dist
 *  artifact that still carries its package's own prod-gate global. Packages without a
 *  src/_dev.ts (no gate to lose) or a dist/ (not built yet) are skipped. The whole scan lives
 *  in this pure function so importing this script never touches the filesystem, like every
 *  other script here (see scripts/AGENTS.md's "pure functions + guarded entry point" rule). */
export function findProdGateViolations({ packagesDir = PACKAGES_DIR } = {}) {
  const failures = [];

  for (const pkg of readdirSync(packagesDir)) {
    const devFile = join(packagesDir, pkg, 'src/_dev.ts');
    const distDir = join(packagesDir, pkg, 'dist');

    if (!existsSync(devFile) || !existsSync(distDir)) continue;

    const gateMatch = readFileSync(devFile, 'utf8').match(/__(\w+)_PROD__/);

    if (!gateMatch) continue;

    const gate = `__${gateMatch[1]}_PROD__`;

    const scan = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);

        if (entry.isDirectory()) {
          scan(full);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.cjs')) {
          if (readFileSync(full, 'utf8').includes(gate)) failures.push(`${pkg}: ${full} still references ${gate}`);
        }
      }
    };

    scan(distDir);
  }

  return failures;
}

if (isMain(import.meta.url)) {
  const failures = findProdGateViolations();

  if (failures.length > 0) {
    console.error('Prod-gate violation: raw __*_PROD__ references survived into dist:');

    for (const failure of failures) console.error(`  - ${failure}`);

    process.exitCode = 1;
  } else {
    console.log('OK: no raw __*_PROD__ references in any package dist.');
  }
}
