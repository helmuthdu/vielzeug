import { describe, expect, it } from 'vitest';

import { PACKAGE_GROUPS } from '../packageGroups';

describe('PACKAGE_GROUPS', () => {
  it('lists each of the 32 packages exactly once', () => {
    const packageIds = PACKAGE_GROUPS.flatMap((group) => group.packages.map((pkg) => pkg.id));

    expect(packageIds).toHaveLength(32);
    expect(new Set(packageIds)).toHaveLength(32);
    expect(packageIds).toContain('sandbox');
  });
});
