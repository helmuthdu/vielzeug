#!/usr/bin/env node
// Syncs the structured AI metadata under .ai/data/ with the live package graph from
// packages/*/package.json, then regenerates the human-readable package reference.
// Also validates that every .ai/... path referenced by a canonical AI document or
// client entrypoint resolves to a real file — see "Reference integrity" below.
//
// Why one script: the old split between "workflow docs" and "catalogue" created more
// concepts than value. The current .ai architecture keeps curated facts in JSON and uses
// one small sync pass to refresh the fields that are derivable from source.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { isMain, parseArgs } from './lib/cli.mjs';
import { ROOT, replaceBetweenMarkers, syncFile } from './lib/marker-sync.mjs';
import { readPackageManifests } from './lib/packages.mjs';

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, 'utf8'));
}

const TASK_KEY_PATTERN = /^[a-z][a-z0-9-]*$/;
const DOCS_CONTRACTS = new Set(['catalog', 'component-library']);

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

    if (typeof task.description !== 'string' || task.description.trim() === '') {
      throw new Error(`.ai/data/tasks.json: task \"${task.key}\" must have a non-empty description`);
    }
    const unsupportedFields = Object.keys(task).filter((field) => field !== 'key' && field !== 'description');
    if (unsupportedFields.length > 0) {
      throw new Error(
        `.ai/data/tasks.json: task \"${task.key}\" has unsupported fields: ${unsupportedFields.join(', ')}`,
      );
    }
  }
}

