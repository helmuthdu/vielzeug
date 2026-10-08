#!/usr/bin/env node
/**
 * Apply pending change files as a CalVer lockstep release train.
 *
 * Every publishable package in rush.json rides every train: each manifest is stamped with
 * the same train number (`YY.MM.N`: see train-version.mjs) and each CHANGELOG gets an entry
 * for it: real comments for packages with pending change files (their change files are
 * consumed), an alignment-only entry for every other package. One commit lands the whole
 * train, and the whole family publishes at the train number.
 *
 * Full-family publishing is what makes exact `@vielzeug/*` dependency pins always
 * resolvable: a consumer upgrading to any train gets one consistent version set (every
 * package pins its deps to the same number it carries), never nested duplicate copies of
 * the same library. Selective publishing was the alternative and it required a
 * dependency-closure expansion plus a dangling-pin guard to stay installable: this design
 * removes the reason that machinery existed. `findDanglingPins` (dangling-pins.mjs) stays
 * as the guard for the paths that publish a subset: `mode=missing` backfills.
 *
 * `applyTrain(pkg)` scopes change-file consumption to one package (publish.yml mode=single:
 * "only this package has real changes this train"); every other package still rides with an
 * alignment entry, and sibling change files survive for a later train.
 */

import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { run as defaultRun } from '../lib/cli.mjs';
import { listPublishablePackages } from './publish-missing.mjs';
import { nextTrainVersion } from './train-version.mjs';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..', '..');

/** Changelog comment for a package that rides a train without a change file of its own: no
 *  code changed, it simply publishes at the train number so every exact pin to it resolves.
 *  Mirrors the manual alignment entries the first CalVer train wrote by hand. git-tag.mjs
 *  recognizes this exact entry to keep alignment-only packages out of the train's
 *  aggregate GitHub release notes. */
export const ALIGNMENT_COMMENT = 'chore: align with CalVer lockstep trains: no code change this train';

/** Change-file type → CHANGELOG section title, in render order. The titles match what
 *  Rush wrote for the pre-CalVer history, so one changelog reads as one format. */
const SECTIONS = [
  ['major', 'Major changes'],
  ['minor', 'Minor changes'],
  ['patch', 'Patches'],
];

/**
 * Relative paths (e.g. "@vielzeug/ore/agent_123.json") of every pending change file. Rush
 * groups these under a directory per full scoped package name, which: because the name
 * itself contains a "/": is really two nested directory levels (@vielzeug/ore), so this
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

/** Best-effort HEAD sha for changelog entry provenance: absent in tests and any repo
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
 * `{ changedPackages, riders, train }`. Every publishable package rides: `changedPackages`
 * is the full publish set (every package, in sorted order), and `riders` names the packages
 * with real change entries: the ones worth calling out in the train's release notes.
 * With `packageName` (mode=single), only that package's change files are consumed; every
 * other package still rides with an alignment entry, and sibling change files survive for a
 * later train.
 * `dryRun` computes the train and reports what it would do without touching any file :
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

  const riders = [...new Set(consumed.map((relFile) => path.dirname(relFile)))].sort();
  const packages = listPublishablePackages(root);
  const train = nextTrainVersion(packages.map(({ version }) => version), now);
  const changedPackages = packages.map(({ name }) => name).sort();
  if (dryRun) return { changedPackages, riders, train };

  const date = now.toUTCString();
  const commit = headCommit(root, run);

  const touched = stampManifests(packages, train, root);
  for (const name of changedPackages) {
    const { folder } = packages.find((candidate) => candidate.name === name);
    const riderFiles = consumed.filter((relFile) => path.dirname(relFile) === name);
    const comments =
      riderFiles.length > 0
        ? collectComments(riderFiles, changesDir)
        : { patch: [{ author: 'release-train', comment: ALIGNMENT_COMMENT }] }; // rides without a change file of its own

    updateMarkdownChangelog(path.join(root, folder, 'CHANGELOG.md'), name, train, date, comments);
    updateJsonChangelog(path.join(root, folder, 'CHANGELOG.json'), name, train, date, comments, commit);
    touched.push(path.join(root, folder, 'CHANGELOG.md'), path.join(root, folder, 'CHANGELOG.json'));

    for (const relFile of riderFiles) {
      rmSync(path.join(changesDir, relFile));
    }
  }

  run('git', ['add', ...touched, 'common/changes'], { cwd: root });
  run('git', ['commit', '-m', `chore: apply release train ${train}`], { cwd: root, inherit: true });

  return { changedPackages, riders, train };
}
