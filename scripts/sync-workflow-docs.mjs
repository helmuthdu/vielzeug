#!/usr/bin/env node
// Regenerates tool-stub files and generated data blocks from the single source
// of truth: .ai/workflows/manifest.json. See manifest.json's "$comment" field.
//
// Usage:
//   node scripts/sync-workflow-docs.mjs          # write generated output
//   node scripts/sync-workflow-docs.mjs --check  # exit 1 if output is stale (CI)
//
// Why a hand-rolled module instead of a bundler/codegen library: the output is
// ~4 small string templates. Pulling in a templating dependency for this would
// be more machinery than the problem needs — see .ai/rules/conventions.md
// (zero-dependency discipline extends to repo tooling, not just packages).
//
// Pure functions below are exported for scripts/__tests__/sync-workflow-docs.test.mjs
// (a vitest project — see scripts/vitest.config.ts — same test runner/assertions
// as every package in this repo, no second test convention). Everything with real
// side effects (reading manifest.json, writing files, spawning git) is guarded by
// the `isMain` check at the bottom, so importing this module for tests never
// touches the filesystem.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');

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
 * Explicitly clears GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE: this script's main
 * caller is a lefthook pre-commit hook, and git hook environments can set
 * these to point at a partial-commit worktree. Left inherited, `git
 * check-ignore` resolves against the wrong repo state and fails outright
 * instead of answering the question we're actually asking. */
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

export function replaceBetweenMarkers(source, beginMarker, endMarker, replacement) {
  const begin = source.indexOf(beginMarker);
  const end = source.indexOf(endMarker);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error(`markers ${beginMarker} / ${endMarker} not found`);
  }
  return source.slice(0, begin + beginMarker.length) + '\n' + replacement + '\n' + source.slice(end);
}

// ---------------------------------------------------------------------------
// String printers — deliberately not JSON.stringify: generated code must read
// like the single-quoted, compact hand-written code around it.
// ---------------------------------------------------------------------------

// Printable ASCII, excluding `'` and `\` (both would need escaping) and any
// control character (including newline — a raw `\n` inside a single-quoted
// JS string literal is a syntax error, not just ugly output). Allowlist, not
// a denylist: an allowlist can't miss a character class the way a denylist can.
const SAFE_STRING = /^[\x20-\x26\x28-\x5B\x5D-\x7E]*$/;

/** Quote a string as a single-quoted JS string literal. Manifest content is
 * repo-authored, not user input, but we still refuse unsafe characters rather
 * than silently emitting broken JS. */
export function quote(value) {
  if (!SAFE_STRING.test(value)) {
    throw new Error(`quote(): ${JSON.stringify(value)} contains a character this printer can't safely emit`);
  }
  return `'${value}'`;
}

export const printStrArray = (arr) => `[${arr.map(quote).join(', ')}]`;

export function printStrArrayMap(obj) {
  const lines = Object.entries(obj).map(([key, arr]) => `  ${quote(key)}: ${printStrArray(arr)},`);
  return `{\n${lines.join('\n')}\n}`;
}

export function printPhases(phases) {
  const lines = phases.map(
    ({ detail, key, title }) => `  { key: ${quote(key)}, title: ${quote(title)}, detail: ${quote(detail)} },`,
  );
  return `[\n${lines.join('\n')}\n]`;
}

// ---------------------------------------------------------------------------
// Manifest validation — catches referential typos (a scope listing a phase key
// that doesn't exist) at generation time instead of at harness-runtime.
// ---------------------------------------------------------------------------

// 'review-a' is a deliberate exception: it selects "Review, Lens A only" — a
// sub-mode of the 'review' phase, not a distinct phase in its own right, so it
// has no entry in `phases`. It's the only phase key allowed to be "virtual".
const VIRTUAL_PHASE_KEYS = new Set(['review-a']);

