#!/usr/bin/env node
/**
 * Apply pending change files as a CalVer lockstep release train.
 *
 * Every publishable package in rush.json is stamped with the same train number
 * (`YY.MM.N` — see train-version.mjs); packages with pending change files additionally get
 * a CHANGELOG entry for it, their change files are consumed, and one commit lands the
 * whole train. A package is a publish candidate only when its CHANGELOG has an entry for
 * the current version — publish-missing.mjs enforces the same rule — so the lockstep stamp
 * never republishes an unchanged package: npm simply never sees the trains a package
 * didn't ride.
 *
 * `applyTrain(pkg)` scopes the changelog entry and change-file consumption to one package
 * (publish.yml mode=single) while still stamping every manifest, because a train is
 * repo-wide by definition; sibling packages' pending change files survive for their own
 * release.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { run as defaultRun } from '../lib/cli.mjs';
import { listPublishablePackages } from './publish-missing.mjs';
import { nextTrainVersion } from './train-version.mjs';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..', '..');

/** Change-file type → CHANGELOG section title, in render order. The titles match what
 *  Rush wrote for the pre-CalVer history, so one changelog reads as one format. */
const SECTIONS = [
  ['major', 'Major changes'],
  ['minor', 'Minor changes'],
  ['patch', 'Patches'],
];

/**
 * Relative paths (e.g. "@vielzeug/ore/agent_123.json") of every pending change file. Rush
 * groups these under a directory per full scoped package name, which — because the name
 * itself contains a "/" — is really two nested directory levels (@vielzeug/ore), so this
 * walks recursively rather than assuming a fixed depth.
 */
export function listChangeFiles(changesDir) {
  if (!existsSync(changesDir)) return [];

  const files = [];
  const walk = (dir, relDir) => {
    for (const entry of readdirSync(dir)) {
      const absPath = path.join(dir, entry);
      const relPath = relDir ? path.join(relDir, entry) : entry;
      if (statSync(absPath).isDirectory()) walk(absPath, relPath);
      else if (entry.endsWith('.json')) files.push(relPath);
    }
  };
  walk(changesDir, '');
  return files;
}

/** Sorted, de-duplicated package names that have at least one pending change file. */
export function listChangedPackageNames(root = repoRoot) {
  const changesDir = path.join(root, 'common', 'changes');
  const names = listChangeFiles(changesDir).map((relFile) => path.dirname(relFile));
  return [...new Set(names)].sort();
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** Best-effort HEAD sha for changelog entry provenance — absent in tests and any repo
 *  without git history, and never worth failing a release over. */
function headCommit(root, run) {
  try {
    return run('git', ['rev-parse', 'HEAD'], { cwd: root }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Flattens one package's pending change files into `{ [type]: [{ author, comment }] }`. */
function collectComments(changeFiles, changesDir) {
  const comments = {};
  for (const relFile of changeFiles) {
    const change = readJson(path.join(changesDir, relFile));
    for (const entry of change.changes ?? []) {
      (comments[entry.type] ??= []).push({ author: change.email ?? 'unknown', comment: entry.comment });
    }
  }
  return comments;
}

/** The markdown block for one release, matching the changelog format Rush wrote. */
function renderMarkdownEntry(version, date, comments) {
  const lines = [`## ${version}`, date, ''];
  for (const [type, title] of SECTIONS) {
    const entries = comments[type];
    if (!entries?.length) continue;
    lines.push(`### ${title}`, '');
    for (const { comment } of entries) lines.push(`- ${comment}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Prepends one release to a package's CHANGELOG.md, rewriting the generated-on stamp. */
function updateMarkdownChangelog(file, name, version, date, comments) {
  const header = `# Change Log - ${name}\n\nThis log was last generated on ${date} and should not be manually modified.\n\n`;
  const entry = renderMarkdownEntry(version, date, comments);
  const marker = 'and should not be manually modified.\n\n';

  let rest = '';
  if (existsSync(file)) {
    const current = readFileSync(file, 'utf8');
    const markerIndex = current.indexOf(marker);
    rest = markerIndex === -1 ? current : current.slice(markerIndex + marker.length);
  }

  writeFileSync(file, header + entry + rest);
}

/** Prepends one release to a package's CHANGELOG.json (the structured mirror of the .md). */
function updateJsonChangelog(file, name, version, date, comments, commit) {
  const log = existsSync(file) ? readJson(file) : { entries: [], name };
  const jsonComments = {};
  for (const [type] of SECTIONS) {
    const entries = (comments[type] ?? []).map(({ author, comment }) => ({
      ...(commit ? { commit } : {}),
      author,
      comment,
    }));
    if (entries.length > 0) jsonComments[type] = entries;
  }

  log.entries.unshift({ comments: jsonComments, date, tag: `${name}_v${version}`, version });
  writeFileSync(file, `${JSON.stringify(log, null, 2)}\n`);
}

/** Stamps every publishable manifest with the train version, preserving field order. */
function stampManifests(packages, train, root) {
  const stamped = [];
  for (const { folder } of packages) {
    const file = path.join(root, folder, 'package.json');
    const manifest = readJson(file);
    manifest.version = train;
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    stamped.push(file);
  }
  return stamped;
}

/**
 * Applies the pending change files as a release train and returns
 * `{ changedPackages, train }`. With `packageName`, only that package's change files are
 * consumed and changelogged; the train stamp still covers every package.
 * `dryRun` computes the train and reports what it would do without touching any file —
 * the whole point of a dry run is that pending change files survive it.
 */
export function applyTrain(packageName, { dryRun = false, now = new Date(), root = repoRoot, run = defaultRun } = {}) {
  const changesDir = path.join(root, 'common', 'changes');
  const allFiles = listChangeFiles(changesDir);
  const consumed = packageName ? allFiles.filter((f) => path.dirname(f) === packageName) : allFiles;

  if (consumed.length === 0) {
    throw new Error(
      `No pending change files${packageName ? ` for ${packageName}` : ''}. Write one with scripts/rush-change.mjs, commit, then re-trigger.`,
    );
  }

  const changedPackages = [...new Set(consumed.map((relFile) => path.dirname(relFile)))].sort();
  const packages = listPublishablePackages(root);
  const train = nextTrainVersion(packages.map(({ version }) => version), now);
  if (dryRun) return { changedPackages, train };

  const date = now.toUTCString();
  const commit = headCommit(root, run);

  const touched = stampManifests(packages, train, root);
  for (const name of changedPackages) {
    const { folder } = packages.find((candidate) => candidate.name === name);
    const comments = collectComments(
      consumed.filter((relFile) => path.dirname(relFile) === name),
      changesDir,
    );

    updateMarkdownChangelog(path.join(root, folder, 'CHANGELOG.md'), name, train, date, comments);
    updateJsonChangelog(path.join(root, folder, 'CHANGELOG.json'), name, train, date, comments, commit);
    touched.push(path.join(root, folder, 'CHANGELOG.md'), path.join(root, folder, 'CHANGELOG.json'));

    for (const relFile of consumed.filter((relFile) => path.dirname(relFile) === name)) {
      rmSync(path.join(changesDir, relFile));
    }
  }

  run('git', ['add', ...touched, 'common/changes'], { cwd: root });
  run('git', ['commit', '-m', `chore: apply release train ${train}`], { cwd: root, inherit: true });

  return { changedPackages, train };
}