export function assertTaskDocumentsExist(tasks, root = ROOT) {
  for (const task of tasks) {
    const canonicalTask = `.ai/tasks/${task.key}.md`;
    if (!existsSync(path.join(root, canonicalTask))) {
      throw new Error(`.ai/data/tasks.json: task \"${task.key}\" has no canonical task document (${canonicalTask})`);
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
    if (pkg.docsContract !== undefined && (!DOCS_CONTRACTS.has(pkg.docsContract) || typeof pkg.docsContract !== 'string')) {
      throw new Error(`.ai/data/packages.json: package \"${pkg.slug}\" has invalid docsContract`);
    }
    for (const field of ['dependencies', 'peerDependencies', 'optionalPeers']) {
      if (
        pkg[field] !== undefined &&
        (!Array.isArray(pkg[field]) || pkg[field].some((dependency) => typeof dependency !== 'string'))
      ) {
        throw new Error(`.ai/data/packages.json: package \"${pkg.slug}\" ${field} must be an array of strings when present`);
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
    .map((pkg) => {
      const live = liveBySlug.get(pkg.slug);
      const merged = {
        ...pkg,
        // Architecture note: these fields are derived from package.json so the curated file never
        // becomes a second hidden dependency source.
        dependencies: live.dependencies,
        optionalPeers: live.optionalPeers,
        peerDependencies: live.peerDependencies,
      };
      // Omit empty arrays to reduce noise — sparse fields are optional in output.
      if (merged.dependencies?.length === 0) delete merged.dependencies;
      if (merged.optionalPeers?.length === 0) delete merged.optionalPeers;
      if (merged.peerDependencies?.length === 0) delete merged.peerDependencies;
      return merged;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const require = createRequire(import.meta.url);
const biomeBin = require.resolve('@biomejs/biome/bin/biome');

function formatJson(content, filepath) {
  return execFileSync(process.execPath, [biomeBin, 'format', `--stdin-file-path=${filepath}`], {
    encoding: 'utf8',
    input: content,
  });
}

export function packagesFileContent(packages) {
  const raw = JSON.stringify({ $schemaVersion: 1, packages }, null, 2);
  return formatJson(raw, path.join(ROOT, '.ai/data/packages.json'));
}

export function renderPackagesTable(packages) {
  const header = ['Package', 'Category', 'Description', 'Dependencies', 'Required peers', 'Optional peers'];
  const rows = packages.map((pkg) => [
    `\`${pkg.name}\``,
    pkg.category,
    pkg.description,
    pkg.dependencies?.length > 0 ? pkg.dependencies.map((dep) => `\`${dep}\``).join(', ') : '—',
    pkg.peerDependencies?.length > 0 ? pkg.peerDependencies.map((dep) => `\`${dep}\``).join(', ') : '—',
    pkg.optionalPeers?.length > 0 ? pkg.optionalPeers.map((dep) => `\`${dep}\``).join(', ') : '—',
  ]);
  const row = (cells) => `| ${cells.join(' | ')} |`;
  return [row(header), row(header.map(() => '---')), ...rows.map(row)].join('\n');
}

export function taskStubContent(task) {
  const description = /[:#{}[\],&*!|>'"%@`\n]/.test(task.description)
    ? JSON.stringify(task.description)
    : task.description;

  return `---
description: ${description}
---

# ${task.key}

Read [\`.ai/tasks/${task.key}.md\`](../../.ai/tasks/${task.key}.md) and follow it as the canonical procedure.
`;
}

const TASK_ADAPTER_DIRS = ['.claude/commands', '.devin/workflows'];

export function syncTaskAdapters(tasks, { check = false, onStale, root = ROOT } = {}) {
  const expectedFiles = new Set(tasks.map((task) => `${task.key}.md`));

  for (const directory of TASK_ADAPTER_DIRS) {
    for (const task of tasks) {
      const relPath = `${directory}/${task.key}.md`;
      syncFile(relPath, taskStubContent(task), {
        check,
        checkExistingIgnored: true,
        onStale,
        root,
      });
    }

    const absDirectory = path.join(root, directory);
    if (!existsSync(absDirectory)) continue;
    for (const entry of readdirSync(absDirectory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md') || expectedFiles.has(entry.name)) continue;
      const relPath = `${directory}/${entry.name}`;
      if (check) {
        onStale?.(`[STALE] ${relPath} has no task registry entry`);
        continue;
      }
      unlinkSync(path.join(absDirectory, entry.name));
      console.log(`[REMOVE] ${relPath}`);
    }
  }
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
// Reference integrity: canonical AI files and client entrypoints may cross-reference an
// `.ai/...` path (e.g. "see .ai/core/conventions.md"). A dangling reference silently sends
// an agent to a missing contract, so both generation and check mode treat it as a hard error.
// ---------------------------------------------------------------------------

const AI_REF_IGNORE_DIRS = new Set([
  '.agents',
  '.git',
  '.idea',
  '.rumdl_cache',
  '.vscode',
  '.worktrees',
  'common',
  'coverage',
  'dist',
  'node_modules',
]);
const AI_REF_PATTERN = /\.ai\/[A-Za-z0-9._/-]+\.(?:md|json)/g;

export function isAiReferenceSource(relPath, insideAi) {
  const normalizedPath = relPath.replaceAll('\\', '/');
  return (
    insideAi ||
    path.posix.basename(normalizedPath) === 'AGENTS.md' ||
    path.posix.basename(normalizedPath) === 'CLAUDE.md' ||
    normalizedPath === '.github/copilot-instructions.md' ||
    normalizedPath === '.junie/AGENTS.md' ||
    normalizedPath.startsWith('.junie/rules/') ||
    normalizedPath.startsWith('.claude/commands/') ||
    normalizedPath.startsWith('.devin/workflows/')
  );
}

/** Recursively collects canonical AI files and client entrypoints as repo-relative paths.
 * Vendor and build directories stay excluded so reference validation remains bounded. */
export function collectAiReferenceSources(root = ROOT) {
  const files = [];
  const walk = (dir, insideAi) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const nowInsideAi = insideAi || entry.name === '.ai';
      const relPath = path.relative(root, abs).replaceAll('\\', '/');
      if (entry.isDirectory()) {
        if (!nowInsideAi && AI_REF_IGNORE_DIRS.has(entry.name)) continue;
        walk(abs, nowInsideAi);
        continue;
      }
      if (isAiReferenceSource(relPath, nowInsideAi)) files.push(relPath);
    }
  };
  walk(root, false);
  return files.sort();
}

/** Pulls every literal `.ai/...` path token out of `text`, deduplicated. Skips obvious
 * placeholders (e.g. `.ai/tasks/<task>.md`) — anything containing `<` is a template, not a
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
  assertTaskDocumentsExist(tasks);

  let stale = false;
  const onStale = (message) => {
    stale = true;
    console.error(message);
  };

  syncFile('.ai/data/packages.json', await packagesFileContent(mergedPackages), { check, onStale });

  const packagesReferencePath = path.join(ROOT, '.ai/reference/packages.md');
  const packagesReference = readFileSync(packagesReferencePath, 'utf8');
  syncFile('.ai/reference/packages.md', patchPackagesReference(packagesReference, mergedPackages), { check, onStale });

  syncTaskAdapters(tasks, { check, onStale });

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
