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

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..');

const [, , name, type, message] = process.argv;

const VALID_TYPES = new Set(['major', 'minor', 'patch']);

if (!name || !type || !message) {
  console.error('Usage: node scripts/rush-change.mjs <pkg-name> <patch|minor|major> "<message>"');
  console.error('Example: node scripts/rush-change.mjs orbit patch "fix: stop redundant DOM reads"');
  process.exit(1);
}

if (!VALID_TYPES.has(type)) {
  console.error(`Invalid bump type "${type}". Must be one of: major, minor, patch`);
  process.exit(1);
}

const packageName = name.startsWith('@vielzeug/') ? name : `@vielzeug/${name}`;
const dir = join(repoRoot, 'common', 'changes', packageName);

if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const filename = `agent_${Date.now()}.json`;
const filepath = join(dir, filename);

const content = {
  changes: [{ comment: message, packageName, type }],
  email: 'agent@vielzeug',
  packageName,
};

writeFileSync(filepath, JSON.stringify(content, null, 2) + '\n');
console.log(`Written: common/changes/${packageName}/${filename}`);
