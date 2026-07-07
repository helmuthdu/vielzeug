#!/usr/bin/env node
// Regenerates tool-stub files and generated data blocks from the single source
// of truth: .ai/workflows/manifest.json. See manifest.json's "$comment" field.
//
// Usage:
//   node scripts/sync-workflow-docs.mjs          # write generated output
//   node scripts/sync-workflow-docs.mjs --check  # exit 1 if output is stale (CI)
//
// Why a hand-rolled module instead of a bundler/codegen library: the output is
// ~5 small string templates. Pulling in a templating dependency for this would
// be more machinery than the problem needs — see .ai/rules/code/conventions.md
// (zero-dependency discipline extends to repo tooling, not just packages).
//
// The generic "write/patch a file idempotently, with a --check mode" primitive lives in
// scripts/lib/marker-sync.mjs, not here — this module owns only workflow-manifest-specific
// content builders and validation.
//
// Pure functions below are exported for scripts/__tests__/sync-workflow-docs.test.mjs
// (a vitest project — see scripts/vitest.config.ts — same test runner/assertions
// as every package in this repo, no second test convention). Everything with real
// side effects (reading manifest.json, writing files) is guarded by the `isMain`
// check at the bottom, so importing this module for tests never touches the filesystem.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { isMain, parseArgs } from './lib/cli.mjs';
import { ROOT, syncPatchedFile, syncFile } from './lib/marker-sync.mjs';

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

  const { modes, phases, scopeRequirements = {}, scopes } = manifest.pkgWorkflow;

  for (const scopeKey of Object.keys(scopeRequirements)) {
    if (!(scopeKey in scopes)) {
      throw new Error(`manifest.pkgWorkflow.scopeRequirements references unknown scope "${scopeKey}"`);
    }
  }

  const defaultModes = modes.filter((m) => m.isDefault);
  if (defaultModes.length !== 1) {
    throw new Error(
      `manifest.pkgWorkflow.modes: exactly one mode must set "isDefault": true (found ${defaultModes.length})`,
    );
  }
  for (const { key } of modes) {
    if (!SLUG_PATTERN.test(key)) {
      throw new Error(`manifest.pkgWorkflow.modes: key "${key}" must match ${SLUG_PATTERN}`);
    }
  }

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

/** Bullet list of scope preconditions/exceptions that don't fit as a table cell
 * (e.g. "security" requiring a prior plan.md) — data-driven so a future scope's
 * precondition can't end up as an easy-to-miss hand-written sentence again. */
export function scopeNotes(scopeRequirements) {
  const entries = Object.entries(scopeRequirements);
  if (entries.length === 0) return '_No scope-specific preconditions._';
  return entries.map(([key, requirement]) => `- **\`${key}\`** — ${requirement}`).join('\n');
}

/** Same table, byte-identical, patched into both pkg-plan.md and pkg-workflow.md —
 * the two previously hand-copied Mode tables drifted from each other in practice
 * (different wording, different columns) before this became generated. */
export function modeTable(modes) {
  const header = ['Mode', 'Use when', 'Pass structure'];
  const rows = modes.map(({ isDefault, key, passStructure, useWhen }) => [
    isDefault ? `\`${key}\` (default)` : `\`${key}\``,
    useWhen,
    passStructure,
  ]);
  const toRow = (cells) => `| ${cells.join(' | ')} |`;
  return [toRow(header), toRow(header.map(() => '---')), ...rows.map(toRow)].join('\n');
}

export function jsDataBlock({ domOutputPackages, modes, phases, scopes }) {
  return [
    `const VALID_MODES = ${printStrArray(modes.map((m) => m.key))};`,
    `const VALID_SCOPES = ${printStrArray(Object.keys(scopes))};`,
    '',
    '// DOM-output packages skip the REPL phase (no preview container).',
    '// Authoritative list: .ai/rules/data/catalogue.md § Package metadata',
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
// Entry point
// ---------------------------------------------------------------------------

export function main({ check = false } = {}) {
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
    '.ai/workflows/pkg-workflow.md',
    '<!-- GENERATED:scope-notes:BEGIN -->',
    '<!-- GENERATED:scope-notes:END -->',
    scopeNotes(manifest.pkgWorkflow.scopeRequirements ?? {}),
    { check, onStale },
  );

  for (const relPath of ['.ai/workflows/pkg-plan.md', '.ai/workflows/pkg-workflow.md']) {
    syncPatchedFile(
      relPath,
      '<!-- GENERATED:mode-table:BEGIN -->',
      '<!-- GENERATED:mode-table:END -->',
      modeTable(manifest.pkgWorkflow.modes),
      { check, onStale },
    );
  }

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

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));
  const ok = main({ check: Boolean(flags.check) });
  if (!ok) process.exitCode = 1;
}
