import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { listPublishablePackages, publishMissing, summaryMarkdown } from '../publish-missing.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

function makePackage(root, slug, pkgJson) {
  const dir = path.join(root, 'packages', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkgJson));
}

function makeRepo(packages) {
  root = mkdtempSync(path.join(tmpdir(), 'publish-missing-test-'));
  const projects = packages.map(({ slug }) => ({ packageName: `pkg-${slug}`, projectFolder: `packages/${slug}` }));
  writeFileSync(path.join(root, 'rush.json'), JSON.stringify({ projects }));
  for (const pkg of packages) makePackage(root, pkg.slug, pkg.json);
  return root;
}

describe('listPublishablePackages()', () => {
  it('excludes private and non-@vielzeug packages, and folders with no package.json', () => {
    const repo = makeRepo([
      { json: { name: '@vielzeug/ore', version: '1.0.0' }, slug: 'ore' },
      { json: { name: '@vielzeug/internal-tool', private: true, version: '1.0.0' }, slug: 'internal-tool' },
      { json: { name: 'not-scoped', version: '1.0.0' }, slug: 'not-scoped' },
    ]);
    mkdirSync(path.join(repo, 'packages', 'half-scaffolded'), { recursive: true });

    const packages = listPublishablePackages(repo);
    expect(packages).toEqual([{ folder: 'packages/ore', name: '@vielzeug/ore', version: '1.0.0' }]);
  });
});

describe('publishMissing()', () => {
  it('skips packages whose version already exists and publishes the rest', async () => {
    const repo = makeRepo([
      { json: { name: '@vielzeug/ore', version: '1.0.4' }, slug: 'ore' },
      { json: { name: '@vielzeug/orbit', version: '2.0.0' }, slug: 'orbit' },
    ]);

    const checkVersion = vi.fn(async (name) => name === '@vielzeug/ore');
    const publish = vi.fn(async () => {});

    const results = await publishMissing(repo, { checkVersion, publish });

    expect(results.skipped).toEqual(['@vielzeug/ore@1.0.4']);
    expect(results.published).toEqual(['@vielzeug/orbit@2.0.0']);
    expect(publish).toHaveBeenCalledWith(path.join(repo, 'packages', 'orbit'), { dryRun: false });
  });

  it('passes dryRun through to the publish function', async () => {
    const repo = makeRepo([{ json: { name: '@vielzeug/ore', version: '1.0.4' }, slug: 'ore' }]);
    const checkVersion = vi.fn(async () => false);
    const publish = vi.fn(async () => {});

    await publishMissing(repo, { checkVersion, dryRun: true, publish });

    expect(publish).toHaveBeenCalledWith(path.join(repo, 'packages', 'ore'), { dryRun: true });
  });

  it('records a failure without aborting the remaining packages', async () => {
    const repo = makeRepo([
      { json: { name: '@vielzeug/ore', version: '1.0.4' }, slug: 'ore' },
      { json: { name: '@vielzeug/orbit', version: '2.0.0' }, slug: 'orbit' },
    ]);

    const checkVersion = vi.fn(async () => false);
    const publish = vi.fn(async (folder) => {
      if (folder.endsWith('ore')) throw new Error('registry rejected the publish');
    });

    const results = await publishMissing(repo, { checkVersion, publish });

    expect(results.failed).toEqual(['@vielzeug/ore@1.0.4']);
    expect(results.published).toEqual(['@vielzeug/orbit@2.0.0']);
  });
});

describe('summaryMarkdown()', () => {
  it('renders each section, falling back to "none" when empty', () => {
    const markdown = summaryMarkdown({ failed: [], published: ['@vielzeug/ore@1.0.4'], skipped: [] });
    expect(markdown).toContain('- @vielzeug/ore@1.0.4');
    expect(markdown).toContain('_none_');
  });
});
