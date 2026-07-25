#!/usr/bin/env node
/**
 * Auto-write a Rush change file for @vielzeug/codex whenever docs/ changes.
 *
 * codex has no @vielzeug/* dependency edges, so it never gets swept up in another package's
 * release. But `prepare:data` bundles all of docs/ into codex's published `data/` dir at build
 * time — so a docs-only change still changes what codex ships to npm, and needs its own release.
 * Humans forget this every time (see the codex AGENTS.md note); a git hook doesn't.
 *
 * Wired as a lefthook pre-commit step (glob: 'docs/**') — see lefthook.yml.
 *
 * Skips if a change file for codex is already pending (one is enough between releases; rush
 * deletes consumed change files on release, so the dir is empty again afterwards).
 */

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { isMain } from './lib/cli.mjs';
import { ROOT, writeChangeFile } from './rush-change.mjs';

/** Writes a patch change file for codex unless one is already pending. Returns its path, or null if skipped. */
export function ensureCodexChangeFile({
  message = 'chore(codex): refresh bundled docs data',
  now = Date.now,
  root = ROOT,
} = {}) {
  const dir = path.join(root, 'common', 'changes', '@vielzeug', 'codex');
  const hasPending = existsSync(dir) && readdirSync(dir).some((file) => file.endsWith('.json'));
  if (hasPending) return null;

  return writeChangeFile('codex', 'patch', message, { now, root });
}

if (isMain(import.meta.url)) {
  try {
    const filepath = ensureCodexChangeFile();
    console.log(filepath ? `Written: ${path.relative(ROOT, filepath)}` : 'Skipped: codex change already pending');
  } catch (err) {
    console.error(err); // consistent with every other script's isMain catch — see scripts/AGENTS.md
    process.exitCode = 1;
  }
}
