#!/usr/bin/env node
/**
 * Validate every pending change file under `changes/`, the way `rush change --verify` used to
 * validate Rush's before the migration to Bun.
 *
 * Usage:
 *   bun run check:change-files
 *
 * A change file is `changes/@vielzeug/<name>/<file>.json` (two nested levels: the scoped name
 * itself contains a "/") and is what `scripts/release/apply-train.mjs` consumes when it stamps
 * a release train. A malformed one is discovered at release time, after the PR merged: this
 * check moves that failure to CI's pull-request gate. It verifies, per file:
 *   - it parses as JSON and carries the shape `writeChangeFile()` (scripts/change.mjs) writes;
 *   - `type` is one of major | minor | patch;
 *   - `packageName` matches the directory it lives in (a file in ore/ that names orbit would
 *     make the train consume it for the wrong package);
 *   - every change entry carries a non-empty comment.
 *
 * Exit code 1 with every offender listed, 0 when `changes/` is empty or all files are good.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMain } from './lib/cli.mjs';
import { listChangeFiles } from './lib/change-files.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const VALID_TYPES = new Set(['major', 'minor', 'patch']);

/** Every problem found in one change file, as human-readable messages (empty = valid). */
export function validateChangeFile(relFile, contents) {
  const problems = [];
  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch (err) {
    return [`${relFile}: not valid JSON (${err.message})`];
  }

  const { changes, packageName } = parsed ?? {};

  // relFile is "@vielzeug/<name>/<file>.json" (lib/change-files.mjs's listChangeFiles() walks
  // the same two-level shape), so the directory name is the full scoped package name.
  const expected = path.dirname(relFile).split(path.sep).join('/');
  if (packageName !== expected) {
    problems.push(`${relFile}: packageName "${packageName}" does not match its directory ("${expected}")`);
  }

  if (!Array.isArray(changes) || changes.length === 0) {
    problems.push(`${relFile}: "changes" must be a non-empty array`);
    return problems;
  }

  for (const [index, entry] of changes.entries()) {
    if (!VALID_TYPES.has(entry?.type)) {
      problems.push(`${relFile}: changes[${index}] has invalid type "${entry?.type}" (expected major, minor, or patch)`);
    }
    if (typeof entry?.comment !== 'string' || entry.comment.trim() === '') {
      problems.push(`${relFile}: changes[${index}] needs a non-empty "comment"`);
    }
  }
  return problems;
}

/** `{ files, problems }` for a whole changes tree. `files` counts the files inspected. */
export function validateChangeFiles({ root = ROOT, changesDir = path.join(root, 'changes') } = {}) {
  const files = listChangeFiles(changesDir);
  const problems = [];
  for (const relFile of files) {
    problems.push(...validateChangeFile(relFile, readFileSync(path.join(changesDir, relFile), 'utf8')));
  }
  return { files, problems };
}

if (isMain(import.meta.url)) {
  const changesDir = path.join(ROOT, 'changes');
  const { files, problems } = validateChangeFiles({ changesDir });

  if (problems.length > 0) {
    console.error(`${problems.length} problem(s) in ${files.length} change file(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
  } else {
    console.log(`Validated ${files.length} change file(s).`);
  }
}
