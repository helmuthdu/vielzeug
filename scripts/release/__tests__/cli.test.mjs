import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../npm-publish.mjs', () => ({ publishPackage: vi.fn() }));
vi.mock('../npm-version-exists.mjs', () => ({ versionExists: vi.fn() }));
vi.mock('../publish-missing.mjs', () => ({ publishMissing: vi.fn(), summaryMarkdown: vi.fn(() => '## summary') }));
vi.mock('../release-only-plan.mjs', () => ({ planTagReleases: vi.fn() }));
vi.mock('../release-plan.mjs', () => ({ planReleases: vi.fn() }));
vi.mock('../rush-publish-apply.mjs', () => ({ applyVersionBump: vi.fn(), listChangedPackageNames: vi.fn() }));
vi.mock('../rush-project.mjs', () => ({ findProject: vi.fn(), listProjectNames: vi.fn() }));
vi.mock('../tag-and-release.mjs', () => ({ tagAndRelease: vi.fn() }));

const { publishPackage } = await import('../npm-publish.mjs');
const { versionExists } = await import('../npm-version-exists.mjs');
const { publishMissing } = await import('../publish-missing.mjs');
const { planTagReleases } = await import('../release-only-plan.mjs');
const { planReleases } = await import('../release-plan.mjs');
const { applyVersionBump, listChangedPackageNames } = await import('../rush-publish-apply.mjs');
const { findProject, listProjectNames } = await import('../rush-project.mjs');
const { tagAndRelease } = await import('../tag-and-release.mjs');
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
  it('delegates to applyVersionBump with the given package', async () => {
    await main(['apply', '@vielzeug/ore']);
    expect(applyVersionBump).toHaveBeenCalledWith('@vielzeug/ore');
  });

  it('delegates with undefined for a bulk apply', async () => {
    await main(['apply']);
    expect(applyVersionBump).toHaveBeenCalledWith(undefined);
  });
});

describe('plan', () => {
  let beforeFile;

  beforeEach(() => {
    beforeFile = path.join(mkdtempSync(path.join(tmpdir(), 'cli-plan-test-')), 'versions-before.txt');
    writeFileSync(beforeFile, '@vielzeug/ore=1.0.0\n@vielzeug/orbit=2.0.0\n');
  });

  afterEach(() => {
    rmSync(path.dirname(beforeFile), { recursive: true, force: true });
  });

  it('parses the before-file and prints the plan as JSON', async () => {
    planReleases.mockResolvedValue([{ folder: 'packages/ore', package: '@vielzeug/ore', version: '1.1.0' }]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['plan', `--before-file=${beforeFile}`, '@vielzeug/ore', '@vielzeug/orbit']);

    expect(planReleases).toHaveBeenCalledWith(['@vielzeug/ore', '@vielzeug/orbit'], {
      '@vielzeug/orbit': '2.0.0',
      '@vielzeug/ore': '1.0.0',
    });
    expect(log).toHaveBeenCalledWith(
      JSON.stringify([{ folder: 'packages/ore', package: '@vielzeug/ore', version: '1.1.0' }]),
    );
  });
});

describe('publish', () => {
  it('skips publishing when the version already exists on npm', async () => {
    versionExists.mockResolvedValue(true);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['publish', '@vielzeug/ore', '1.0.4', 'packages/ore']);

    expect(log).toHaveBeenCalledWith('⚠️  @vielzeug/ore@1.0.4 already on npm — skipping');
    expect(publishPackage).not.toHaveBeenCalled();
    expect(tagAndRelease).not.toHaveBeenCalled();
  });

  it('publishes then tags and releases when the version is new', async () => {
    versionExists.mockResolvedValue(false);

    await main(['publish', '@vielzeug/ore', '1.0.4', 'packages/ore']);

    expect(publishPackage).toHaveBeenCalledWith('packages/ore', { dryRun: false, interactive: false, otp: undefined });
    expect(tagAndRelease).toHaveBeenCalledWith({
      dryRun: false,
      folder: 'packages/ore',
      package: '@vielzeug/ore',
      version: '1.0.4',
    });
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
    // cli.mjs was already imported (at the top of this file) with DRY_RUN unset — if `dryRun`
    // were captured at import time instead of inside main(), setting it now would have no effect.
    versionExists.mockResolvedValue(false);
    const originalDryRun = process.env.DRY_RUN;
    process.env.DRY_RUN = '1';

    try {
      await main(['publish', '@vielzeug/ore', '1.0.4', 'packages/ore']);
      expect(publishPackage).toHaveBeenCalledWith('packages/ore', { dryRun: true, interactive: false, otp: undefined });
    } finally {
      if (originalDryRun === undefined) delete process.env.DRY_RUN;
      else process.env.DRY_RUN = originalDryRun;
    }
  });
});

describe('tag-release', () => {
  it('throws when the version is not on npm yet', async () => {
    versionExists.mockResolvedValue(false);

    await expect(main(['tag-release', '@vielzeug/ore', '1.0.4', 'packages/ore'])).rejects.toThrow(
      '@vielzeug/ore@1.0.4 not found on npm',
    );
    expect(tagAndRelease).not.toHaveBeenCalled();
  });

  it('tags and releases without publishing when the version already exists on npm', async () => {
    versionExists.mockResolvedValue(true);

    await main(['tag-release', '@vielzeug/ore', '1.0.4', 'packages/ore']);

    expect(publishPackage).not.toHaveBeenCalled();
    expect(tagAndRelease).toHaveBeenCalledWith({
      dryRun: false,
      folder: 'packages/ore',
      package: '@vielzeug/ore',
      version: '1.0.4',
    });
  });

  it('honors DRY_RUN', async () => {
    versionExists.mockResolvedValue(true);
    const originalDryRun = process.env.DRY_RUN;
    process.env.DRY_RUN = '1';

    try {
      await main(['tag-release', '@vielzeug/ore', '1.0.4', 'packages/ore']);
      expect(tagAndRelease).toHaveBeenCalledWith({
        dryRun: true,
        folder: 'packages/ore',
        package: '@vielzeug/ore',
        version: '1.0.4',
      });
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
