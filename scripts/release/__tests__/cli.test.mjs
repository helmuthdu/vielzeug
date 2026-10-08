import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../npm-publish.mjs', () => ({ publishPackage: vi.fn() }));
vi.mock('../npm-version-exists.mjs', () => ({ versionExists: vi.fn() }));
vi.mock('../dangling-pins.mjs', () => ({ findDanglingPins: vi.fn(async () => []) }));
vi.mock('../publish-missing.mjs', () => ({
  listPublishablePackages: vi.fn(() => []),
  publishMissing: vi.fn(),
  summaryMarkdown: vi.fn(() => '## summary'),
}));
vi.mock('../release-only-plan.mjs', () => ({ planTagReleases: vi.fn() }));
vi.mock('../release-plan.mjs', () => ({ planReleases: vi.fn() }));
vi.mock('../apply-train.mjs', () => ({
  applyTrain: vi.fn(() => ({ changedPackages: [], riders: [], train: '26.10.0' })),
  listChangedPackageNames: vi.fn(),
}));
vi.mock('../rush-project.mjs', () => ({ findProject: vi.fn(), listProjectNames: vi.fn() }));
vi.mock('../git-tag.mjs', () => ({ createTrainRelease: vi.fn(), tagPackage: vi.fn() }));

const { publishPackage } = await import('../npm-publish.mjs');
const { versionExists } = await import('../npm-version-exists.mjs');
const { findDanglingPins } = await import('../dangling-pins.mjs');
const { listPublishablePackages, publishMissing } = await import('../publish-missing.mjs');
const { planTagReleases } = await import('../release-only-plan.mjs');
const { planReleases } = await import('../release-plan.mjs');
const { applyTrain, listChangedPackageNames } = await import('../apply-train.mjs');
const { createTrainRelease, tagPackage } = await import('../git-tag.mjs');
const { findProject, listProjectNames } = await import('../rush-project.mjs');
const { main } = await import('../cli.mjs');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('changed-packages', () => {
  it('prints a space-separated list', async () => {
    listChangedPackageNames.mockReturnValue(['@vielzeug/orbit', '@vielzeug/ore']);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['changed-packages']);

    expect(log).toHaveBeenCalledWith('@vielzeug/orbit @vielzeug/ore');
  });

  it('throws when nothing is pending', async () => {
    listChangedPackageNames.mockReturnValue([]);
    await expect(main(['changed-packages'])).rejects.toThrow('No pending change files found');
  });
});

describe('project', () => {
  it('prints GITHUB_OUTPUT-style folder/version lines', async () => {
    listProjectNames.mockReturnValue(['@vielzeug/ore']);
    findProject.mockReturnValue({ folder: 'packages/ore', version: '1.0.4' });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['project', '@vielzeug/ore']);

    expect(log).toHaveBeenCalledWith('folder=packages/ore\nversion=1.0.4');
  });

  it('throws a clear error for an unknown package', async () => {
    listProjectNames.mockReturnValue(['@vielzeug/ore']);
    await expect(main(['project', '@vielzeug/does-not-exist'])).rejects.toThrow('Unknown package');
  });
});

describe('apply', () => {
  it('delegates to applyTrain with the given package', async () => {
    await main(['apply', '@vielzeug/ore']);
    expect(applyTrain).toHaveBeenCalledWith('@vielzeug/ore', { dryRun: false });
  });

  it('delegates with undefined for a bulk train', async () => {
    await main(['apply']);
    expect(applyTrain).toHaveBeenCalledWith(undefined, { dryRun: false });
  });

  it('forwards DRY_RUN=1 so a dry run never stamps, changelogs, or commits', async () => {
    process.env.DRY_RUN = '1';
    try {
      await main(['apply']);
      expect(applyTrain).toHaveBeenCalledWith(undefined, { dryRun: true });
    } finally {
      delete process.env.DRY_RUN;
    }
  });
});

