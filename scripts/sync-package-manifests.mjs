import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isMain } from './lib/cli.mjs';
import { normalizePackageManifest } from './lib/package-manifest.mjs';

const root = new URL('..', import.meta.url).pathname;
const packages = join(root, 'packages');

export function syncPackageManifests({ check = false, packagesDir = packages } = {}) {
  const stale = [];

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const file = join(packagesDir, entry.name, 'package.json');
    let original;
    try {
      original = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const normalized = `${JSON.stringify(normalizePackageManifest(JSON.parse(original)), null, 2)}\n`;
    if (original === normalized) continue;

    if (check) {
      stale.push(file);
      continue;
    }

    writeFileSync(file, normalized);
  }

  if (stale.length > 0) throw new Error(`Package manifests need normalization:\n${stale.join('\n')}`);
}

if (isMain(import.meta.url)) {
  const check = process.argv.includes('--check');

  try {
    syncPackageManifests({ check });
    console.log(check ? 'Package manifests are normalized.' : 'Package manifests normalized.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
