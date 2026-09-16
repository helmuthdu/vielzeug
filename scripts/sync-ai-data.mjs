#!/usr/bin/env node
// Keeps the derived parts of the agent contract in sync with their sources:
//   - .agents/reference/packages.md  ← packages/*/package.json (name, description, graph)
// and validates that every `.agents/...` path referenced anywhere in the repo resolves to a
// real file — see "Reference integrity" below. There is deliberately no curated JSON layer:
// package facts live in manifests and task procedures live as skills.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { isMain, parseArgs } from './lib/cli.mjs';
import { ROOT, replaceBetweenMarkers, syncFile } from './lib/marker-sync.mjs';
import { readPackageManifests } from './lib/packages.mjs';

// ---------------------------------------------------------------------------
// Packages — the generated one-page view of packages/*/package.json.
// ---------------------------------------------------------------------------

export function readLivePackages(root = ROOT) {
  return readPackageManifests(path.join(root, 'packages')).map(({ dependencies, description, name, peers, slug }) => ({
    dependencies,
    description,
    name,
    optionalPeers: peers.filter((peer) => peer.optional).map((peer) => peer.name),
    peerDependencies: peers
      .filter((peer) => !peer.optional && !dependencies.includes(peer.name))
      .map((peer) => peer.name),
    slug,
  }));
}

export function renderPackagesTable(packages) {
  const header = ['Package', 'Description', 'Dependencies', 'Required peers', 'Optional peers'];
  const list = (items) => (items?.length > 0 ? items.map((dep) => `\`${dep}\``).join(', ') : '—');
  const rows = packages.map((pkg) => [
    `\`${pkg.name}\``,
    pkg.description || '—',
    list(pkg.dependencies),
    list(pkg.peerDependencies),
    list(pkg.optionalPeers),
  ]);
  const row = (cells) => `| ${cells.join(' | ')} |`;
  return [row(header), row(header.map(() => '---')), ...rows.map(row)].join('\n');
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
// Reference integrity: any text file in the repo may cross-reference an `.agents/...` path
// (e.g. "see .agents/conventions.md", ".agents/skills/build/SKILL.md"). A dangling
// reference silently sends an agent to a missing contract, so both generation and check mode
// treat it as a hard error.
// ---------------------------------------------------------------------------

const AI_REF_IGNORE_DIRS = new Set([
  '.git',
  '.idea',
  '.rumdl_cache',
  '.vscode',
  '.worktrees',
  '__tests__',
  'cache',
  'common',
  'coverage',
  'dist',
  'node_modules',
]);
const AI_REF_EXTENSIONS = new Set(['.md', '.mjs', '.mts', '.ts', '.vue', '.yml', '.yaml']);
const AI_REF_IGNORE_BASENAMES = new Set(['CHANGELOG.md']);
const AI_REF_PATTERN = /\.agents\/[A-Za-z0-9._/-]+\.md/g;

/** Text files that may legitimately carry `.agents/...` references. Changelogs are release history
 * and are allowed to mention paths that no longer exist. */
export function isAiReferenceSource(relPath) {
  const base = path.posix.basename(relPath.replaceAll('\\', '/'));
  return AI_REF_EXTENSIONS.has(path.posix.extname(base)) && !AI_REF_IGNORE_BASENAMES.has(base);
}

/** Recursively collects reference sources as repo-relative paths. Vendor and build directories
 * stay excluded so reference validation remains bounded. */
export function collectAiReferenceSources(root = ROOT) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const relPath = path.relative(root, abs).replaceAll('\\', '/');
      if (entry.isDirectory()) {
        if (AI_REF_IGNORE_DIRS.has(entry.name)) continue;
        walk(abs);
        continue;
      }
      if (entry.isFile() && isAiReferenceSource(relPath)) files.push(relPath);
    }
  };
  walk(root);
  return files.sort();
}

/** Pulls every literal `.agents/...` path token out of `text`, deduplicated. Skips obvious placeholders (e.g. `.agents/skills/<name>/SKILL.md`) — anything
 * containing `<` is a template, not a real reference to validate. */
export function extractAiReferences(text) {
  const matches = text.match(AI_REF_PATTERN) ?? [];
  return [...new Set(matches)].filter((ref) => !ref.includes('<'));
}

/** Checks every collected reference across `fileContents` (relPath -> content) against
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
  const packages = readLivePackages();

  let stale = false;
  const onStale = (message) => {
    stale = true;
    console.error(message);
  };

  const packagesReferencePath = path.join(ROOT, '.agents/reference/packages.md');
  const packagesReference = readFileSync(packagesReferencePath, 'utf8');
  syncFile('.agents/reference/packages.md', patchPackagesReference(packagesReference, packages), { check, onStale });

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
    console.error('\nFix the dangling reference(s) above — regenerating will not resolve them.');
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
