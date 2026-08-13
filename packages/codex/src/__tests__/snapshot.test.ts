import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SnapshotCatalog } from '../catalog.js';
import { type LoadedSnapshot, loadSnapshot, validateSnapshot } from '../snapshot.js';

const roots: string[] = [];

function snapshot(): { directory: string; root: string } {
  const root = mkdtempSync(join(tmpdir(), 'codex-snapshot-'));
  const directory = join(root, 'snapshots', 'test');

  roots.push(root);
  mkdirSync(join(directory, 'packages'), { recursive: true });
  writeFileSync(join(root, 'current.json'), JSON.stringify({ directory: 'snapshots/test' }));
  writeFileSync(
    join(directory, 'manifest.json'),
    JSON.stringify({
      catalog: 'catalog.json',
      contentDirectory: 'packages',
      refine: 'refine.json',
      schemaVersion: 1,
      search: 'search.json',
      version: '1.0.0',
    }),
  );
  writeFileSync(
    join(directory, 'catalog.json'),
    JSON.stringify({
      packages: [
        {
          availableDocPages: ['index'],
          category: 'test',
          description: 'Test package',
          exampleIds: ['basic'],
          exports: ['test'],
          hasSource: true,
          keywords: ['test'],
          name: '@vielzeug/test',
          related: [],
          slug: 'test',
          version: '1.0.0',
        },
      ],
      version: '1.0.0',
    }),
  );
  writeFileSync(
    join(directory, 'search.json'),
    JSON.stringify([
      {
        category: 'test',
        description: 'test package',
        docs: { index: 'test package' },
        examples: [{ id: 'basic', text: 'basic test' }],
        exports: 'test',
        keywords: 'test',
        name: '@vielzeug/test',
        related: '',
        slug: 'test',
        source: 'export const test = 1',
      },
    ]),
  );
  writeFileSync(join(directory, 'refine.json'), '[]');
  writeFileSync(
    join(directory, 'packages', 'test.json'),
    JSON.stringify({
      apiSource: 'export const test = 1',
      docs: { index: '# Test' },
      examples: [{ code: 'test()', id: 'basic', name: 'Basic' }],
      typeSignatures: { test: 'export const test = 1' },
    }),
  );

  return { directory, root };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('snapshot catalog', () => {
  it('loads metadata eagerly and content on demand', () => {
    const { root } = snapshot();
    const catalog = new SnapshotCatalog(loadSnapshot(root));

    expect(catalog.listPackages()).toHaveLength(1);
    expect(catalog.getDocs('test', 'index')).toBe('# Test');
    expect(catalog.getTypeSignature('test', 'test')).toContain('export const test');
    expect(catalog.search('package')).toEqual([
      { matchedIn: ['docs', 'metadata'], matchedPages: ['index'], name: '@vielzeug/test', slug: 'test' },
    ]);
  });

  it('rejects path traversal and duplicate search records before catalog creation', () => {
    const { directory, root } = snapshot();

    writeFileSync(
      join(directory, 'catalog.json'),
      JSON.stringify({
        packages: [
          {
            availableDocPages: [],
            category: 'test',
            description: 'Test',
            exampleIds: [],
            exports: [],
            hasSource: false,
            keywords: [],
            name: '@vielzeug/bad',
            related: [],
            slug: '../bad',
            version: '1.0.0',
          },
        ],
        version: '1.0.0',
      }),
    );
    expect(() => loadSnapshot(root)).toThrow('must be a lowercase package slug');
  });

  it('rejects malformed chunks and catalog/content inconsistencies during full validation', () => {
    const { directory, root } = snapshot();

    writeFileSync(
      join(directory, 'packages', 'test.json'),
      JSON.stringify({ apiSource: null, docs: {}, examples: [{ id: 'bad', name: 'Bad' }], typeSignatures: {} }),
    );
    expect(() => validateSnapshot(root)).toThrow('packages/test.json.examples[0].code: must be a string');
  });

  it('rejects duplicate search records and ranks exact package matches first', () => {
    const { directory, root } = snapshot();
    const duplicate = {
      category: 'test',
      description: 'test package',
      docs: {},
      examples: [],
      exports: '',
      keywords: '',
      name: '@vielzeug/test',
      related: '',
      slug: 'test',
      source: null,
    };

    writeFileSync(join(directory, 'search.json'), JSON.stringify([duplicate, duplicate]));
    expect(() => loadSnapshot(root)).toThrow('search.json[1].slug: duplicates test');

    const ranked: LoadedSnapshot = {
      catalog: { packages: [], version: '1.0.0' },
      contentDirectory: directory,
      manifest: {
        catalog: 'catalog.json',
        contentDirectory: 'packages',
        refine: null,
        schemaVersion: 1,
        search: 'search.json',
        version: '1.0.0',
      },
      refineComponents: [],
      search: [
        {
          category: '',
          description: '',
          docs: { index: 'foo bar support' },
          examples: [],
          exports: '',
          keywords: '',
          name: '@vielzeug/arsenal',
          related: '',
          slug: 'arsenal',
          source: null,
        },
        {
          category: '',
          description: '',
          docs: {},
          examples: [],
          exports: '',
          keywords: '',
          name: '@vielzeug/foo-bar',
          related: '',
          slug: 'foo-bar',
          source: null,
        },
      ],
    };

    expect(new SnapshotCatalog(ranked).search('foo-bar').map((hit) => hit.slug)).toEqual(['foo-bar', 'arsenal']);
  });
});