describe('plan', () => {
  it('plans the full family by default', async () => {
    listPublishablePackages.mockReturnValue([
      { folder: 'packages/orbit', name: '@vielzeug/orbit', version: '26.10.0' },
      { folder: 'packages/ore', name: '@vielzeug/ore', version: '26.10.0' },
    ]);
    planReleases.mockResolvedValue([]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['plan']);

    expect(planReleases).toHaveBeenCalledWith(['@vielzeug/orbit', '@vielzeug/ore']);
  });

  it('narrows to the named packages when given explicitly', async () => {
    planReleases.mockResolvedValue([{ folder: 'packages/ore', package: '@vielzeug/ore', version: '26.10.0' }]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['plan', '@vielzeug/ore']);

    expect(planReleases).toHaveBeenCalledWith(['@vielzeug/ore']);
    expect(log).toHaveBeenCalledWith(
      JSON.stringify([{ folder: 'packages/ore', package: '@vielzeug/ore', version: '26.10.0' }]),
    );
  });

  it('refuses to print a plan with a dangling dependency pin', async () => {
    planReleases.mockResolvedValue([{ folder: 'packages/prism', package: '@vielzeug/prism', version: '26.10.0' }]);
    findDanglingPins.mockResolvedValue([{ dependency: '@vielzeug/orbit', dependencyVersion: '26.10.0', package: '@vielzeug/prism' }]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(main(['plan', '@vielzeug/prism'])).rejects.toThrow(/dangling dependency pins/);
    expect(log).not.toHaveBeenCalled();
  });
});

describe('publish', () => {
  it('skips publishing when the version already exists on npm', async () => {
    versionExists.mockResolvedValue(true);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['publish', '@vielzeug/ore', '1.0.4', 'packages/ore']);

    expect(log).toHaveBeenCalledWith('⚠️  @vielzeug/ore@1.0.4 already on npm: skipping');
    expect(publishPackage).not.toHaveBeenCalled();
    expect(tagPackage).not.toHaveBeenCalled();
  });

  it('publishes then tags when the version is new', async () => {
    versionExists.mockResolvedValue(false);

    await main(['publish', '@vielzeug/ore', '1.0.4', 'packages/ore']);

    expect(publishPackage).toHaveBeenCalledWith('packages/ore', { dryRun: false, interactive: false, otp: undefined });
    expect(tagPackage).toHaveBeenCalledWith({ dryRun: false, package: '@vielzeug/ore', version: '1.0.4' });
  });

  it('forwards --otp to publishPackage (TOTP accounts)', async () => {
    versionExists.mockResolvedValue(false);

    await main(['publish', '@vielzeug/ore', '1.0.4', 'packages/ore', '--otp=123456']);

    expect(publishPackage).toHaveBeenCalledWith('packages/ore', { dryRun: false, interactive: false, otp: '123456' });
  });

  it('forwards --interactive to publishPackage (WebAuthn/browser-trust accounts)', async () => {
    versionExists.mockResolvedValue(false);

    await main(['publish', '@vielzeug/ore', '1.0.4', 'packages/ore', '--interactive']);

    expect(publishPackage).toHaveBeenCalledWith('packages/ore', { dryRun: false, interactive: true, otp: undefined });
  });

  it('reads DRY_RUN per call, not once at module import time', async () => {
    // cli.mjs was already imported (at the top of this file) with DRY_RUN unset: if `dryRun`
    // were captured at import time instead of inside main(), setting it now would have no effect.
    versionExists.mockResolvedValue(false);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const originalDryRun = process.env.DRY_RUN;
    process.env.DRY_RUN = '1';

    try {
      await main(['publish', '@vielzeug/ore', '1.0.4', 'packages/ore']);
      expect(publishPackage).toHaveBeenCalledWith('packages/ore', { dryRun: true, interactive: false, otp: undefined });
      expect(log).toHaveBeenCalledWith('[dry-run] validated @vielzeug/ore@1.0.4');
    } finally {
      if (originalDryRun === undefined) delete process.env.DRY_RUN;
      else process.env.DRY_RUN = originalDryRun;
    }
  });
});

