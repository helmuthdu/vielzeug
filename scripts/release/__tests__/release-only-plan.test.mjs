import { describe, expect, it, vi } from 'vitest';

import { planTagReleases } from '../release-only-plan.mjs';

describe('planTagReleases()', () => {
  it('includes a package that is on npm but not yet tagged', async () => {
    const list = vi.fn(() => [{ folder: 'packages/ore', name: '@vielzeug/ore', version: '1.0.4' }]);
    const checkVersion = vi.fn().mockResolvedValue(true);
    const checkTag = vi.fn().mockReturnValue(false);

    const plan = await planTagReleases(undefined, { checkTag, checkVersion, list });

    expect(plan).toEqual([{ folder: 'packages/ore', package: '@vielzeug/ore', version: '1.0.4' }]);
    expect(checkVersion).toHaveBeenCalledWith('@vielzeug/ore', '1.0.4');
    expect(checkTag).toHaveBeenCalledWith('@vielzeug/ore@1.0.4');
  });

  it('skips a package not yet published to npm', async () => {
    const list = vi.fn(() => [{ folder: 'packages/ore', name: '@vielzeug/ore', version: '1.0.4' }]);
    const checkVersion = vi.fn().mockResolvedValue(false);
    const checkTag = vi.fn();

    const plan = await planTagReleases(undefined, { checkTag, checkVersion, list });

    expect(plan).toEqual([]);
    expect(checkTag).not.toHaveBeenCalled();
  });

  it('skips a package that is already tagged', async () => {
    const list = vi.fn(() => [{ folder: 'packages/ore', name: '@vielzeug/ore', version: '1.0.4' }]);
    const checkVersion = vi.fn().mockResolvedValue(true);
    const checkTag = vi.fn().mockReturnValue(true);

    const plan = await planTagReleases(undefined, { checkTag, checkVersion, list });

    expect(plan).toEqual([]);
  });

  it('handles multiple packages independently', async () => {
    const list = vi.fn(() => [
      { folder: 'packages/ore', name: '@vielzeug/ore', version: '1.0.4' },
      { folder: 'packages/orbit', name: '@vielzeug/orbit', version: '2.0.0' },
    ]);
    const checkVersion = vi.fn().mockResolvedValue(true);
    const checkTag = vi.fn((tag) => tag === '@vielzeug/ore@1.0.4');

    const plan = await planTagReleases(undefined, { checkTag, checkVersion, list });

    expect(plan).toEqual([{ folder: 'packages/orbit', package: '@vielzeug/orbit', version: '2.0.0' }]);
  });
});
