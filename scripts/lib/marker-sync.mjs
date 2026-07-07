/**
 * Generic "idempotently write or patch a generated file, with a --check mode for CI" primitive.
 * No knowledge of workflows, manifests, or the dependency graph lives here — this used to be
 * defined inside sync-workflow-docs.mjs and reverse-imported by sync-catalogue.mjs, a hidden
 * coupling between two unrelated codegen scripts that happened to need the same file-writing
 * behavior. Any future generator (a third one is only a matter of time) should import from
 * here, not from whichever existing script got there first.
 */

import { execFileSync } from 'node:child_process';
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

/** True if `relPath` would be tracked by git (i.e. not matched by .gitignore).
 * Asks git directly rather than guessing from a path prefix — `.claude/` and
 * `.devin/` are gitignored local tool config; everything under `.ai/` (except
 * `.ai/workflows/runs/`) is real, committed source.
 *
 * Explicitly clears GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE: the main caller of this is a
 * lefthook pre-commit hook, and git hook environments can set these to point at a
 * partial-commit worktree. Left inherited, `git check-ignore` resolves against the wrong repo
 * state and fails outright instead of answering the question we're actually asking. Uses raw
 * `execFileSync` (not `scripts/lib/cli.mjs`'s `run`) because it needs a custom `env` override
 * and to distinguish exit code 1 from a real spawn failure — a different shape than "run a
 * command and return its stdout". */
export function isTracked(relPath, root = ROOT) {
  try {
    execFileSync('git', ['check-ignore', '-q', relPath], {
      cwd: root,
      env: { ...process.env, GIT_DIR: undefined, GIT_INDEX_FILE: undefined, GIT_WORK_TREE: undefined },
      stdio: 'ignore',
    });
    return false; // exit 0 => path IS ignored
  } catch (err) {
    if (err.status === 1) return true; // exit 1 => NOT ignored, i.e. tracked
    throw err; // exit 128 (not a repo) or spawn failure — a real problem, don't mask it
  }
}

/** Blank line on both sides of `replacement` (not just a newline) — GFM requires
 * a blank line around a table (rumdl MD058) or it doesn't parse as a table at
 * all; harmless for non-markdown consumers (e.g. a generated JS data block). */
export function replaceBetweenMarkers(source, beginMarker, endMarker, replacement) {
  const begin = source.indexOf(beginMarker);
  const end = source.indexOf(endMarker);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error(`markers ${beginMarker} / ${endMarker} not found`);
  }
  return source.slice(0, begin + beginMarker.length) + '\n\n' + replacement + '\n\n' + source.slice(end);
}

/** Write `content` to `relPath` if it differs from what's on disk.
 * In `--check` mode, never writes: reports [STALE] for tracked files (fails
 * the run) or [SKIP] for gitignored ones (expected missing/differs, e.g. a
 * fresh checkout — not drift). */
export function syncFile(relPath, content, { check, onStale, root = ROOT } = {}) {
  const abs = path.join(root, relPath);
  const existing = readIfExists(abs);
  if (existing === content) return 'unchanged';

  if (check) {
    if (isTracked(relPath, root)) {
      onStale?.(`[STALE] ${relPath} is out of sync`);
      return 'stale';
    }
    console.log(`[SKIP] ${relPath} not present locally — gitignored, regenerate if you use this tool`);
    return 'skipped';
  }

  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  console.log(`[WRITE] ${relPath}`);
  return 'written';
}

/** Patch a marker-delimited block inside an existing file. Two failure modes,
 * both handled explicitly instead of crashing with a raw stack trace:
 *   - file doesn't exist yet (expected for gitignored targets before the first
 *     generation run — always logged, in both check and write mode)
 *   - markers are missing/corrupted in an existing file (a real problem — fails
 *     loud with a clear message, not a stack trace, and doesn't abort the rest
 *     of the sync run in --check mode) */
export function syncPatchedFile(relPath, beginMarker, endMarker, replacement, { check, onStale, root = ROOT } = {}) {
  const abs = path.join(root, relPath);
  const source = readIfExists(abs);

  if (source === null) {
    const message = `[SKIP] ${relPath} not present locally — nothing to patch (no bootstrap path for this file yet)`;
    if (check && isTracked(relPath, root)) {
      onStale?.(`[STALE] ${relPath} is missing`);
    } else {
      console.log(message);
    }
    return 'skipped';
  }

  let patched;
  try {
    patched = replaceBetweenMarkers(source, beginMarker, endMarker, replacement);
  } catch (err) {
    if (check) {
      onStale?.(`[STALE] ${relPath}: ${err.message}`);
      return 'stale';
    }
    throw new Error(`${relPath}: ${err.message} — fix or restore the markers, then re-run`, { cause: err });
  }

  return syncFile(relPath, patched, { check, onStale, root });
}
