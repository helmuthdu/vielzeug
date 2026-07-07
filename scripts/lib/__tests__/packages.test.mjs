import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { readPackageManifests } from '../packages.mjs';

let root;

function makePackage(root, slug, pkgJson) {
  const dir = path.join(root, 'packages', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkgJson));
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

describe('readPackageManifests()', () => {
  it('skips a directory with no package.json (a half-scaffolded package)', () => {
    root = mkdtempSync(path.join(tmpdir(), 'packages-test-'));
    makePackage(root, 'ore', { name: '@vielzeug/ore', version: '1.0.0' });
    mkdirSync(path.join(root, 'packages', 'half-scaffolded'), { recursive: true });

    expect(readPackageManifests(path.join(root, 'packages')).map((m) => m.slug)).toEqual(['ore']);
  });

  it('warns and skips (does not throw, does not silently vanish) a package.json that is not valid JSON', () => {
    // Not a throw: this scan runs on the VitePress dev-server startup path (via
    // vielzeug-packages.ts's alias builder) shared by every contributor, plus
    // sync-catalogue.mjs's and worktree.mjs's full-repo scans — one contributor's mid-edit
    // syntax error in an unrelated package must not be able to take the whole scan down.
    root = mkdtempSync(path.join(tmpdir(), 'packages-test-'));
    makePackage(root, 'ore', { name: '@vielzeug/ore', version: '1.0.0' });
    mkdirSync(path.join(root, 'packages', 'broken'), { recursive: true });
    writeFileSync(path.join(root, 'packages', 'broken', 'package.json'), '{ this is not json');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const manifests = readPackageManifests(path.join(root, 'packages'));

    expect(manifests.map((m) => m.slug)).toEqual(['ore']); // "broken" skipped, "ore" still present
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('broken/package.json'));
    errorSpy.mockRestore();
  });

  it('sorts entries alphabetically by slug', () => {
    root = mkdtempSync(path.join(tmpdir(), 'packages-test-'));
    makePackage(root, 'zulu', { name: '@vielzeug/zulu', version: '1.0.0' });
    makePackage(root, 'alpha', { name: '@vielzeug/alpha', version: '1.0.0' });

    expect(readPackageManifests(path.join(root, 'packages')).map((m) => m.slug)).toEqual(['alpha', 'zulu']);
  });

  it('extracts unscoped @vielzeug/* dependencies, ignoring non-@vielzeug deps', () => {
    root = mkdtempSync(path.join(tmpdir(), 'packages-test-'));
    makePackage(root, 'ore', {
      dependencies: { '@vielzeug/ripple': 'workspace:*', vitest: '^4.0.0' },
      name: '@vielzeug/ore',
      version: '1.0.0',
    });

    const [manifest] = readPackageManifests(path.join(root, 'packages'));
    expect(manifest.dependencies).toEqual(['ripple']);
  });

  it('sorts multiple dependencies alphabetically, regardless of declaration order', () => {
    root = mkdtempSync(path.join(tmpdir(), 'packages-test-'));
    makePackage(root, 'refine', {
      dependencies: {
        '@vielzeug/tempo': 'workspace:*',
        '@vielzeug/dnd': 'workspace:*',
        '@vielzeug/arsenal': 'workspace:*',
      },
      name: '@vielzeug/refine',
      version: '1.0.0',
    });

    const [manifest] = readPackageManifests(path.join(root, 'packages'));
    expect(manifest.dependencies).toEqual(['arsenal', 'dnd', 'tempo']);
  });

  it('a hard dependency is never marked optional, even if also listed as an optional peer', () => {
    root = mkdtempSync(path.join(tmpdir(), 'packages-test-'));
    makePackage(root, 'flux', {
      dependencies: { '@vielzeug/ripple': 'workspace:*' },
      name: '@vielzeug/flux',
      peerDependencies: { '@vielzeug/ripple': 'workspace:*' },
      peerDependenciesMeta: { '@vielzeug/ripple': { optional: true } },
      version: '1.0.0',
    });

    const [manifest] = readPackageManifests(path.join(root, 'packages'));
    expect(manifest.peers).toEqual([{ name: 'ripple', optional: false }]);
  });

  it('an optional peer dependency (not also a hard dependency) is marked optional', () => {
    root = mkdtempSync(path.join(tmpdir(), 'packages-test-'));
    makePackage(root, 'flux', {
      name: '@vielzeug/flux',
      peerDependencies: { '@vielzeug/courier': 'workspace:*' },
      peerDependenciesMeta: { '@vielzeug/courier': { optional: true } },
      version: '1.0.0',
    });

    const [manifest] = readPackageManifests(path.join(root, 'packages'));
    expect(manifest.peers).toEqual([{ name: 'courier', optional: true }]);
  });

  it('a required (non-optional) peer dependency is marked non-optional', () => {
    root = mkdtempSync(path.join(tmpdir(), 'packages-test-'));
    makePackage(root, 'ore', {
      name: '@vielzeug/ore',
      peerDependencies: { '@vielzeug/ripple': 'workspace:*' },
      version: '1.0.0',
    });

    const [manifest] = readPackageManifests(path.join(root, 'packages'));
    expect(manifest.peers).toEqual([{ name: 'ripple', optional: false }]);
  });

  it('peers is the union of dependencies and peerDependencies, sorted by name', () => {
    root = mkdtempSync(path.join(tmpdir(), 'packages-test-'));
    makePackage(root, 'refine', {
      dependencies: { '@vielzeug/ripple': 'workspace:*' },
      name: '@vielzeug/refine',
      peerDependencies: { '@vielzeug/arsenal': 'workspace:*' },
      version: '1.0.0',
    });

    const [manifest] = readPackageManifests(path.join(root, 'packages'));
    expect(manifest.peers).toEqual([
      { name: 'arsenal', optional: false },
      { name: 'ripple', optional: false },
    ]);
  });
});
