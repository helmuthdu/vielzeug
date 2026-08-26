import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { NAVBAR_COLUMNS, PACKAGE_GROUPS } from '../packageGroups';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = resolve(__dirname, '../../../../../packages');

/** Every directory under packages/ with a package.json — the source of truth for package count. */
function listPackageSlugs(): string[] {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

describe('PACKAGE_GROUPS', () => {
  it('lists each package exactly once, covering every package directory', () => {
    const packageIds = PACKAGE_GROUPS.flatMap((group) => group.packages.map((pkg) => pkg.id));
    const expected = listPackageSlugs();

    // No duplicates within packageGroups.
    expect(new Set(packageIds)).toHaveLength(packageIds.length);

    // Every package directory appears in exactly one group.
    expect(packageIds).toHaveLength(expected.length);
    for (const slug of expected) {
      expect(packageIds).toContain(slug);
    }
  });
});

describe('NAVBAR_COLUMNS', () => {
  it('places every package group in exactly one column', () => {
    const groupsInColumns = NAVBAR_COLUMNS.flat();
    expect(groupsInColumns).toHaveLength(PACKAGE_GROUPS.length);
    expect(new Set(groupsInColumns)).toHaveLength(PACKAGE_GROUPS.length);
  });

  it('renders four columns', () => {
    expect(NAVBAR_COLUMNS).toHaveLength(4);
  });
});
