#!/usr/bin/env node
/**
 * generate-barrels.mjs
 *
 * Scans each src/<section>/ directory and writes (or validates) the barrel index.ts.
 * Files starting with '_' or ending in '.test.ts' / '.spec.ts' are ignored.
 * The special __tests__ subdirectory is ignored entirely.
 *
 * Usage:
 *   node scripts/generate-barrels.mjs # write barrel files
 *   node scripts/generate-barrels.mjs --check # exit 1 if any barrel needs updating (CI)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// eslint-disable-next-line no-undef
const CHECK_MODE = process.argv.includes('--check');
const SRC = resolve(import.meta.dirname, '../src');

/** Directories under src/ that each have their own barrel index.ts */
const SECTIONS = readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && d.name !== '__tests__')
  .map((d) => d.name);

let changed = 0;

for (const section of SECTIONS) {
  const dir = join(SRC, section);
  const entries = readdirSync(dir, { withFileTypes: true });

  // Warn about non-underscore files in subdirectories — they won't be barrel-exported.
  const subdirFiles = entries.filter((e) => e.isDirectory() && !e.name.startsWith('_') && e.name !== '__tests__');

  for (const subdir of subdirFiles) {
    const subdirEntries = readdirSync(join(dir, subdir.name), { withFileTypes: true });
    const exposed = subdirEntries.filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith('.ts') &&
        !e.name.startsWith('_') &&
        !e.name.endsWith('.test.ts') &&
        !e.name.endsWith('.spec.ts'),
    );

    if (exposed.length > 0) {
      console.warn(
        `[generate-barrels] WARNING: ${section}/${subdir.name}/ contains public files that are NOT barrel-exported:\n` +
          exposed.map((e) => `  ${section}/${subdir.name}/${e.name}`).join('\n') +
          `\n  Move them to src/${section}/ or prefix with _ to silence this warning.`,
      );
    }
  }

  const modules = entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith('.ts') &&
        !e.name.startsWith('_') &&
        e.name !== 'index.ts' &&
        !e.name.endsWith('.test.ts') &&
        !e.name.endsWith('.spec.ts'),
    )
    .map((e) => e.name.replace(/\.ts$/, ''))
    .sort();

  if (modules.length === 0) continue;

  const barrel = modules.map((m) => `export * from './${m}';`).join('\n') + '\n';
  const indexPath = join(dir, 'index.ts');
  const existing = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';

  if (existing === barrel) continue;

  changed++;

  if (CHECK_MODE) {
    console.error(`[generate-barrels] Barrel drift detected: ${relative(SRC, indexPath)}`);
    console.error(`  Expected:\n${barrel}`);
    console.error(`  Got:\n${existing}`);
  } else {
    writeFileSync(indexPath, barrel, 'utf8');
    console.log(`[generate-barrels] Updated: ${relative(SRC, indexPath)}`);
  }
}

if (CHECK_MODE && changed > 0) {
  console.error(`\n[generate-barrels] ${changed} barrel(s) are out of sync. Run: node scripts/generate-barrels.mjs`);
  // eslint-disable-next-line no-undef
  process.exit(1);
}

if (!CHECK_MODE) {
  console.log(`[generate-barrels] Done. ${changed} barrel(s) updated.`);
}
