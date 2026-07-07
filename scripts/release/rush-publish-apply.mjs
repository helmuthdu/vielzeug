/**
 * Apply pending Rush version-bump change files.
 *
 * `rush publish --apply` has no per-package filter — it always consumes every pending change
 * file under common/changes. For a single-package release we isolate the target package's
 * change file(s) by moving every other package's file out of the working tree first, then
 * restore them afterwards (rush's internal `git add` would otherwise stage their absence as a
 * deletion, so restoring on disk isn't enough — we also re-commit them if git still sees them
 * as changed).
 *
 * `listChangeFiles`/`listChangedPackageNames` are also the one place that reads which packages
 * have pending changes — release.yml and release-all.yml both used to additionally shell out to
 * `find | jq` to answer that same question by reading each file's internal `packageName` field,
 * a second source of truth that could in principle disagree with the directory it lives in.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { run as defaultRun } from '../lib/cli.mjs';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..', '..');

/**
 * Relative paths (e.g. "@vielzeug/ore/agent_123.json") of every pending change file. Rush
 * groups these under a directory per full scoped package name, which — because the name
 * itself contains a "/" — is really two nested directory levels (@vielzeug/ore), so this
 * walks recursively rather than assuming a fixed depth.
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

/** Sorted, de-duplicated package names that have at least one pending change file. */
export function listChangedPackageNames(root = repoRoot) {
  const changesDir = path.join(root, 'common', 'changes');
  const names = listChangeFiles(changesDir).map((relFile) => path.dirname(relFile));
  return [...new Set(names)].sort();
}

export function applyVersionBump(packageName, { root = repoRoot, run = defaultRun } = {}) {
  const changesDir = path.join(root, 'common', 'changes');
  const stagingDir = path.join(root, '.rush-publish-staging');
  const otherFiles = packageName ? listChangeFiles(changesDir).filter((f) => path.dirname(f) !== packageName) : [];

  for (const relFile of otherFiles) {
    const dest = path.join(stagingDir, relFile);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(path.join(changesDir, relFile), dest);
    rmSync(path.join(changesDir, relFile));
  }

  try {
    run(
      'node',
      ['common/scripts/install-run-rush.js', 'publish', '--apply', '--target-branch', 'main', '--add-commit-details'],
      {
        cwd: root,
        inherit: true,
      },
    );
  } finally {
    if (otherFiles.length > 0) {
      for (const relFile of otherFiles) {
        const dest = path.join(changesDir, relFile);
        mkdirSync(path.dirname(dest), { recursive: true });
        cpSync(path.join(stagingDir, relFile), dest);
      }
      rmSync(stagingDir, { recursive: true, force: true });

      // rush's internal commit staged the set-aside files as deleted (they were absent from
      // the working tree when it ran); restoring them on disk isn't enough if that commit
      // already landed, so re-commit them when git still sees them as changed.
      const status = run('git', ['status', '--porcelain', '--', 'common/changes'], { cwd: root });
      if (status.trim().length > 0) {
        run('git', ['add', 'common/changes'], { cwd: root, inherit: true });
        run('git', ['commit', '-m', 'chore: restore pending change files for other packages'], {
          cwd: root,
          inherit: true,
        });
      }
    }
  }
}
