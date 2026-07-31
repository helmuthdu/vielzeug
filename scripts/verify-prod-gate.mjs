/**
 * Repo-wide prod-gate assertion: no published artifact may contain a raw
 * `__<PKG>_PROD__` global reference. Every package's `src/_dev.ts` gates dev
 * warnings behind that global, and the shared build config (root vite.config.ts's
 * `prodGateDefine`) bakes it to the literal `true` — so a surviving reference means
 * the define was lost from some build path and dev warns are live in production.
 *
 * Run after a full build (`pnpm build`). Exits non-zero on any violation.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES_DIR = new URL('../packages/', import.meta.url).pathname;

const failures = [];

for (const pkg of readdirSync(PACKAGES_DIR)) {
  const devFile = join(PACKAGES_DIR, pkg, 'src/_dev.ts');
  const distDir = join(PACKAGES_DIR, pkg, 'dist');

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

if (failures.length > 0) {
  console.error('Prod-gate violation — raw __*_PROD__ references survived into dist:');

  for (const failure of failures) console.error(`  - ${failure}`);

  process.exitCode = 1;
} else {
  console.log('OK — no raw __*_PROD__ references in any package dist.');
}
