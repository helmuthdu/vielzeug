#!/usr/bin/env node
// Syncs the structured AI metadata under .ai/data/ with the live package graph from
// packages/*/package.json, then regenerates the human-readable package reference.
// Also validates that every .ai/... path any AGENTS.md/CLAUDE.md/.ai/**/*.md file
// cross-references still resolves to a real file — see "Reference integrity" below.
//
// Why one script: the old split between "workflow docs" and "catalogue" created more
// concepts than value. The current .ai architecture keeps curated facts in JSON and uses
// one small sync pass to refresh the fields that are derivable from source.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { isMain, parseArgs } from './lib/cli.mjs';
import { ROOT, replaceBetweenMarkers, syncFile } from './lib/marker-sync.mjs';
import { readPackageManifests } from './lib/packages.mjs';

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, 'utf8'));
}

const TASK_KEY_PATTERN = /^[a-z][a-z0-9-]*$/;

export function readAiTasks(root = ROOT) {
  const filePath = path.join(root, '.ai/data/tasks.json');
  return readJson(filePath).tasks;
}

export function assertValidTasks(tasks) {
  const seen = new Set();
  for (const task of tasks) {
    if (!TASK_KEY_PATTERN.test(task.key)) {
      throw new Error(`.ai/data/tasks.json: task key \"${task.key}\" must match ${TASK_KEY_PATTERN}`);
    }
    if (seen.has(task.key)) {
      throw new Error(`.ai/data/tasks.json: duplicate task key \"${task.key}\"`);
    }
    seen.add(task.key);
    if (!Array.isArray(task.references) || task.references.length === 0) {
      throw new Error(`.ai/data/tasks.json: task \"${task.key}\" must list at least one reference`);
    }
  }
}

export function readAiPackages(root = ROOT) {
  const filePath = path.join(root, '.ai/data/packages.json');
  const data = readJson(filePath);
  return data.packages;
}

export function readLivePackages(root = ROOT) {
  return readPackageManifests(path.join(root, 'packages')).map(({ dependencies, peers, slug }) => ({
    dependencies,
    optionalPeers: peers.filter((peer) => peer.optional).map((peer) => peer.name),
    slug,
  }));
}

