#!/usr/bin/env node
/**
 * Write a Rush change file for a single package without touching any other package.
 *
 * Usage:
 *   node scripts/rush-change.mjs <pkg-name> <patch|minor|major> "<message>"
 *
 * Example:
 *   node scripts/rush-change.mjs orbit patch "fix: stop redundant DOM reads in hot path"
 *
 * Why not `rush change --bulk`?
 * --bulk writes a change file for every package that has uncommitted changes in the working tree.
 * In a multi-agent worktree environment multiple agents may have unrelated staged changes at the
 * same time, so --bulk would clobber or mis-label sibling packages' pending change files.
 * This script is scoped to exactly one package.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMain } from './lib/cli.mjs';

export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');

const VALID_TYPES = new Set(['major', 'minor', 'patch']);

/** Writes `common/changes/@vielzeug/<name>/agent_<timestamp>.json` and returns its path. */
export function writeChangeFile(name, type, message, { now = Date.now, root = ROOT } = {}) {
  if (!VALID_TYPES.has(type)) {
    throw new Error(`Invalid bump type "${type}". Must be one of: major, minor, patch`);
  }

  const packageName = name.startsWith('@vielzeug/') ? name : `@vielzeug/${name}`;
  const dir = path.join(root, 'common', 'changes', packageName);
  mkdirSync(dir, { recursive: true });

  const filename = `agent_${now()}.json`;
  const filepath = path.join(dir, filename);
  const content = { changes: [{ comment: message, packageName, type }], email: 'agent@vielzeug', packageName };

  writeFileSync(filepath, JSON.stringify(content, null, 2) + '\n');
  return filepath;
}

function printUsage() {
  console.error('Usage: node scripts/rush-change.mjs <pkg-name> <patch|minor|major> "<message>"');
  console.error('Example: node scripts/rush-change.mjs orbit patch "fix: stop redundant DOM reads"');
}

if (isMain(import.meta.url)) {
  const [name, type, message] = process.argv.slice(2);

  if (!name || !type || !message) {
    printUsage();
    process.exitCode = 1;
  } else {
    try {
      const filepath = writeChangeFile(name, type, message);
      console.log(`Written: ${path.relative(ROOT, filepath)}`);
    } catch (err) {
      console.error(err); // consistent with every other script's isMain catch — see scripts/AGENTS.md
      process.exitCode = 1;
    }
  }
}
