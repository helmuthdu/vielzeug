import { describe, expect, it, vi } from 'vitest';

import { publishPackage } from '../npm-publish.mjs';

function artifact(files = [{ path: 'dist/index.js' }]) {
  return { cleanup: vi.fn(), files, tarballPath: '/staging/pkg-1.0.0.tgz' };
}

function conflictError() {
  const error = new Error('npm publish failed');
  error.stdout = '';
  error.stderr = 'npm error code E409\nnpm error 409 Conflict\n';
  return error;
}

function authError() {
  const error = new Error('npm publish failed');
  error.stdout = '';
  error.stderr = 'npm error code ENEEDAUTH\n';
  return error;
}

describe('publishPackage()', () => {
  it('publishes packed artifact on first attempt', async () => {
    const run = vi.fn().mockReturnValue('published');
    const pack = vi.fn(() => artifact());

    await publishPackage('/repo/packages/pkg', { pack, run });

    expect(pack).toHaveBeenCalledWith('/repo/packages/pkg', { findProject: undefined, run });
    expect(run).toHaveBeenCalledWith('npm', ['publish', '/staging/pkg-1.0.0.tgz', '--access', 'public'], {
      cwd: '/repo/packages/pkg',
    });
  });

  it('cleans staging artifacts after successful and failed publication', async () => {
    const success = artifact();
    await publishPackage('/repo/packages/pkg', { pack: vi.fn(() => success), run: vi.fn().mockReturnValue('published') });
    expect(success.cleanup).toHaveBeenCalledOnce();

    const failure = artifact();
    await expect(
      publishPackage('/repo/packages/pkg', { pack: vi.fn(() => failure), run: vi.fn(() => { throw authError(); }) }),
    ).rejects.toThrow('npm publish failed for pkg-1.0.0.tgz');
    expect(failure.cleanup).toHaveBeenCalledOnce();
  });

  it('retries registry conflicts with backoff', async () => {
    const run = vi
      .fn()
      .mockImplementationOnce(() => {
        throw conflictError();
      })
      .mockImplementationOnce(() => {
        throw conflictError();
      })
      .mockReturnValueOnce('published');
    const sleep = vi.fn().mockResolvedValue(undefined);

    await publishPackage('/repo/packages/pkg', { pack: vi.fn(() => artifact()), run, sleep });

    expect(sleep).toHaveBeenNthCalledWith(1, 5_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 15_000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-conflict failures', async () => {
    const run = vi.fn(() => {
      throw authError();
    });
    const sleep = vi.fn();

    await expect(publishPackage('/repo/packages/pkg', { pack: vi.fn(() => artifact()), run, sleep })).rejects.toThrow(
      'npm publish failed for pkg-1.0.0.tgz',
    );
    expect(run).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('does not publish during dry runs', async () => {
    const run = vi.fn();
    const packed = artifact();

    await publishPackage('/repo/packages/pkg', { dryRun: true, pack: vi.fn(() => packed), run });

    expect(run).not.toHaveBeenCalled();
    expect(packed.cleanup).toHaveBeenCalledOnce();
  });

  it('refuses artifacts without dist output', async () => {
    const packed = artifact([{ path: 'package.json' }]);

    await expect(publishPackage('/repo/packages/pkg', { pack: vi.fn(() => packed) })).rejects.toThrow(
      'npm pack did not include a dist artifact',
    );
    expect(packed.cleanup).toHaveBeenCalledOnce();
  });

  it('adds OTP and inherited stdio only when requested', async () => {
    const run = vi.fn().mockReturnValue(undefined);

    await publishPackage('/repo/packages/pkg', {
      interactive: true,
      otp: '123456',
      pack: vi.fn(() => artifact()),
      run,
    });

    expect(run).toHaveBeenCalledWith('npm', ['publish', '/staging/pkg-1.0.0.tgz', '--access', 'public', '--otp=123456'], {
      cwd: '/repo/packages/pkg',
      inherit: true,
    });
  });
});
