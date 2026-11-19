import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CodexError } from './errors.js';
import type { Snapshot } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** The snapshot shipped inside the installed package. */
export const bundledSnapshotPath = (): string => resolve(__dirname, '../data/snapshot.json');

/** Accepts a snapshot file, or a directory containing `snapshot.json` (the dev layout). */
function resolveSnapshotFile(path: string): string {
  return existsSync(path) && !existsSync(join(path, 'snapshot.json')) && !path.endsWith('.json')
    ? path
    : existsSync(join(path, 'snapshot.json'))
      ? join(path, 'snapshot.json')
      : path;
}

function packageVersion(): string {
  const manifest = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as { version?: string };

  return manifest.version ?? '0.0.0';
}

/**
 * Eagerly read one snapshot file. The data is generated in the same build that ships it and is
 * validated by the writer before publication, so the only runtime check left is that the file
 * carries the version this package expects: a stale or foreign snapshot is refused rather than
 * served with wrong facts.
 */
export function loadSnapshot(file = bundledSnapshotPath()): Snapshot {
  const target = resolveSnapshotFile(file);
  let raw: string;

  try {
    raw = readFileSync(target, 'utf8');
  } catch (error) {
    throw new CodexError(
      `Failed to read snapshot ${target}: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error,
      },
    );
  }

  let snapshot: Snapshot;

  try {
    snapshot = JSON.parse(raw) as Snapshot;
  } catch (error) {
    throw new CodexError(
      `Snapshot ${target} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error,
      },
    );
  }

  if (typeof snapshot.version !== 'string' || snapshot.version.length === 0)
    throw new CodexError(`Snapshot ${target} is missing its version.`);

  const expected = packageVersion();

  if (snapshot.version !== expected)
    throw new CodexError(`Snapshot ${target} was generated for codex ${snapshot.version}, but ${expected} is running.`);

  return snapshot;
}
