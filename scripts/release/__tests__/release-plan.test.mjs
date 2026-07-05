import { describe, expect, it, vi } from 'vitest';

import { planReleases } from '../release-plan.mjs';

describe('planReleases()', () => {
  it('includes a package whose version changed and is not yet on npm', async () => {
    const resolve = vi.fn(() => ({ folder: 'packages/ore', version: '1.1.0' }));
    const checkVersion = vi.fn().mockResolvedValue(false);

    const plan = await planReleases(['@vielzeug/ore'], { '@vielzeug/ore': '1.0.0' }, { checkVersion, resolve });

    expect(plan).toEqual([{ folder: 'packages/ore', package: '@vielzeug/ore', version: '1.1.0' }]);
  });

  it('skips a package whose version did not change', async () => {
    const resolve = vi.fn(() => ({ folder: 'packages/ore', version: '1.0.0' }));
    const checkVersion = vi.fn();

    const plan = await planReleases(['@vielzeug/ore'], { '@vielzeug/ore': '1.0.0' }, { checkVersion, resolve });

    expect(plan).toEqual([]);
    expect(checkVersion).not.toHaveBeenCalled();
  });

  it('skips a package whose new version is already on npm', async () => {
    const resolve = vi.fn(() => ({ folder: 'packages/ore', version: '1.1.0' }));
    const checkVersion = vi.fn().mockResolvedValue(true);

    const plan = await planReleases(['@vielzeug/ore'], { '@vielzeug/ore': '1.0.0' }, { checkVersion, resolve });

    expect(plan).toEqual([]);
  });

  it('handles multiple packages independently', async () => {
    const resolve = vi.fn((pkg) => ({ folder: `packages/${pkg}`, version: '2.0.0' }));
    const checkVersion = vi.fn().mockResolvedValue(false);

    const plan = await planReleases(['ore', 'orbit'], { orbit: '1.0.0', ore: '2.0.0' }, { checkVersion, resolve });

    expect(plan).toEqual([{ folder: 'packages/orbit', package: 'orbit', version: '2.0.0' }]);
  });
});
