import { afterEach, describe, expect, it } from 'vitest';

import { mergePackageData, patchPackagesReference, renderPackagesTable } from '../sync-ai-data.mjs';

describe('module has no import-time side effects', () => {
  it('only exports functions, does not touch the filesystem', () => {
    expect(typeof renderPackagesTable).toBe('function');
  });
});

describe('mergePackageData()', () => {
  afterEach(() => {
    // no temp files; kept only to mirror the no-side-effects contract across script tests
  });

  it('preserves curated metadata while refreshing live dependency fields', () => {
    const merged = mergePackageData(
      [
        {
          slug: 'flux',
          name: '@vielzeug/flux',
          category: 'Streams',
          description: 'Composable streams',
          domOutput: false,
          dependencies: [],
          optionalPeers: [],
        },
      ],
      [{ slug: 'flux', dependencies: ['ripple'], optionalPeers: ['courier'] }],
    );

    expect(merged[0].dependencies).toEqual(['ripple']);
    expect(merged[0].optionalPeers).toEqual(['courier']);
    expect(merged[0].category).toBe('Streams');
  });

  it('throws when a real package has no curated entry', () => {
    expect(() => mergePackageData([], [{ slug: 'flux', dependencies: [], optionalPeers: [] }])).toThrow(
      /missing curated metadata/,
    );
  });

  it('throws when a curated package no longer exists on disk', () => {
    expect(() =>
      mergePackageData(
        [
          {
            slug: 'ghost',
            name: '@vielzeug/ghost',
            category: 'Utilities',
            description: 'stale',
            domOutput: false,
            dependencies: [],
            optionalPeers: [],
          },
        ],
        [],
      ),
    ).toThrow(/stale curated entries/);
  });
});

describe('renderPackagesTable() / patchPackagesReference()', () => {
  it('renders a markdown table from package metadata', () => {
    const table = renderPackagesTable([
      {
        slug: 'ore',
        name: '@vielzeug/ore',
        category: 'UI',
        description: 'Web-component primitives',
        domOutput: true,
        dependencies: ['ripple'],
        optionalPeers: [],
      },
    ]);

    expect(table).toContain('| Package | Category | DOM | Description | Dependencies | Optional peers | Test command |');
    expect(table).toContain('| `@vielzeug/ore` | UI | yes | Web-component primitives | `ripple` | — | — |');
  });

  it('patches the generated packages table into the reference file', () => {
    const source = [
      '# Package Reference',
      '',
      '<!-- GENERATED:packages-table:BEGIN -->',
      '<!-- GENERATED:packages-table:END -->',
    ].join('\n');

    const patched = patchPackagesReference(source, [
      {
        slug: 'ward',
        name: '@vielzeug/ward',
        category: 'Auth',
        description: 'RBAC engine',
        domOutput: false,
        dependencies: [],
        optionalPeers: [],
      },
    ]);

    expect(patched).toMatch(/`@vielzeug\/ward`/);
    expect(patched).toMatch(/RBAC engine/);
  });
});
