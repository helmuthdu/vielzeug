import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

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

// These tests exercise the pack/publish/retry flow only — `resolveWorkspaceDeps` (real
// package.json rewriting) is covered separately in the `resolveWorkspaceDeps` describe block
// below, so it's stubbed out here to a no-op restore function.
const noopResolveWorkspaceDeps = () => vi.fn();

describe('publishPackage()', () => {
  it('publishes on the first attempt when npm succeeds', async () => {
    const run = vi
      .fn()
      .mockReturnValueOnce(packResult('pkg-1.0.0.tgz'))
      .mockReturnValueOnce('npm notice Publishing to https://registry.npmjs.org/\n');
    const sleep = vi.fn();

    await publishPackage('/repo/packages/pkg', { resolveWorkspaceDeps: noopResolveWorkspaceDeps, run, sleep });

    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenNthCalledWith(2, 'npm', ['publish', 'pkg-1.0.0.tgz', '--access', 'public'], {
      cwd: '/repo/packages/pkg',
    });
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

    await publishPackage('/repo/packages/pkg', { resolveWorkspaceDeps: noopResolveWorkspaceDeps, run, sleep });

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

    await expect(
      publishPackage('/repo/packages/pkg', { resolveWorkspaceDeps: noopResolveWorkspaceDeps, run, sleep }),
    ).rejects.toThrow('npm publish failed for pkg-1.0.0.tgz');
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('gives up after exhausting all retries on persistent conflicts', async () => {
    const run = vi
      .fn()
      .mockReturnValueOnce(packResult('pkg-1.0.0.tgz'))
      .mockImplementation(() => {
        throw conflictError();
      });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      publishPackage('/repo/packages/pkg', { resolveWorkspaceDeps: noopResolveWorkspaceDeps, run, sleep }),
    ).rejects.toThrow('npm publish failed for pkg-1.0.0.tgz');
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenCalledTimes(5); // 1 pack + 4 publish attempts
  });

  it('packs but never calls npm publish in dry-run mode', async () => {
    const run = vi.fn().mockReturnValueOnce(packResult('pkg-1.0.0.tgz'));
    const sleep = vi.fn();

    await publishPackage('/repo/packages/pkg', {
      dryRun: true,
      resolveWorkspaceDeps: noopResolveWorkspaceDeps,
      run,
      sleep,
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('npm', ['pack', '--json'], { cwd: '/repo/packages/pkg' });
  });

  it('appends --otp when one is provided (2FA-for-writes accounts)', async () => {
    const run = vi.fn().mockReturnValueOnce(packResult('pkg-1.0.0.tgz')).mockReturnValueOnce('published');
    const sleep = vi.fn();

    await publishPackage('/repo/packages/pkg', {
      otp: '123456',
      resolveWorkspaceDeps: noopResolveWorkspaceDeps,
      run,
      sleep,
    });

    expect(run).toHaveBeenNthCalledWith(2, 'npm', ['publish', 'pkg-1.0.0.tgz', '--access', 'public', '--otp=123456'], {
      cwd: '/repo/packages/pkg',
    });
  });

  it('omits --otp entirely when none is provided', async () => {
    const run = vi.fn().mockReturnValueOnce(packResult('pkg-1.0.0.tgz')).mockReturnValueOnce('published');
    const sleep = vi.fn();

    await publishPackage('/repo/packages/pkg', { resolveWorkspaceDeps: noopResolveWorkspaceDeps, run, sleep });

    expect(run).toHaveBeenNthCalledWith(2, 'npm', ['publish', 'pkg-1.0.0.tgz', '--access', 'public'], {
      cwd: '/repo/packages/pkg',
    });
  });

  it('runs the publish step with inherited stdio when interactive (browser-trust flows)', async () => {
    const run = vi.fn().mockReturnValueOnce(packResult('pkg-1.0.0.tgz')).mockReturnValueOnce(undefined);
    const sleep = vi.fn();

    await publishPackage('/repo/packages/pkg', {
      interactive: true,
      resolveWorkspaceDeps: noopResolveWorkspaceDeps,
      run,
      sleep,
    });

    expect(run).toHaveBeenNthCalledWith(2, 'npm', ['publish', 'pkg-1.0.0.tgz', '--access', 'public'], {
      cwd: '/repo/packages/pkg',
      inherit: true,
    });
  });

  it('does not retry on E409 when interactive (no captured output to inspect)', async () => {
    const run = vi
      .fn()
      .mockReturnValueOnce(packResult('pkg-1.0.0.tgz'))
      .mockImplementationOnce(() => {
        throw conflictError();
      });
    const sleep = vi.fn();

    await expect(
      publishPackage('/repo/packages/pkg', {
        interactive: true,
        resolveWorkspaceDeps: noopResolveWorkspaceDeps,
        run,
        sleep,
      }),
    ).rejects.toThrow(conflictError().message);
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).not.toHaveBeenCalled();
  });
});

// Exercises the real, non-stubbed `resolveWorkspaceDeps` default: rewriting `workspace:*`
// dependency specifiers in an on-disk package.json to real semver ranges before `npm pack`
// packs it, then restoring the original file so a re-run of `pnpm build`/git diff doesn't see a
// permanently mutated package.json. See resolve-workspace-deps.test.mjs for the pure-function
// resolution rules themselves.
describe('publishPackage() workspace: dependency rewriting (default resolveWorkspaceDeps)', () => {
  let folder;

  afterEach(() => {
    if (folder) rmSync(folder, { recursive: true, force: true });
    folder = undefined;
  });

  function makePackage(pkg) {
    folder = mkdtempSync(path.join(tmpdir(), 'npm-publish-test-'));
    writeFileSync(path.join(folder, 'package.json'), JSON.stringify(pkg, null, 2));
    return folder;
  }

  it('rewrites workspace:* deps on disk before packing, then restores the original file', async () => {
    const original = { dependencies: { '@vielzeug/ripple': 'workspace:*' }, name: '@vielzeug/scroll' };
    const dir = makePackage(original);
    let packageJsonDuringPack;

    const run = vi.fn((cmd) => {
      if (cmd === 'npm') {
        packageJsonDuringPack = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
        return packResult('scroll-1.0.0.tgz');
      }
    });

    await publishPackage(dir, {
      dryRun: true,
      findProject: () => ({ folder: 'packages/ripple', version: '1.2.1' }),
      run,
      sleep: vi.fn(),
    });

    expect(packageJsonDuringPack.dependencies).toEqual({ '@vielzeug/ripple': '1.2.1' });
    expect(JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))).toEqual(original);
  });

  it('restores the original package.json even when npm pack throws', async () => {
    const original = { dependencies: { '@vielzeug/ripple': 'workspace:*' }, name: '@vielzeug/scroll' };
    const dir = makePackage(original);
    const run = vi.fn(() => {
      throw new Error('npm pack failed');
    });

    await expect(
      publishPackage(dir, { findProject: () => ({ folder: 'packages/ripple', version: '1.2.1' }), run }),
    ).rejects.toThrow('npm pack failed');

    expect(JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))).toEqual(original);
  });
});
