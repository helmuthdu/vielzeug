#!/usr/bin/env node
// Regenerates tool-stub files and generated data blocks from the single source
// of truth: .ai/workflows/manifest.json. See manifest.json's "$comment" field.
//
// Usage:
//   node scripts/sync-workflow-docs.mjs          # write generated output
//   node scripts/sync-workflow-docs.mjs --check  # exit 1 if output is stale (CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const CHECK = process.argv.includes('--check');

const manifest = JSON.parse(readFileSync(path.join(ROOT, '.ai/workflows/manifest.json'), 'utf8'));

let stale = false;

function write(relPath, content) {
  const abs = path.join(ROOT, relPath);
  const existing = (() => {
    try {
      return readFileSync(abs, 'utf8');
    } catch {
      return null;
    }
  })();

  if (existing === content) return;

  if (CHECK) {
    stale = true;
    console.error(`[STALE] ${relPath} is out of sync with .ai/workflows/manifest.json`);
    return;
  }

  writeFileSync(abs, content);
  console.log(`[WRITE] ${relPath}`);
}

function replaceBetweenMarkers(source, beginMarker, endMarker, replacement) {
  const begin = source.indexOf(beginMarker);
  const end = source.indexOf(endMarker);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error(`Markers ${beginMarker} / ${endMarker} not found`);
  }
  return source.slice(0, begin + beginMarker.length) + '\n' + replacement + '\n' + source.slice(end);
}

// ---------------------------------------------------------------------------
// 1. Tool stubs — .claude/commands/<slug>.md and .devin/workflows/<slug>.md
// ---------------------------------------------------------------------------

function stubContent(slug, description) {
  return `---
description: ${description}
---

# ${slug}

> **Canonical workflow:** See [\`.ai/workflows/${slug}.md\`](../../.ai/workflows/${slug}.md) for the full workflow definition.

Follow the instructions in \`.ai/workflows/${slug}.md\` exactly.
`;
}

for (const { slug, description } of manifest.workflows) {
  const content = stubContent(slug, description);
  write(`.claude/commands/${slug}.md`, content);
  write(`.devin/workflows/${slug}.md`, content);
}

// ---------------------------------------------------------------------------
// 2. pkg-workflow.md — "Scope selection" table
// ---------------------------------------------------------------------------

const CHANGE_TYPE_LABELS = {
  bug: 'Bug fix (no API change)',
  docs: 'Docs-only update',
  full: 'Full feature or new package',
  'new-api': 'New public API',
  security: 'Security hardening',
  tests: 'Test coverage gap',
};

function scopeTable() {
  const { scopes, scopeDescriptions } = manifest.pkgWorkflow;
  const rows = Object.entries(scopes).map(([key, phases]) => {
    const label = CHANGE_TYPE_LABELS[key] ?? key;
    return `| ${label.padEnd(28)} | \`${key}\`${' '.repeat(Math.max(0, 11 - key.length))} | ${phases.join(' → ')} |`;
  });
  return [
    '| Change type                 | Scope key     | Phases (converge within each)     |',
    '| ---------------------------- | ------------- | ---------------------------------- |',
    ...rows,
  ].join('\n');
}

{
  const p = path.join(ROOT, '.ai/workflows/pkg-workflow.md');
  const source = readFileSync(p, 'utf8');
  const updated = replaceBetweenMarkers(
    source,
    '<!-- GENERATED:scope-table:BEGIN -->',
    '<!-- GENERATED:scope-table:END -->',
    scopeTable(),
  );
  write('.ai/workflows/pkg-workflow.md', updated);
}

// ---------------------------------------------------------------------------
// 3. .claude/workflows/pkg-workflow.js — generated data block
// ---------------------------------------------------------------------------

function jsDataBlock() {
  const { phases, scopes, domOutputPackages } = manifest.pkgWorkflow;
  return [
    `const VALID_MODES = ${JSON.stringify(['analyse', 'feature', 'new-package'])};`,
    `const VALID_SCOPES = ${JSON.stringify(Object.keys(scopes))};`,
    '',
    '// DOM-output packages skip the REPL phase (no preview container).',
    '// Authoritative list: .ai/rules/catalogue.md § Package metadata',
    `const domOutputPackages = ${JSON.stringify(domOutputPackages)};`,
    '',
    '// Phase inclusion per scope — source: .ai/workflows/manifest.json § pkgWorkflow.scopes',
    `const SCOPE_PHASES = ${JSON.stringify(scopes, null, 2)};`,
    '',
    '// Phase metadata for the harness UI — source: .ai/workflows/manifest.json § pkgWorkflow.phases',
    `const PHASES = ${JSON.stringify(phases, null, 2)};`,
  ].join('\n');
}

{
  const p = path.join(ROOT, '.claude/workflows/pkg-workflow.js');
  const source = readFileSync(p, 'utf8');
  const updated = replaceBetweenMarkers(
    source,
    '// GENERATED:data:BEGIN',
    '// GENERATED:data:END',
    jsDataBlock(),
  );
  write('.claude/workflows/pkg-workflow.js', updated);
}

// ---------------------------------------------------------------------------

if (CHECK && stale) {
  console.error('\nRun `pnpm gen:workflow-docs` to regenerate.');
  process.exit(1);
}
if (!CHECK) console.log('Workflow docs synced.');