describe('tag', () => {
  it('throws when the version is not on npm yet', async () => {
    versionExists.mockResolvedValue(false);

    await expect(main(['tag', '@vielzeug/ore', '1.0.4'])).rejects.toThrow('@vielzeug/ore@1.0.4 not found on npm');
    expect(tagPackage).not.toHaveBeenCalled();
  });

  it('tags without publishing when the version already exists on npm', async () => {
    versionExists.mockResolvedValue(true);

    await main(['tag', '@vielzeug/ore', '1.0.4']);

    expect(publishPackage).not.toHaveBeenCalled();
    expect(tagPackage).toHaveBeenCalledWith({ dryRun: false, package: '@vielzeug/ore', version: '1.0.4' });
  });

  it('honors DRY_RUN', async () => {
    versionExists.mockResolvedValue(true);
    const originalDryRun = process.env.DRY_RUN;
    process.env.DRY_RUN = '1';

    try {
      await main(['tag', '@vielzeug/ore', '1.0.4']);
      expect(tagPackage).toHaveBeenCalledWith({ dryRun: true, package: '@vielzeug/ore', version: '1.0.4' });
    } finally {
      if (originalDryRun === undefined) delete process.env.DRY_RUN;
      else process.env.DRY_RUN = originalDryRun;
    }
  });
});

describe('train-release', () => {
  it('delegates to createTrainRelease, with an optional explicit train version', async () => {
    await main(['train-release']);
    expect(createTrainRelease).toHaveBeenCalledWith({ dryRun: false, version: undefined });

    await main(['train-release', '26.10.5']);
    expect(createTrainRelease).toHaveBeenLastCalledWith({ dryRun: false, version: '26.10.5' });
  });

  it('honors DRY_RUN', async () => {
    const originalDryRun = process.env.DRY_RUN;
    process.env.DRY_RUN = '1';

    try {
      await main(['train-release']);
      expect(createTrainRelease).toHaveBeenCalledWith({ dryRun: true, version: undefined });
    } finally {
      if (originalDryRun === undefined) delete process.env.DRY_RUN;
      else process.env.DRY_RUN = originalDryRun;
    }
  });
});

describe('release-plan', () => {
  it('prints the tag+release plan as JSON', async () => {
    planTagReleases.mockResolvedValue([{ folder: 'packages/ore', package: '@vielzeug/ore', version: '1.0.4' }]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['release-plan']);

    expect(log).toHaveBeenCalledWith(
      JSON.stringify([{ folder: 'packages/ore', package: '@vielzeug/ore', version: '1.0.4' }]),
    );
  });
});

describe('publish-missing', () => {
  it('sets a non-zero exit code when any package failed', async () => {
    publishMissing.mockResolvedValue({ failed: ['@vielzeug/ore@1.0.4'], published: [], skipped: [] });
    process.exitCode = undefined;

    await main(['publish-missing']);

    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });

  it('forwards --otp to publishMissing', async () => {
    publishMissing.mockResolvedValue({ failed: [], published: [], skipped: [] });

    await main(['publish-missing', '--otp=123456']);

    expect(publishMissing).toHaveBeenCalledWith(undefined, { dryRun: false, interactive: false, otp: '123456' });
  });

  it('forwards --interactive to publishMissing', async () => {
    publishMissing.mockResolvedValue({ failed: [], published: [], skipped: [] });

    await main(['publish-missing', '--interactive']);

    expect(publishMissing).toHaveBeenCalledWith(undefined, { dryRun: false, interactive: true, otp: undefined });
  });

  it('leaves the exit code untouched when everything succeeds', async () => {
    publishMissing.mockResolvedValue({ failed: [], published: ['@vielzeug/ore@1.0.4'], skipped: [] });
    process.exitCode = undefined;

    await main(['publish-missing']);

    expect(process.exitCode).toBeUndefined();
  });
});

describe('unknown subcommand', () => {
  it('throws with a helpful message', async () => {
    await expect(main(['bogus'])).rejects.toThrow('Unknown subcommand: bogus');
  });
});
