import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkNpmAuth, runLocalPublish } from '../local-publish.mjs';

describe('checkNpmAuth()', () => {
  it('returns true when `npm whoami` succeeds', () => {
    const run = vi.fn(() => 'some-user\n');
    expect(checkNpmAuth({ run })).toBe(true);
    expect(run).toHaveBeenCalledWith('npm', ['whoami']);
  });

  it('returns false when `npm whoami` throws (not logged in)', () => {
    const run = vi.fn(() => {
      throw new Error('ENEEDAUTH');
    });
    expect(checkNpmAuth({ run })).toBe(false);
  });
});

describe('runLocalPublish()', () => {
  let build;
  let checkAuth;
  let confirmFn;
  let publish;
  let logSpy;

  beforeEach(() => {
    build = vi.fn();
    checkAuth = vi.fn(() => true);
    confirmFn = vi.fn(async () => true);
    publish = vi.fn(async () => ({ failed: [], published: ['@vielzeug/ore@1.0.4'], skipped: [] }));
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('throws before building or publishing when not logged in to npm', async () => {
    checkAuth.mockReturnValue(false);

    await expect(runLocalPublish({ build, checkAuth, confirmFn, publish })).rejects.toThrow('Not logged in to npm');

    expect(build).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('skips the npm-auth check in dry-run mode', async () => {
    checkAuth.mockReturnValue(false);

    await runLocalPublish({ build, checkAuth, confirmFn, dryRun: true, publish });

    expect(publish).toHaveBeenCalledWith(undefined, { dryRun: true, interactive: true, otp: undefined });
  });

  it('always runs interactively — shares this terminal with npm for browser-trust flows', async () => {
    await runLocalPublish({ build, checkAuth, confirmFn, publish });
    expect(publish).toHaveBeenCalledWith(undefined, { dryRun: false, interactive: true, otp: undefined });
  });

  it('builds all packages by default before publishing', async () => {
    await runLocalPublish({ build, checkAuth, confirmFn, publish });
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('skips the build step when skipBuild is set', async () => {
    await runLocalPublish({ build, checkAuth, confirmFn, publish, skipBuild: true });
    expect(build).not.toHaveBeenCalled();
  });

  it('prompts for confirmation and aborts without publishing when declined', async () => {
    confirmFn.mockResolvedValue(false);

    const results = await runLocalPublish({ build, checkAuth, confirmFn, publish });

    expect(publish).not.toHaveBeenCalled();
    expect(results).toEqual({ failed: [], published: [], skipped: [] });
  });

  it('skips the confirmation prompt when yes is set', async () => {
    await runLocalPublish({ build, checkAuth, confirmFn, publish, yes: true });
    expect(confirmFn).not.toHaveBeenCalled();
  });

  it('skips the confirmation prompt in dry-run mode', async () => {
    await runLocalPublish({ build, checkAuth, confirmFn, dryRun: true, publish });
    expect(confirmFn).not.toHaveBeenCalled();
  });

  it('forwards otp to the publish function', async () => {
    await runLocalPublish({ build, checkAuth, confirmFn, otp: '123456', publish });
    expect(publish).toHaveBeenCalledWith(undefined, { dryRun: false, interactive: true, otp: '123456' });
  });

  it('publishes and prints the summary plus a no-tagging note when something was published', async () => {
    const results = await runLocalPublish({ build, checkAuth, confirmFn, publish });

    expect(results.published).toEqual(['@vielzeug/ore@1.0.4']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Publish Missing Summary'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('did not create git tags'));
  });

  it('does not print the no-tagging note when nothing was published', async () => {
    publish.mockResolvedValue({ failed: [], published: [], skipped: ['@vielzeug/ore@1.0.4'] });

    await runLocalPublish({ build, checkAuth, confirmFn, publish });

    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('did not create git tags'));
  });
});
