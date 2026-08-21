import { describe, expect, it } from 'vitest';

import { NAVBAR_COLUMNS, PACKAGE_GROUPS } from '../packageGroups';

describe('PACKAGE_GROUPS', () => {
  it('lists each of the 36 packages exactly once', () => {
    const packageIds = PACKAGE_GROUPS.flatMap((group) => group.packages.map((pkg) => pkg.id));

    expect(packageIds).toHaveLength(36);
    expect(new Set(packageIds)).toHaveLength(36);
    expect(packageIds).toContain('sandbox');
    expect(packageIds).toContain('focus');
    expect(packageIds).toContain('gesture');
    expect(packageIds).toContain('sentinel');
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
