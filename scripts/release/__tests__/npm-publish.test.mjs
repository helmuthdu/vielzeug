import { describe, expect, it, vi } from 'vitest';

import { publishPackage } from '../npm-publish.mjs';

function packResult(filename) {
  return JSON.stringify([{ filename }]);
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
  it('publishes on the first attempt when npm succeeds', async () => {
    const run = vi
      .fn()
      .mockReturnValueOnce(packResult('pkg-1.0.0.tgz'))
      .mockReturnValueOnce('npm notice Publishing to https://registry.npmjs.org/\n');
    const sleep = vi.fn();

    await publishPackage('/repo/packages/pkg', { run, sleep });

    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenNthCalledWith(2, 'npm', ['publish', 'pkg-1.0.0.tgz', '--access', 'public'], { cwd: '/repo/packages/pkg' });
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries with backoff on E409 registry conflicts and eventually succeeds', async () => {
    const run = vi
      .fn()
      .mockReturnValueOnce(packResult('pkg-1.0.0.tgz'))
      .mockImplementationOnce(() => {
        throw conflictError();
      })
      .mockImplementationOnce(() => {
        throw conflictError();
      })
      .mockReturnValueOnce('published');
    const sleep = vi.fn().mockResolvedValue(undefined);

    await publishPackage('/repo/packages/pkg', { run, sleep });

    expect(run).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenNthCalledWith(1, 5_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 15_000);
  });

  it('does not retry a non-conflict failure (e.g. auth errors)', async () => {
    const run = vi
      .fn()
      .mockReturnValueOnce(packResult('pkg-1.0.0.tgz'))
      .mockImplementationOnce(() => {
        throw authError();
      });
    const sleep = vi.fn();

    await expect(publishPackage('/repo/packages/pkg', { run, sleep })).rejects.toThrow('npm publish failed for pkg-1.0.0.tgz');
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('gives up after exhausting all retries on persistent conflicts', async () => {
    const run = vi.fn().mockReturnValueOnce(packResult('pkg-1.0.0.tgz')).mockImplementation(() => {
      throw conflictError();
    });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(publishPackage('/repo/packages/pkg', { run, sleep })).rejects.toThrow('npm publish failed for pkg-1.0.0.tgz');
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenCalledTimes(5); // 1 pack + 4 publish attempts
  });

  it('packs but never calls npm publish in dry-run mode', async () => {
    const run = vi.fn().mockReturnValueOnce(packResult('pkg-1.0.0.tgz'));
    const sleep = vi.fn();

    await publishPackage('/repo/packages/pkg', { dryRun: true, run, sleep });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('npm', ['pack', '--json'], { cwd: '/repo/packages/pkg' });
  });
});