const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Throws with a specific, actionable message on the first problem found. */
export function assertValidManifest(manifest) {
  for (const { slug } of manifest.workflows) {
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(`manifest.workflows: slug "${slug}" must match ${SLUG_PATTERN} (it's used as a file path)`);
    }
  }

  const { phases, scopes } = manifest.pkgWorkflow;
  const knownPhaseKeys = new Set([...phases.map((p) => p.key), ...VIRTUAL_PHASE_KEYS]);
  for (const [scopeKey, phaseKeys] of Object.entries(scopes)) {
    for (const phaseKey of phaseKeys) {
      if (!knownPhaseKeys.has(phaseKey)) {
        throw new Error(
          `manifest.pkgWorkflow.scopes.${scopeKey} references unknown phase "${phaseKey}" — ` +
            `add it to pkgWorkflow.phases, or to VIRTUAL_PHASE_KEYS in sync-workflow-docs.mjs if it's a lens/pass sub-mode`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Content builders
// ---------------------------------------------------------------------------

export function stubContent(slug, description) {
  if (/[\n:]/.test(description)) {
    throw new Error(`stubContent(): "${slug}" description contains ':' or a newline — breaks YAML frontmatter`);
  }
  return `---
description: ${description}
---

# ${slug}

> **Canonical workflow:** See [\`.ai/workflows/${slug}.md\`](../../.ai/workflows/${slug}.md) for the full workflow definition.

Follow the instructions in \`.ai/workflows/${slug}.md\` exactly.
`;
}

/** Plain markdown table, no manual column padding — GFM renders it identically
 * either way, and unpadded source can't drift out of alignment as labels change. */
export function scopeTable({ scopeDescriptions, scopes }) {
  const header = ['Change type', 'Scope key', 'Phases (converge within each)'];
  const rows = Object.entries(scopes).map(([key, phases]) => [
    scopeDescriptions[key] ?? key,
    `\`${key}\``,
    phases.join(' → '),
  ]);
  const toRow = (cells) => `| ${cells.join(' | ')} |`;
  return [toRow(header), toRow(header.map(() => '---')), ...rows.map(toRow)].join('\n');
}

export function jsDataBlock({ domOutputPackages, phases, scopes }) {
  return [
    `const VALID_MODES = ${printStrArray(['analyse', 'feature', 'new-package'])};`,
    `const VALID_SCOPES = ${printStrArray(Object.keys(scopes))};`,
    '',
    '// DOM-output packages skip the REPL phase (no preview container).',
    '// Authoritative list: .ai/rules/catalogue.md § Package metadata',
    `const domOutputPackages = ${printStrArray(domOutputPackages)};`,
    '',
    '// Phase inclusion per scope — source: .ai/workflows/manifest.json § pkgWorkflow.scopes',
    `const SCOPE_PHASES = ${printStrArrayMap(scopes)};`,
    '',
    '// Phase metadata for the harness UI — source: .ai/workflows/manifest.json § pkgWorkflow.phases',
    `const PHASES = ${printPhases(phases)};`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Filesystem orchestration — the only functions with side effects.
// ---------------------------------------------------------------------------

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
      onStale?.(`[STALE] ${relPath} is out of sync with .ai/workflows/manifest.json`);
      return 'stale';
    }
    console.log(`[SKIP] ${relPath} not present locally — gitignored, run \`pnpm gen:workflow-docs\` if you use this tool`);
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
 *     `pnpm gen:workflow-docs` run — always logged, in both check and write mode)
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

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function run({ check = false } = {}) {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, '.ai/workflows/manifest.json'), 'utf8'));
  assertValidManifest(manifest);

  let stale = false;
  const onStale = (message) => {
    stale = true;
    console.error(message);
  };

  for (const { description, slug } of manifest.workflows) {
    const content = stubContent(slug, description);
    syncFile(`.claude/commands/${slug}.md`, content, { check, onStale });
    syncFile(`.devin/workflows/${slug}.md`, content, { check, onStale });
  }

  syncPatchedFile(
    '.ai/workflows/pkg-workflow.md',
    '<!-- GENERATED:scope-table:BEGIN -->',
    '<!-- GENERATED:scope-table:END -->',
    scopeTable(manifest.pkgWorkflow),
    { check, onStale },
  );

  syncPatchedFile(
    '.claude/workflows/pkg-workflow.js',
    '// GENERATED:data:BEGIN',
    '// GENERATED:data:END',
    jsDataBlock(manifest.pkgWorkflow),
    { check, onStale },
  );

  if (check && stale) {
    console.error('\nRun `pnpm gen:workflow-docs` to regenerate.');
    return false;
  }
  if (!check) console.log('Workflow docs synced.');
  return true;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const ok = run({ check: process.argv.includes('--check') });
  if (!ok) process.exit(1);
}
