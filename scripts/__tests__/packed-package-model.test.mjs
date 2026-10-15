import { describe, expect, it } from 'vitest';

import {
  collectPackageClosure,
  exportEntries,
  externalOptionalPeerDependencies,
  hasSourceCondition,
  targetPaths,
} from '../lib/packed-package-model.mjs';

describe('packed-package model', () => {
  it('collects complete workspace dependency closure once', () => {
    const projects = new Map([
      ['@vielzeug/a', '/a'],
      ['@vielzeug/b', '/b'],
      ['@vielzeug/c', '/c'],
    ]);
    const manifests = {
      '/a': { dependencies: { '@vielzeug/b': 'workspace:*' } },
      '/b': { peerDependencies: { '@vielzeug/c': 'workspace:^' } },
      '/c': {},
    };

    expect([...collectPackageClosure(['@vielzeug/a'], projects, (folder) => manifests[folder]).keys()]).toEqual([
      '@vielzeug/a',
      '@vielzeug/b',
      '@vielzeug/c',
    ]);
  });

  it('installs only external optional peers that are not already package dependencies', () => {
    const manifests = [
      {
        dependencies: { installed: '^1.0.0' },
        peerDependencies: { lucide: '^1.48.0', installed: '^2.0.0', required: '^3.0.0', '@vielzeug/ore': 'workspace:*' },
        peerDependenciesMeta: {
          lucide: { optional: true },
          installed: { optional: true },
          required: { optional: false },
          '@vielzeug/ore': { optional: true },
        },
      },
      { optionalDependencies: { alsoInstalled: '^4.0.0' } },
    ];

    expect(externalOptionalPeerDependencies(manifests)).toEqual({ lucide: '^1.48.0' });
  });

  it('models string and conditional exports without treating CSS as JavaScript', () => {
    const manifest = {
      exports: {
        '.': { import: './dist/index.js', require: './dist/index.cjs', types: './dist/index.d.ts' },
        './theme': './dist/theme.css',
      },
      name: '@vielzeug/example',
    };

    expect(exportEntries(manifest)).toEqual([
      { import: './dist/index.js', require: './dist/index.cjs', specifier: '@vielzeug/example', types: './dist/index.d.ts' },
      { import: './dist/theme.css', specifier: '@vielzeug/example/theme' },
    ]);
    expect(targetPaths(manifest.exports)).toEqual(['./dist/index.js', './dist/index.cjs', './dist/index.d.ts', './dist/theme.css']);
    expect(hasSourceCondition(manifest.exports)).toBe(false);
    expect(hasSourceCondition({ '.': { source: './src/index.ts' } })).toBe(true);
  });
});
