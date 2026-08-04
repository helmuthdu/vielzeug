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
const DOCS_PROFILES = new Set(['catalog', 'cli-tool', 'component-library']);

function assertSchemaVersion(data, filePath) {
  if (data?.$schemaVersion !== 1) throw new Error(`${filePath}: unsupported or missing $schemaVersion`);
}

export function readAiTasks(root = ROOT) {
  const filePath = path.join(root, '.ai/data/tasks.json');
  const data = readJson(filePath);
  assertSchemaVersion(data, '.ai/data/tasks.json');
  return data.tasks;
}

export function assertValidTasks(tasks) {
  if (!Array.isArray(tasks)) throw new Error('.ai/data/tasks.json: "tasks" must be an array');

  const seen = new Set();
  for (const task of tasks) {
    if (!task || typeof task !== 'object') throw new Error('.ai/data/tasks.json: every task must be an object');
    if (!TASK_KEY_PATTERN.test(task.key)) {
      throw new Error(`.ai/data/tasks.json: task key \"${task.key}\" must match ${TASK_KEY_PATTERN}`);
    }
    if (seen.has(task.key)) {
      throw new Error(`.ai/data/tasks.json: duplicate task key \"${task.key}\"`);
    }
    seen.add(task.key);

    for (const field of ['description', 'inputs']) {
      if (field === 'description' && (typeof task[field] !== 'string' || task[field].trim() === '')) {
        throw new Error(`.ai/data/tasks.json: task \"${task.key}\" must have a non-empty description`);
      }
      if (
        field === 'inputs' &&
        (!Array.isArray(task[field]) || task[field].some((input) => typeof input !== 'string'))
      ) {
        throw new Error(`.ai/data/tasks.json: task \"${task.key}\" inputs must be an array of strings`);
      }
    }

    if (
      !Array.isArray(task.references) ||
      task.references.length === 0 ||
      task.references.some((ref) => typeof ref !== 'string')
    ) {
      throw new Error(`.ai/data/tasks.json: task \"${task.key}\" must list at least one string reference`);
    }
  }
}

export function assertTaskReferencesExist(tasks, root = ROOT) {
  for (const task of tasks) {
    const canonicalTask = `.ai/tasks/${task.key}.md`;
    if (!existsSync(path.join(root, canonicalTask))) {
      throw new Error(`.ai/data/tasks.json: task \"${task.key}\" has no canonical task document (${canonicalTask})`);
    }
    for (const reference of task.references) {
      if (!existsSync(path.join(root, reference))) {
        throw new Error(`.ai/data/tasks.json: task \"${task.key}\" references missing file \"${reference}\"`);
      }
    }
  }
}

export function readAiPackages(root = ROOT) {
  const filePath = path.join(root, '.ai/data/packages.json');
  const data = readJson(filePath);
  assertSchemaVersion(data, '.ai/data/packages.json');
  return data.packages;
}

export function readLivePackages(root = ROOT) {
  return readPackageManifests(path.join(root, 'packages')).map(({ dependencies, peers, slug }) => ({
    dependencies,
    optionalPeers: peers.filter((peer) => peer.optional).map((peer) => peer.name),
    peerDependencies: peers
      .filter((peer) => !peer.optional && !dependencies.includes(peer.name))
      .map((peer) => peer.name),
    slug,
  }));
}

export function assertValidPackages(packages) {
  if (!Array.isArray(packages)) throw new Error('.ai/data/packages.json: "packages" must be an array');

  const seen = new Set();
  for (const pkg of packages) {
    if (!pkg || typeof pkg !== 'object') throw new Error('.ai/data/packages.json: every package must be an object');
    if (typeof pkg.slug !== 'string' || !TASK_KEY_PATTERN.test(pkg.slug)) {
      throw new Error(`.ai/data/packages.json: invalid package slug \"${pkg.slug}\"`);
    }
    if (seen.has(pkg.slug)) throw new Error(`.ai/data/packages.json: duplicate package slug \"${pkg.slug}\"`);
    seen.add(pkg.slug);
    if (pkg.name !== `@vielzeug/${pkg.slug}`) {
      throw new Error(`.ai/data/packages.json: package \"${pkg.slug}\" must use name \"@vielzeug/${pkg.slug}\"`);
    }
    if (
      typeof pkg.category !== 'string' ||
      pkg.category.trim() === '' ||
      typeof pkg.description !== 'string' ||
      pkg.description.trim() === ''
    ) {
      throw new Error(`.ai/data/packages.json: package \"${pkg.slug}\" must have category and description`);
    }
    if (typeof pkg.domOutput !== 'boolean')
      throw new Error(`.ai/data/packages.json: package \"${pkg.slug}\" domOutput must be boolean`);
    if (pkg.testCommand !== undefined && typeof pkg.testCommand !== 'string') {
      throw new Error(`.ai/data/packages.json: package \"${pkg.slug}\" testCommand must be a string`);
    }
    if (pkg.docsProfile !== undefined && (!DOCS_PROFILES.has(pkg.docsProfile) || typeof pkg.docsProfile !== 'string')) {
      throw new Error(`.ai/data/packages.json: package \"${pkg.slug}\" has invalid docsProfile`);
    }
    for (const field of ['dependencies', 'peerDependencies', 'optionalPeers']) {
      if (
        pkg[field] !== undefined &&
        (!Array.isArray(pkg[field]) || pkg[field].some((dependency) => typeof dependency !== 'string'))
      ) {
        throw new Error(`.ai/data/packages.json: package \"${pkg.slug}\" ${field} must be an array of strings`);
      }
    }
  }
}

