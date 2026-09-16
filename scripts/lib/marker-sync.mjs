/**
 * Generic "idempotently write a generated file, with a --check mode for CI" primitive.
 * No knowledge of workflows, manifests, or the dependency graph lives here. Generators use
 * this shared write/check behavior instead of implementing their own drift detection.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

export function readIfExists(abs) {
  try {
    return readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

/** Replace the text between two marker lines, keeping the markers themselves. Throws when a
 * marker is missing so a corrupted target fails loud instead of silently going stale. */
export function replaceBetweenMarkers(source, beginMarker, endMarker, replacement) {
  const begin = source.indexOf(beginMarker);
  const end = source.indexOf(endMarker);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error(`markers ${beginMarker} / ${endMarker} not found`);
  }
  return source.slice(0, begin + beginMarker.length) + '\n\n' + replacement + '\n\n' + source.slice(end);
}

/** Write `content` to `relPath` if it differs from what's on disk. In `--check` mode, never
 * writes; reports drift through `onStale` instead. */
export function syncFile(relPath, content, { check, onStale, root = ROOT } = {}) {
  const abs = path.join(root, relPath);
  if (readIfExists(abs) === content) return 'unchanged';

  if (check) {
    onStale?.(`[STALE] ${relPath} is out of sync`);
    return 'stale';
  }

  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  console.log(`[WRITE] ${relPath}`);
  return 'written';
}
