// Explicit .ts import extensions are the repo convention for these scripts (run directly under bun, never compiled by tsc).
/**
 * Publishes the generated snapshot as one `snapshot.json` through a staging swap: the file
 * becomes the whole snapshot at once, never a partially rewritten one. This is the snapshot's
 * validation gate — the runtime loader trusts the file because nothing else can write it, so
 * every structural invariant the tools rely on is checked here, before anything is published.
 */
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import type { Snapshot } from '../src/types.ts';
import { SNAPSHOT_FILE } from './generator.ts';

function validateSnapshot(snapshot: Snapshot): void {
  const problems: string[] = [];

  if (typeof snapshot.version !== 'string' || snapshot.version.length === 0) problems.push('version must be a non-empty string.');

  const slugs = new Set<string>();

  for (const pkg of snapshot.packages) {
    const where = pkg.meta?.slug ?? '(missing slug)';

    if (slugs.has(where)) problems.push(`Duplicate package ${where}.`);
    slugs.add(where);

    for (const [page, markdown] of Object.entries(pkg.pages)) {
      if (typeof markdown !== 'string') problems.push(`${where}/${page}: page content must be a string.`);
    }
    for (const section of pkg.sections) {
      const page = pkg.pages[section.page];

      if (page === undefined) problems.push(`${where}: section "${section.heading}" references missing page "${section.page}".`);
      else if (!(section.start >= 0 && section.end <= page.length && section.start <= section.end))
        problems.push(`${where}/${section.page}: section "${section.heading}" offsets ${section.start}..${section.end} exceed the page (${page.length} chars).`);
    }
    for (const example of pkg.examples) {
      if (!example.id || !example.code) problems.push(`${where}: example entries need an id and code.`);
    }
    for (const entry of pkg.exports) {
      if (!entry.name || !entry.signature) problems.push(`${where}: export entries need a name and signature.`);
    }
  }

  const tags = new Set<string>();

  for (const component of snapshot.components) {
    if (!component.tag) problems.push('Component declarations must carry a tag.');
    else if (tags.has(component.tag)) problems.push(`Duplicate component tag ${component.tag}.`);
    else tags.add(component.tag);
  }

  if (problems.length > 0) throw new Error(`Snapshot validation failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
}

/** Write `snapshot` into `snapshotRoot` atomically via a staging file swap. */
export function writeSnapshot(snapshotRoot: string, snapshot: Snapshot): void {
  validateSnapshot(snapshot);

  mkdirSync(snapshotRoot, { recursive: true });
  const target = resolve(snapshotRoot, SNAPSHOT_FILE);
  const staging = `${target}.staging-${process.pid}-${randomUUID()}`;

  // The snapshot is the only artifact the runtime reads; drop anything the
  // previous data format left behind.
  for (const entry of readdirSync(snapshotRoot)) {
    if (entry !== SNAPSHOT_FILE && entry !== 'README.md') rmSync(resolve(snapshotRoot, entry), { force: true, recursive: true });
  }

  try {
    writeFileSync(staging, `${JSON.stringify(snapshot)}\n`, 'utf8');
    renameSync(staging, target);
  } catch (error) {
    rmSync(staging, { force: true });
    throw error;
  }
}

export { validateSnapshot };
