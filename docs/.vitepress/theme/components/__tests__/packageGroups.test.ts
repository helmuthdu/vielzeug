import { describe, expect, it } from 'vitest';

import { NAVBAR_COLUMNS, PACKAGE_GROUPS } from '../packageGroups';

describe('PACKAGE_GROUPS', () => {
  it('lists each of the 35 packages exactly once', () => {
    const packageIds = PACKAGE_GROUPS.flatMap((group) => group.packages.map((pkg) => pkg.id));

    expect(packageIds).toHaveLength(35);
    expect(new Set(packageIds)).toHaveLength(35);
    expect(packageIds).toContain('sandbox');
    expect(packageIds).toContain('focus');
    expect(packageIds).toContain('gesture');
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
