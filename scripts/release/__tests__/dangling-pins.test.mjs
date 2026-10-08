import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { findDanglingPins } from '../dangling-pins.mjs';

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
  root = mkdtempSync(path.join(tmpdir(), 'dangling-pins-test-'));
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
