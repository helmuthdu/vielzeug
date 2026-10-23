import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { normalizePackageManifest, syncPackageLicenseFiles } from '../lib/package-manifest.mjs';
import { syncPackageManifests } from '../sync-package-manifests.mjs';

const fixtures = [];

function fixturePackage(manifest) {
  const directory = mkdtempSync(path.join(tmpdir(), 'vielzeug-manifest-'));
  const packageDirectory = path.join(directory, 'example');

  writeFileSync(path.join(directory, 'package.json'), '{}\n');
  mkdirSync(packageDirectory);
  writeFileSync(path.join(packageDirectory, 'package.json'), JSON.stringify(manifest, null, 2));
  fixtures.push(directory);

  return { directory, packageDirectory };
}

afterEach(() => {
  for (const directory of fixtures.splice(0)) rmSync(directory, { force: true, recursive: true });
});

describe('normalizePackageManifest()', () => {
  it('preserves types-first ESM and CJS export conditions without mutating the input', () => {
    const manifest = {
      exports: {
        '.': {
          types: './dist/index.d.ts',
          source: './src/index.ts',
          import: './dist/index.js',
          require: './dist/index.cjs',
        },
        './http': {
          types: './dist/http.d.ts',
          source: './src/http.ts',
          import: './dist/http.js',
          require: './dist/http.cjs',
        },
      },
    };
    const original = structuredClone(manifest);
    const normalized = normalizePackageManifest(manifest);

    for (const subpath of ['.', './http']) {
      expect(Object.keys(normalized.exports[subpath])).toEqual(['types', 'import', 'require']);
      expect(normalized.exports[subpath].types).toBe(original.exports[subpath].types);
      expect(normalized.exports[subpath].import).toBe(original.exports[subpath].import);
      expect(normalized.exports[subpath].require).toBe(original.exports[subpath].require);
    }
    expect(normalized.typesVersions).toEqual({ '*': { http: ['dist/http.d.ts'] } });
    expect(manifest).toEqual(original);
    expect(Object.keys(manifest.exports['.'])).toEqual(['types', 'source', 'import', 'require']);
  });

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

  it('orders common package fields before dependencies and unknown fields', () => {
    expect(
      Object.keys(
        normalizePackageManifest({
          custom: true,
          dependencies: {},
          description: 'Example package',
          name: '@vielzeug/example',
          scripts: {},
          version: '1.0.0',
        }),
      ),
    ).toEqual(['name', 'version', 'description', 'repository', 'license', 'scripts', 'dependencies', 'custom']);
  });

  it('injects the MIT license for publishable packages only', () => {
    expect(normalizePackageManifest({ name: '@vielzeug/example', version: '1.0.0' }).license).toBe('MIT');
    expect(normalizePackageManifest({ name: 'demo-app', version: '1.0.0', private: true }).license).toBeUndefined();
    expect(normalizePackageManifest({ name: '@vielzeug/example', version: '1.0.0', license: 'MIT' }).license).toBe('MIT');
  });
});

describe('syncPackageLicenseFiles()', () => {
  it('copies the root license into publishable packages and reports stale files in check mode', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'vielzeug-license-'));
    const packagesDirectory = path.join(directory, 'packages');
    const packageDirectory = path.join(packagesDirectory, 'example');
    mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(path.join(directory, 'LICENSE'), 'MIT License\n');
    writeFileSync(path.join(packageDirectory, 'package.json'), JSON.stringify({ name: '@vielzeug/example', version: '1.0.0' }));
    fixtures.push(directory);

    const stale = syncPackageLicenseFiles({ packagesDir: packagesDirectory, rootLicense: path.join(directory, 'LICENSE'), check: true });
    expect(stale).toEqual([path.join(packageDirectory, 'LICENSE')]);
    expect(() => readFileSync(path.join(packageDirectory, 'LICENSE'), 'utf8')).toThrow();

    expect(syncPackageLicenseFiles({ packagesDir: packagesDirectory, rootLicense: path.join(directory, 'LICENSE') })).toEqual(stale);
    expect(readFileSync(path.join(packageDirectory, 'LICENSE'), 'utf8')).toBe('MIT License\n');
    expect(syncPackageLicenseFiles({ packagesDir: packagesDirectory, rootLicense: path.join(directory, 'LICENSE') })).toEqual([]);
  });
});

describe('syncPackageManifests()', () => {
  it('normalizes root and demo manifests', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'vielzeug-manifest-'));
    const packagesDirectory = path.join(directory, 'packages');
    const demosDirectory = path.join(directory, 'demos');
    const demoDirectory = path.join(demosDirectory, 'example');
    mkdirSync(packagesDirectory);
    mkdirSync(demoDirectory, { recursive: true });
    writeFileSync(path.join(directory, 'package.json'), '{"version":"1.0.0","name":"root"}\n');
    writeFileSync(path.join(demoDirectory, 'package.json'), '{"scripts":{},"name":"demo","private":true}\n');
    fixtures.push(directory);

    syncPackageManifests({ packagesDir: packagesDirectory });

    expect(Object.keys(JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')))).toEqual(['name', 'version']);
    expect(Object.keys(JSON.parse(readFileSync(path.join(demoDirectory, 'package.json'), 'utf8')))).toEqual([
      'name',
      'private',
      'scripts',
    ]);
  });

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
