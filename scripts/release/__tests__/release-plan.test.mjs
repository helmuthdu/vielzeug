import { describe, expect, it, vi } from 'vitest';

import { planReleases } from '../release-plan.mjs';

describe('planReleases()', () => {
  it('includes a package whose version is not yet on npm', async () => {
    const resolve = vi.fn(() => ({ folder: 'packages/ore', version: '26.10.0' }));
    const checkVersion = vi.fn().mockResolvedValue(false);

    const plan = await planReleases(['@vielzeug/ore'], { checkVersion, resolve });

    expect(plan).toEqual([{ folder: 'packages/ore', package: '@vielzeug/ore', version: '26.10.0' }]);
  });

  it('skips a package whose version is already on npm', async () => {
    const resolve = vi.fn(() => ({ folder: 'packages/ore', version: '26.10.0' }));
    const checkVersion = vi.fn().mockResolvedValue(true);

    const plan = await planReleases(['@vielzeug/ore'], { checkVersion, resolve });

    expect(plan).toEqual([]);
  });

  it('handles multiple packages independently', async () => {
    const resolve = vi.fn((pkg) => ({ folder: `packages/${pkg}`, version: '26.10.0' }));
    const checkVersion = vi.fn(async (pkg) => pkg === 'ore'); // ore is already published

    const plan = await planReleases(['ore', 'orbit'], { checkVersion, resolve });

    expect(plan).toEqual([{ folder: 'packages/orbit', package: 'orbit', version: '26.10.0' }]);
  });
});
