import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { normalizePackageManifest } from '../lib/package-manifest.mjs';
import { syncPackageManifests } from '../sync-package-manifests.mjs';

const fixtures = [];

function fixturePackage(manifest) {
  const directory = mkdtempSync(path.join(tmpdir(), 'vielzeug-manifest-'));
  const packageDirectory = path.join(directory, 'example');

  writeFileSync(path.join(directory, 'package.json'), '{}');
  mkdirSync(packageDirectory);
  writeFileSync(path.join(packageDirectory, 'package.json'), JSON.stringify(manifest, null, 2));
  fixtures.push(directory);

  return { directory, packageDirectory };
}

afterEach(() => {
  for (const directory of fixtures.splice(0)) rmSync(directory, { force: true, recursive: true });
});

describe('normalizePackageManifest()', () => {
  it('removes source conditions and derives classic TypeScript subpath mappings', () => {
    expect(
      normalizePackageManifest({
        exports: {
          '.': { import: './dist/index.js', source: './src/index.ts', types: './dist/index.d.ts' },
          './math': { import: './dist/math.js', source: './src/math.ts', types: './dist/math.d.ts' },
        },
      }),
    ).toEqual({
      exports: {
        '.': { import: './dist/index.js', types: './dist/index.d.ts' },
        './math': { import: './dist/math.js', types: './dist/math.d.ts' },
      },
      typesVersions: { '*': { math: ['dist/math.d.ts'] } },
    });
  });
});

describe('syncPackageManifests()', () => {
  it('writes normalized manifests and reports stale manifests in check mode', () => {
    const { directory, packageDirectory } = fixturePackage({
      exports: { '.': { import: './dist/index.js', source: './src/index.ts', types: './dist/index.d.ts' } },
    });

    expect(() => syncPackageManifests({ check: true, packagesDir: directory })).toThrow('Package manifests need normalization');
    syncPackageManifests({ packagesDir: directory });

    expect(JSON.parse(readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'))).toEqual({
      exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
    });
    expect(() => syncPackageManifests({ check: true, packagesDir: directory })).not.toThrow();
  });
});