export function mergePackageData(curatedPackages, livePackages) {
  assertValidPackages(curatedPackages);

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
      peerDependencies: liveBySlug.get(pkg.slug).peerDependencies,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Formats through prettier (not just `JSON.stringify(..., null, 2)`) so the generated
 * content byte-for-byte matches what's actually on disk: lefthook's pre-commit `pnpm fix`
 * (and any editor's format-on-save) run prettier over `.ai/data/packages.json`, which collapses
 * short arrays like `["ripple"]` onto one line — `JSON.stringify` never does that, it always
 * expands arrays one-element-per-line. Skipping this step made `--check` mode compare its own
 * raw serialization against a prettier-reformatted file that's semantically identical but
 * textually different, so CI reported `[STALE]` on every commit even right after `gen:ai-data`. */
async function formatJson(content, filepath) {
  const prettier = await import('prettier');
  const config = (await prettier.resolveConfig(filepath)) ?? undefined;
  return prettier.format(content, { ...config, filepath });
}

export async function packagesFileContent(packages) {
  const raw = JSON.stringify({ $schemaVersion: 1, packages }, null, 2);
  return formatJson(raw, path.join(ROOT, '.ai/data/packages.json'));
}

export function renderPackagesTable(packages) {
  const header = [
    'Package',
    'Category',
    'DOM',
    'Description',
    'Dependencies',
    'Required peers',
    'Optional peers',
    'Test command',
  ];
  const rows = packages.map((pkg) => [
    `\`${pkg.name}\``,
    pkg.category,
    pkg.domOutput ? 'yes' : 'no',
    pkg.description,
    pkg.dependencies.length > 0 ? pkg.dependencies.map((dep) => `\`${dep}\``).join(', ') : '—',
    pkg.peerDependencies?.length > 0 ? pkg.peerDependencies.map((dep) => `\`${dep}\``).join(', ') : '—',
    pkg.optionalPeers.length > 0 ? pkg.optionalPeers.map((dep) => `\`${dep}\``).join(', ') : '—',
    pkg.testCommand ? `\`${pkg.testCommand}\`` : '—',
  ]);
  const row = (cells) => `| ${cells.join(' | ')} |`;
  return [row(header), row(header.map(() => '---')), ...rows.map(row)].join('\n');
}

export function taskStubContent(task) {
  const inputs = task.inputs?.length > 0 ? task.inputs.map((input) => `- \`${input}\``).join('\n') : '- None';
  const references = task.references?.map((reference) => `- \`${reference}\``).join('\n') || '- None';
  const description = /[:#{}[\],&*!|>'"%@`\n]/.test(task.description)
    ? JSON.stringify(task.description)
    : task.description;

  return `---
description: ${description}
---

# ${task.key}

## Inputs

${inputs}

## Load

${references}

## Procedure

Read [\`.ai/tasks/${task.key}.md\`](../../.ai/tasks/${task.key}.md) before work. It is canonical.
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
      const relPath = path.relative(root, abs);
      if (entry.isDirectory()) {
        if (relPath === '.ai/state') {
          const contract = path.join(abs, 'AGENTS.md');
          if (existsSync(contract)) files.push(path.relative(root, contract));
          continue;
        }
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
export function findDanglingAiReferences(fileContents, fileExists = (relPath) => existsSync(path.join(ROOT, relPath))) {
  const dangling = [];
  for (const [file, content] of Object.entries(fileContents)) {
    for (const ref of extractAiReferences(content)) {
      if (!fileExists(ref)) dangling.push({ file, ref });
    }
  }
  return dangling;
}

export async function main({ check = false } = {}) {
  const curatedPackages = readAiPackages();
  const livePackages = readLivePackages();
  const mergedPackages = mergePackageData(curatedPackages, livePackages);
  const tasks = readAiTasks();
  assertValidTasks(tasks);
  assertTaskReferencesExist(tasks);

  let stale = false;
  const onStale = (message) => {
    stale = true;
    console.error(message);
  };

  syncFile('.ai/data/packages.json', await packagesFileContent(mergedPackages), { check, onStale });

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
  const ok = await main({ check: Boolean(flags.check) });
  if (!ok) process.exitCode = 1;
}
