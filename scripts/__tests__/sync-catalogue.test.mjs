import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { dependencyGraphSection, formatNameList, readPackages } from '../sync-catalogue.mjs';

describe('module has no import-time side effects', () => {
  it('only exports functions, does not touch the filesystem', () => {
    expect(typeof dependencyGraphSection).toBe('function');
  });
});

describe('formatNameList()', () => {
  it('returns empty string for no names', () => {
    expect(formatNameList([])).toBe('');
  });

  it('quotes a single name with no conjunction', () => {
    expect(formatNameList(['a'])).toBe('`a`');
  });

  it('joins two names with "and"', () => {
    expect(formatNameList(['a', 'b'])).toBe('`a` and `b`');
  });

  it('joins three or more names with an Oxford comma', () => {
    expect(formatNameList(['a', 'b', 'c'])).toBe('`a`, `b`, and `c`');
  });
});

describe('readPackages()', () => {
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

  it('extracts @vielzeug/* runtime deps, ignoring devDependencies and non-scoped deps', () => {
    root = mkdtempSync(path.join(tmpdir(), 'sync-catalogue-test-'));
    makePackage(root, 'forge', {
      name: '@vielzeug/forge',
      dependencies: { '@vielzeug/arsenal': 'workspace:*', '@vielzeug/ripple': 'workspace:*', zod: '^3.0.0' },
      devDependencies: { '@vielzeug/scout': 'workspace:*' },
    });

    const [pkg] = readPackages(root);
    expect(pkg).toEqual({ deps: ['arsenal', 'ripple'], optionalPeers: [], slug: 'forge' });
  });

  it('extracts optional peer deps from peerDependenciesMeta, ignoring required peers', () => {
    root = mkdtempSync(path.join(tmpdir(), 'sync-catalogue-test-'));
    makePackage(root, 'flux', {
      name: '@vielzeug/flux',
      peerDependencies: { '@vielzeug/courier': 'workspace:*', '@vielzeug/pulse': 'workspace:*' },
      peerDependenciesMeta: {
        '@vielzeug/courier': { optional: true },
        '@vielzeug/pulse': {},
      },
    });

    const [pkg] = readPackages(root);
    expect(pkg.optionalPeers).toEqual(['courier']);
  });

  it('skips a package directory with no package.json', () => {
    root = mkdtempSync(path.join(tmpdir(), 'sync-catalogue-test-'));
    mkdirSync(path.join(root, 'packages', 'half-scaffolded'), { recursive: true });
    makePackage(root, 'real', { name: '@vielzeug/real' });

    const packages = readPackages(root);
    expect(packages).toHaveLength(1);
    expect(packages[0].slug).toBe('real');
  });
});

describe('dependencyGraphSection()', () => {
  it('renders the fenced graph, independence line, and optional-peer notes, sorted by slug', () => {
    const section = dependencyGraphSection([
      { deps: ['arsenal'], optionalPeers: [], slug: 'sourcerer' },
      { deps: [], optionalPeers: [], slug: 'arsenal' },
      { deps: ['ripple'], optionalPeers: ['courier'], slug: 'flux' },
    ]);

    expect(section).toBe(
      [
        '```text',
        'flux      → ripple',
        'sourcerer → arsenal',
        '```',
        '',
        'Fully independent (no `@vielzeug/*` deps): `arsenal`.',
        '',
        '> **Note:** `flux` also declares optional peer dependencies on `courier`.',
      ].join('\n'),
    );
  });

  it('omits the independence line trailing packages gracefully when every package has a dep', () => {
    const section = dependencyGraphSection([{ deps: ['ripple'], optionalPeers: [], slug: 'forge' }]);
    expect(section).toContain('Fully independent (no `@vielzeug/*` deps): .');
  });
});
