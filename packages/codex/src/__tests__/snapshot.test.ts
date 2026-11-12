import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SnapshotCatalog } from '../catalog.js';
import { loadSnapshot, validateSnapshot } from '../snapshot.js';

const roots: string[] = [];

interface FixturePackage {
  content?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  slug: string;
}

/** Builds one flat snapshot directory (v2 layout) and returns its path. */
function snapshotRoot(packages: FixturePackage[], refineComponents?: unknown[]): string {
  const root = mkdtempSync(join(tmpdir(), 'codex-snapshot-'));

  roots.push(root);
  mkdirSync(join(root, 'packages'), { recursive: true });
  writeFileSync(join(root, 'manifest.json'), JSON.stringify({ schemaVersion: 2, version: '1.0.0' }));
  writeFileSync(
    join(root, 'catalog.json'),
    JSON.stringify({
      packages: packages.map(({ meta, slug }) => ({
        availableDocPages: ['index'],
        category: 'test',
        description: 'Test package',
        exampleIds: ['basic'],
        exports: ['test'],
        hasSource: true,
        keywords: ['test'],
        name: `@vielzeug/${slug}`,
        related: [],
        slug,
        version: '1.0.0',
        ...meta,
      })),
      version: '1.0.0',
    }),
  );
  for (const { content, slug } of packages)
    writeFileSync(
      join(root, 'packages', `${slug}.json`),
      JSON.stringify(
        content ?? {
          apiSource: 'export const test = 1',
          docs: { index: '# Test' },
          examples: [{ code: 'test()', id: 'basic', name: 'Basic' }],
          typeSignatures: { test: 'export const test = 1' },
        },
      ),
    );
  if (refineComponents) writeFileSync(join(root, 'refine.json'), JSON.stringify(refineComponents));

  return root;
}

