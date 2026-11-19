import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { Catalog, CatalogError } from '../catalog.js';
import { loadSnapshot } from '../snapshot.js';
import { snapshotFixture } from './fixtures.js';

const roots: string[] = [];

function writeSnapshotFile(snapshot = snapshotFixture()): string {
  const root = mkdtempSync(join(tmpdir(), 'codex-snapshot-'));

  roots.push(root);
  writeFileSync(join(root, 'snapshot.json'), JSON.stringify(snapshot));

  return join(root, 'snapshot.json');
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('snapshot loader', () => {
  it('loads a snapshot eagerly and accepts a directory containing snapshot.json', () => {
    const file = writeSnapshotFile();

    expect(loadSnapshot(file).version).toBe(loadSnapshot(file.slice(0, file.lastIndexOf('/'))).version);
    expect(loadSnapshot(file).packages.map((pkg) => pkg.meta.slug)).toEqual(['demo']);
  });

  it('refuses a snapshot generated for a different codex version', () => {
    const file = writeSnapshotFile(snapshotFixture({ version: '0.0.0-not-this-build' }));

    expect(() => loadSnapshot(file)).toThrow(/generated for codex 0\.0\.0-not-this-build/);
  });

  it('reports a missing snapshot file clearly', () => {
    expect(() => loadSnapshot(join(tmpdir(), 'definitely-missing-snapshot.json'))).toThrow('Failed to read snapshot');
  });
});

describe('catalog', () => {
  const catalog = () => new Catalog(snapshotFixture());

  it('looks up packages, pages, examples, and exports', () => {
    expect(catalog().getMeta('demo').name).toBe('@vielzeug/demo');
    expect(catalog().getDocs('demo', 'api').markdown).toContain('## Signals');
    expect(catalog().getExample('demo', 'basic').code).toBe('const s = signal(1)');
    expect(catalog().getExport('demo', 'signal').signature).toContain('export function signal');
  });

  it('slices one section by heading text or slug', () => {
    expect(catalog().getDocs('demo', 'api', 'Signals').markdown).toContain('signal()');
    expect(catalog().getDocs('demo', 'api', 'writing-signals').markdown).toContain('set()');
    expect(() => catalog().getDocs('demo', 'api', 'Nope')).toThrow(CatalogError);
  });

  it('names the missing target in every lookup error', () => {
    expect(() => catalog().getMeta('nope')).toThrow('Package "nope" not found');
    expect(() => catalog().getDocs('demo', 'nope')).toThrow('No "nope" page for "demo"');
    expect(() => catalog().getExport('demo', 'nope')).toThrow('No exported symbol "nope"');
    expect(() => catalog().getComponent('ore-missing')).toThrow('Component "ore-missing" not found');
  });

  it('requires every term inside one section and ranks heading matches first', () => {
    const hits = catalog().search('signal');

    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].slug).toBe('demo');
    expect(hits[0].page).toBe('api');
    // "Signals" is a heading match (weight 3); the Animation section only mentions spring().
    expect(hits[0].heading).toBe('Signals');
    expect(hits[0].snippet).toContain('signal()');
  });

  it('drops sections that miss any term', () => {
    expect(catalog().search('signal animation')).toEqual([]);
    expect(catalog().search('spring animate')).toHaveLength(1);
    expect(catalog().search('spring animate')[0].heading).toBe('Animation');
  });

  it('rejects an empty query', () => {
    expect(() => catalog().search('   ')).toThrow('query: required non-empty string.');
  });

  it('serves components and tokens without copying', () => {
    const instance = catalog();

    expect(instance.getComponent('ore-button').summary).toBe('A button.');
    expect(instance.tokens).toHaveLength(2);
    expect(instance.getComponent('ore-button')).toBe(instance.getComponent('ore-button'));
  });
});
