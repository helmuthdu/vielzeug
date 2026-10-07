import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { expandWithWorkspaceDependencies, findDanglingPins } from '../publish-closure.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

/**
 * A temp repo whose packages carry real `@vielzeug/*` dependency edges. `deps` maps a slug to
 * the slugs it depends on; every package is `@vielzeug/<slug>` at version 26.10.0.
 */
function makeRepo(edges) {
  root = mkdtempSync(path.join(tmpdir(), 'publish-closure-test-'));
  const projects = Object.keys(edges).map((slug) => ({ packageName: `@vielzeug/${slug}`, projectFolder: `packages/${slug}` }));
  writeFileSync(path.join(root, 'rush.json'), JSON.stringify({ projects }));

  for (const [slug, deps] of Object.entries(edges)) {
    const dir = path.join(root, 'packages', slug);
    mkdirSync(dir, { recursive: true });
    const manifest = {
      name: `@vielzeug/${slug}`,
      version: '26.10.0',
      ...(deps.length > 0 ? { dependencies: Object.fromEntries(deps.map((d) => [`@vielzeug/${d}`, 'workspace:*'])) } : {}),
    };
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
  }
  return root;
}

describe('expandWithWorkspaceDependencies()', () => {
  it('returns the names alone when they have no workspace dependencies', () => {
    const repo = makeRepo({ ore: [], coins: [] });
    expect(expandWithWorkspaceDependencies(['@vielzeug/ore'], { root: repo })).toEqual(['@vielzeug/ore']);
  });

  it('pulls in a direct dependency', () => {
    const repo = makeRepo({ prism: ['orbit'], orbit: [] });
    expect(expandWithWorkspaceDependencies(['@vielzeug/prism'], { root: repo })).toEqual(['@vielzeug/orbit', '@vielzeug/prism']);
  });

  it('pulls in the full transitive closure', () => {
    // prism -> orbit -> {arsenal, ripple}: the real 26.10.2 shape that left pins dangling.
    const repo = makeRepo({ prism: ['orbit'], orbit: ['arsenal', 'ripple'], arsenal: [], ripple: [] });
    expect(expandWithWorkspaceDependencies(['@vielzeug/prism'], { root: repo })).toEqual([
      '@vielzeug/arsenal',
      '@vielzeug/orbit',
      '@vielzeug/prism',
      '@vielzeug/ripple',
    ]);
  });

  it('de-duplicates a diamond dependency and returns a sorted set', () => {
    const repo = makeRepo({ a: ['b', 'c'], b: ['d'], c: ['d'], d: [] });
    expect(expandWithWorkspaceDependencies(['@vielzeug/a'], { root: repo })).toEqual([
      '@vielzeug/a',
      '@vielzeug/b',
      '@vielzeug/c',
      '@vielzeug/d',
    ]);
  });

  it('terminates on a dependency cycle', () => {
    const repo = makeRepo({ a: ['b'], b: ['a'] });
    expect(expandWithWorkspaceDependencies(['@vielzeug/a'], { root: repo })).toEqual(['@vielzeug/a', '@vielzeug/b']);
  });

  it('does not traverse a dependency that is not a publishable workspace package', () => {
    const repo = makeRepo({ prism: ['ghost'] }); // ghost is a dep edge but has no manifest of its own
    expect(expandWithWorkspaceDependencies(['@vielzeug/prism'], { root: repo })).toEqual(['@vielzeug/prism']);
  });
});

describe('findDanglingPins()', () => {
  it('reports nothing when every dependency rides the same train', async () => {
    const repo = makeRepo({ prism: ['orbit'], orbit: [] });
    const publishSet = [
      { package: '@vielzeug/prism', version: '26.10.0' },
      { package: '@vielzeug/orbit', version: '26.10.0' },
    ];

    await expect(findDanglingPins(publishSet, { checkVersion: async () => false, root: repo })).resolves.toEqual([]);
  });

  it('reports nothing when the dependency is already on the registry', async () => {
    const repo = makeRepo({ prism: ['orbit'], orbit: [] });
    const publishSet = [{ package: '@vielzeug/prism', version: '26.10.0' }];
    const checkVersion = vi.fn(async (name) => name === '@vielzeug/orbit'); // orbit already published

    await expect(findDanglingPins(publishSet, { checkVersion, root: repo })).resolves.toEqual([]);
  });

  it('reports a pin whose dependency is neither in the set nor on the registry', async () => {
    const repo = makeRepo({ prism: ['orbit'], orbit: [] });
    const publishSet = [{ package: '@vielzeug/prism', version: '26.10.0' }]; // orbit missing from the batch

    await expect(findDanglingPins(publishSet, { checkVersion: async () => false, root: repo })).resolves.toEqual([
      { dependency: '@vielzeug/orbit', dependencyVersion: '26.10.0', package: '@vielzeug/prism' },
    ]);
  });

  it('accepts publish-missing entries keyed by name', async () => {
    const repo = makeRepo({ prism: ['orbit'], orbit: [] });
    const publishSet = [{ name: '@vielzeug/prism', version: '26.10.0' }];

    await expect(findDanglingPins(publishSet, { checkVersion: async () => false, root: repo })).resolves.toEqual([
      { dependency: '@vielzeug/orbit', dependencyVersion: '26.10.0', package: '@vielzeug/prism' },
    ]);
  });

  it('ignores a dependency that is not a publishable workspace package', async () => {
    const repo = makeRepo({ prism: ['ghost'] });
    const publishSet = [{ package: '@vielzeug/prism', version: '26.10.0' }];

    await expect(findDanglingPins(publishSet, { checkVersion: async () => false, root: repo })).resolves.toEqual([]);
  });
});
