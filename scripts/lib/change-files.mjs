/**
 * The one walker over pending change files under `changes/`, shared by the two scripts that
 * must agree on what counts as a change file: `release/apply-train.mjs` (consumes them when
 * stamping a release train) and `validate-change-files.mjs` (the CI pull-request gate). Before
 * this module existed both carried their own copy of this walk; a drift in "which files count"
 * would let CI pass a tree the train then misreads.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Relative paths (e.g. "@vielzeug/ore/agent_123.json") of every pending change file.
 * Change files live under a directory per full scoped package name, which: because the
 * name itself contains a "/": is really two nested directory levels (@vielzeug/ore), so
 * this walks recursively rather than assuming a fixed depth. A missing directory means no
 * pending change files, not an error: most PRs touch no package's public surface.
 */
export function listChangeFiles(changesDir) {
  if (!existsSync(changesDir)) return [];

  const files = [];
  const walk = (dir, relDir) => {
    for (const entry of readdirSync(dir)) {
      const absPath = path.join(dir, entry);
      const relPath = relDir ? path.join(relDir, entry) : entry;
      if (statSync(absPath).isDirectory()) walk(absPath, relPath);
      else if (entry.endsWith('.json')) files.push(relPath);
    }
  };
  walk(changesDir, '');
  return files;
}
