import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';

import type { SnapshotArtifacts, SnapshotPointer } from '../src/types.ts';
import { generateLlmsTxt } from './llms.ts';

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function validateArtifacts(snapshot: SnapshotArtifacts): void {
  const slugs = new Set(snapshot.catalog.packages.map((pkg) => pkg.slug));
  const searchSlugs = new Set(snapshot.search.map((record) => record.slug));
  if (slugs.size !== snapshot.catalog.packages.length || snapshot.contents.size !== slugs.size || searchSlugs.size !== slugs.size) {
    throw new Error('Snapshot artifacts must contain exactly one catalog, content chunk, and search record per package.');
  }
  for (const meta of snapshot.catalog.packages) {
    const content = snapshot.contents.get(meta.slug);
    if (!content || !searchSlugs.has(meta.slug)) throw new Error(`Snapshot artifacts are missing ${meta.slug}.`);
    if ((content.apiSource !== null) !== meta.hasSource) throw new Error(`Snapshot source metadata disagrees for ${meta.slug}.`);
    if (Object.keys(content.docs).sort().join() !== [...meta.availableDocPages].sort().join()) throw new Error(`Snapshot documentation metadata disagrees for ${meta.slug}.`);
    if (content.examples.map((example) => example.id).sort().join() !== [...meta.exampleIds].sort().join()) throw new Error(`Snapshot example metadata disagrees for ${meta.slug}.`);
  }
}

function writeDirectory(directory: string, snapshot: SnapshotArtifacts): void {
  writeJson(resolve(directory, 'catalog.json'), snapshot.catalog);
  writeJson(resolve(directory, 'search.json'), snapshot.search);
  writeJson(resolve(directory, 'refine.json'), snapshot.refineComponents);
  for (const [slug, content] of snapshot.contents) writeJson(resolve(directory, 'packages', `${slug}.json`), content);
  const llms = generateLlmsTxt(snapshot.catalog, snapshot.contents);
  writeFileSync(resolve(directory, 'llms.txt'), llms.llmsTxt, 'utf8');
  writeFileSync(resolve(directory, 'llms-full.txt'), llms.llmsFullTxt, 'utf8');
  writeJson(resolve(directory, 'manifest.json'), snapshot.manifest);
}

/** Release artifacts contain one static snapshot, avoiding version-history package bloat. */
export function writeSnapshot(snapshotRoot: string, snapshot: SnapshotArtifacts): void {
  validateArtifacts(snapshot);
  const staging = `${snapshotRoot}.staging-${process.pid}-${randomUUID()}`;
  try {
    writeDirectory(staging, snapshot);
    rmSync(snapshotRoot, { force: true, recursive: true });
    renameSync(staging, snapshotRoot);
  } catch (error) {
    rmSync(staging, { force: true, recursive: true });
    throw error;
  }
}

/** Dev snapshots retain immutable generations for processes still lazily reading old chunks. */
export function writeDevSnapshot(snapshotRoot: string, snapshot: SnapshotArtifacts): void {
  validateArtifacts(snapshot);
  const id = randomUUID();
  const directory = resolve(snapshotRoot, 'snapshots', id);
  writeDirectory(directory, snapshot);
  writeJson(resolve(snapshotRoot, 'current.json'), { directory: `snapshots/${id}` } satisfies SnapshotPointer);
}