function defaultPackage(slug = 'test'): FixturePackage {
  return { slug };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('snapshot catalog', () => {
  it('loads metadata eagerly and content on demand', () => {
    const catalog = new SnapshotCatalog(loadSnapshot(snapshotRoot([defaultPackage()])));

    expect(catalog.listPackages()).toHaveLength(1);
    expect(catalog.getDocs('test', 'index')).toBe('# Test');
    expect(catalog.getTypeSignature('test', 'test')).toContain('export const test');
  });

  it('has no component tools available without refine metadata', () => {
    const catalog = new SnapshotCatalog(loadSnapshot(snapshotRoot([defaultPackage()])));

    expect(catalog.listComponents()).toEqual([]);
    expect(() => catalog.getComponent('ore-button')).toThrow('Component "ore-button" not found.');
  });

  it('serves component metadata bundled in the snapshot', () => {
    const directory = snapshotRoot([defaultPackage()], [{ attributes: [{ name: 'variant' }], tagName: 'ore-button' }]);
    const catalog = new SnapshotCatalog(loadSnapshot(directory));

    expect(catalog.listComponents()).toHaveLength(1);
    expect(catalog.getComponent('ore-button').attributes?.[0]?.name).toBe('variant');
  });

  it('searches the lazily read content chunks', () => {
    const catalog = new SnapshotCatalog(loadSnapshot(snapshotRoot([defaultPackage()])));

    expect(catalog.search('package')).toEqual([{ matchedIn: ['metadata'], name: '@vielzeug/test', slug: 'test' }]);
    expect(catalog.search('# Test')).toEqual([
      { matchedIn: ['docs'], matchedPages: ['index'], name: '@vielzeug/test', slug: 'test' },
    ]);
    expect(catalog.search('test()')).toEqual([
      { matchedExamples: ['basic'], matchedIn: ['examples'], name: '@vielzeug/test', slug: 'test' },
    ]);
    expect(catalog.search('export const')).toEqual([{ matchedIn: ['source'], name: '@vielzeug/test', slug: 'test' }]);
    expect(catalog.search('nothing matches this')).toEqual([]);
    expect(() => catalog.search('   ')).toThrow('query: required non-empty string.');
  });

  it('ranks exact package matches above content matches', () => {
    const catalog = new SnapshotCatalog(
      loadSnapshot(
        snapshotRoot([
          {
            content: {
              apiSource: 'export const arsenal = 1',
              docs: { index: 'arsenal mentions foo bar support' },
              examples: [{ code: 'arsenal()', id: 'basic', name: 'Basic' }],
              typeSignatures: { test: 'export const arsenal = 1' },
            },
            slug: 'arsenal',
          },
          {
            content: {
              apiSource: null,
              docs: { index: 'foo bar support' },
              examples: [],
              typeSignatures: {},
            },
            meta: { description: 'Foo bar', exampleIds: [], exports: [], hasSource: false, slug: 'foo-bar' },
            slug: 'foo-bar',
          },
        ]),
      ),
    );

    expect(catalog.search('foo-bar').map((hit) => hit.slug)).toEqual(['foo-bar', 'arsenal']);
  });

  it('returns empty but present content without treating it as missing', () => {
    const directory = snapshotRoot([
      {
        content: {
          apiSource: '',
          docs: { index: '' },
          examples: [{ code: '', id: 'basic', name: '' }],
          typeSignatures: { test: '' },
        },
        slug: 'test',
      },
    ]);
    const catalog = new SnapshotCatalog(loadSnapshot(directory));

    expect(catalog.getDocs('test', 'index')).toBe('');
    expect(catalog.getSource('test')).toBe('');
    expect(catalog.getTypeSignature('test', 'test')).toBe('');
    expect(catalog.getExample('test', 'basic').code).toBe('');
  });

  it('does not expose mutable catalog metadata or component declarations', () => {
    const directory = snapshotRoot([defaultPackage()], [{ attributes: [{ name: 'variant' }], tagName: 'ore-button' }]);
    const catalog = new SnapshotCatalog(loadSnapshot(directory));
    const packageMeta = catalog.getPackage('test');

    Object.assign(packageMeta, { keywords: ['changed'] });
    Object.assign(packageMeta.keywords, { 0: 'changed' });

    const component = catalog.getComponent('ore-button');

    Object.assign(component.attributes?.[0] ?? {}, { name: 'changed' });

    expect(catalog.getPackage('test').keywords).toEqual(['test']);
    expect(catalog.getComponent('ore-button').attributes?.[0]?.name).toBe('variant');
  });

  it('rejects path traversal and duplicate slugs before catalog creation', () => {
    expect(() => loadSnapshot(snapshotRoot([{ meta: { slug: '../bad' }, slug: 'bad' }]))).toThrow(
      'must be a lowercase package slug',
    );
  });

  it('rejects malformed chunks and catalog/content inconsistencies during full validation', () => {
    const directory = snapshotRoot([
      {
        content: { apiSource: null, docs: {}, examples: [{ id: 'bad', name: 'Bad' }], typeSignatures: {} },
        slug: 'test',
      },
    ]);

    expect(() => validateSnapshot(directory)).toThrow('packages/test.json.examples[0].code: must be a string');
  });

  it('rejects snapshots from another schema version', () => {
    const directory = snapshotRoot([defaultPackage()]);

    writeFileSync(join(directory, 'manifest.json'), JSON.stringify({ schemaVersion: 1, version: '1.0.0' }));
    expect(() => loadSnapshot(directory)).toThrow('schemaVersion: must equal 2');
  });

  it('validates the component tag contract in refine metadata', () => {
    const directory = snapshotRoot([defaultPackage()], [{ attributes: 'invalid', tagName: 'ore-button' }]);

    expect(() => loadSnapshot(directory)).not.toThrow();

    const badTag = snapshotRoot([defaultPackage()], [{ tagName: '[' }]);

    expect(() => loadSnapshot(badTag)).toThrow('tagName: must be a custom element name');

    const duplicate = snapshotRoot([defaultPackage()], [{ tagName: 'ore-button' }, { tagName: 'ore-button' }]);

    expect(() => loadSnapshot(duplicate)).toThrow('tagName: duplicates ore-button');
  });
});