export function mergePackageData(curatedPackages, livePackages) {
  const curatedBySlug = new Map(curatedPackages.map((pkg) => [pkg.slug, pkg]));
  const liveBySlug = new Map(livePackages.map((pkg) => [pkg.slug, pkg]));

  const missingInCurated = livePackages.filter((pkg) => !curatedBySlug.has(pkg.slug)).map((pkg) => pkg.slug);
  const missingOnDisk = curatedPackages.filter((pkg) => !liveBySlug.has(pkg.slug)).map((pkg) => pkg.slug);

  if (missingInCurated.length > 0 || missingOnDisk.length > 0) {
    const problems = [];
    if (missingInCurated.length > 0) {
      problems.push(`missing curated metadata for: ${missingInCurated.join(', ')}`);
    }
    if (missingOnDisk.length > 0) {
      problems.push(`stale curated entries with no package directory: ${missingOnDisk.join(', ')}`);
    }
    throw new Error(`.ai/data/packages.json is incomplete or stale — ${problems.join('; ')}`);
  }

  return curatedPackages
    .map((pkg) => ({
      ...pkg,
      // Architecture note: these fields are derived from package.json so the curated file never
      // becomes a second hidden dependency source.
      dependencies: liveBySlug.get(pkg.slug).dependencies,
      optionalPeers: liveBySlug.get(pkg.slug).optionalPeers,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function packagesFileContent(packages) {
  return `${JSON.stringify({ $schemaVersion: 1, packages }, null, 2)}\n`;
}

export function renderPackagesTable(packages) {
  const header = [
    'Package',
    'Category',
    'DOM',
    'Description',
    'Dependencies',
    'Optional peers',
    'Test command',
  ];
  const rows = packages.map((pkg) => [
    `\`${pkg.name}\``,
    pkg.category,
    pkg.domOutput ? 'yes' : 'no',
    pkg.description,
    pkg.dependencies.length > 0 ? pkg.dependencies.map((dep) => `\`${dep}\``).join(', ') : '—',
    pkg.optionalPeers.length > 0 ? pkg.optionalPeers.map((dep) => `\`${dep}\``).join(', ') : '—',
    pkg.testCommand ? `\`${pkg.testCommand}\`` : '—',
  ]);
  const row = (cells) => `| ${cells.join(' | ')} |`;
  return [row(header), row(header.map(() => '---')), ...rows.map(row)].join('\n');
}

export function taskStubContent(task) {
  if (/[:\n]/.test(task.description)) {
    throw new Error(`taskStubContent(): description for \"${task.key}\" breaks YAML frontmatter`);
  }

  return `---
description: ${task.description}
---

# ${task.key}

> **Canonical task:** See [\`.ai/tasks/${task.key}.md\`](../../.ai/tasks/${task.key}.md).

Read the task doc first, then load the shared references listed in \`.ai/data/tasks.json\`.
`;
}

export function patchPackagesReference(source, packages) {
  return replaceBetweenMarkers(
    source,
    '<!-- GENERATED:packages-table:BEGIN -->',
    '<!-- GENERATED:packages-table:END -->',
    renderPackagesTable(packages),
  );
}

// ---------------------------------------------------------------------------
// Reference integrity: every AGENTS.md/CLAUDE.md file and everything under .ai/ is allowed
// to cross-reference a `.ai/...` path (e.g. "see .ai/core/conventions.md"). Nothing enforced
// that those paths still exist after a rename/removal — a lesson borrowed from a stricter
// Claude-workflow toolkit that runs this exact check after every edit to its own instruction
// files. A dangling `.ai/...` reference silently sends an agent to read a file that no longer
// exists; treat it as a hard error in both `gen:ai-data` and `check:ai-data`, not just drift.
// ---------------------------------------------------------------------------

const AI_REF_IGNORE_DIRS = new Set([
  '.agents',
  '.claude',
  '.devin',
  '.git',
  '.idea',
  '.junie',
  '.rumdl_cache',
  '.vscode',
  '.worktrees',
  'common',
  'coverage',
  'dist',
  'node_modules',
]);
const AI_REF_PATTERN = /\.ai\/[A-Za-z0-9._/-]+\.(?:md|json)/g;

/** Recursively collects every `AGENTS.md`, `CLAUDE.md`, and file under `.ai/` (repo-relative
 * paths) — the full set of files allowed to cross-reference a `.ai/...` path. Skips
 * vendor/generated/tool-config directories by name so this stays a bounded walk instead of a
 * full repo scan; `.ai/` itself is walked in full regardless of that ignore list. */
export function collectAiReferenceSources(root = ROOT) {
  const files = [];
  const walk = (dir, insideAi) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const nowInsideAi = insideAi || entry.name === '.ai';
      if (entry.isDirectory()) {
        if (!nowInsideAi && AI_REF_IGNORE_DIRS.has(entry.name)) continue;
        walk(abs, nowInsideAi);
        continue;
      }
      if (nowInsideAi || entry.name === 'AGENTS.md' || entry.name === 'CLAUDE.md') {
        files.push(path.relative(root, abs));
      }
    }
  };
  walk(root, false);
  return files.sort();
}

/** Pulls every literal `.ai/...` path token out of `text`, deduplicated. Skips obvious
 * placeholders (e.g. `.ai/state/<scope>.json`) — anything containing `<` is a template, not a
 * real reference to validate. */
export function extractAiReferences(text) {
  const matches = text.match(AI_REF_PATTERN) ?? [];
  return [...new Set(matches)].filter((ref) => !ref.includes('<'));
}

/** Checks every `.ai/...` reference across `fileContents` (relPath -> content) against
 * `fileExists` (defaults to a real filesystem check rooted at `ROOT`) and returns every
 * dangling `{ file, ref }` pair. Takes an injectable `fileExists` so this stays unit-testable
 * without touching disk. */
export function findDanglingAiReferences(
  fileContents,
  fileExists = (relPath) => existsSync(path.join(ROOT, relPath)),
) {
  const dangling = [];
  for (const [file, content] of Object.entries(fileContents)) {
    for (const ref of extractAiReferences(content)) {
      if (!fileExists(ref)) dangling.push({ file, ref });
    }
  }
  return dangling;
}

export function main({ check = false } = {}) {
  const curatedPackages = readAiPackages();
  const livePackages = readLivePackages();
  const mergedPackages = mergePackageData(curatedPackages, livePackages);
  const tasks = readAiTasks();
  assertValidTasks(tasks);

  let stale = false;
  const onStale = (message) => {
    stale = true;
    console.error(message);
  };

  syncFile('.ai/data/packages.json', packagesFileContent(mergedPackages), { check, onStale });

  const packagesReferencePath = path.join(ROOT, '.ai/reference/packages.md');
  const packagesReference = readFileSync(packagesReferencePath, 'utf8');
  syncFile('.ai/reference/packages.md', patchPackagesReference(packagesReference, mergedPackages), { check, onStale });

  for (const task of tasks) {
    const content = taskStubContent(task);
    syncFile(`.claude/commands/${task.key}.md`, content, { check, onStale });
    syncFile(`.devin/workflows/${task.key}.md`, content, { check, onStale });
  }

  const referenceSources = collectAiReferenceSources();
  const fileContents = Object.fromEntries(
    referenceSources.map((relPath) => [relPath, readFileSync(path.join(ROOT, relPath), 'utf8')]),
  );
  const dangling = findDanglingAiReferences(fileContents);
  for (const { file, ref } of dangling) {
    console.error(`[DANGLING] ${file} references ${ref} — file does not exist`);
  }

  if (check && stale) {
    console.error('\nRun `pnpm gen:ai-data` to regenerate.');
    return false;
  }
  if (dangling.length > 0) {
    console.error('\nFix the dangling .ai reference(s) above — regenerating package data will not resolve them.');
    return false;
  }
  if (!check) console.log('AI data synced.');
  return true;
}

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));
  const ok = main({ check: Boolean(flags.check) });
  if (!ok) process.exitCode = 1;
}


