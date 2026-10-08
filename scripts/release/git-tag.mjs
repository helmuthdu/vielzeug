/**
 * Git tags and the aggregate GitHub release for a release train.
 *
 * Under full-family lockstep (apply-train.mjs), every package rides every train, so a
 * per-package GitHub release would bury the release page under dozens of no-op entries each
 * train. Instead: every published package still gets its own git tag (`@vielzeug/<pkg>@<ver>`,
 * the anchor the CHANGELOG deep-links point at), and the train gets exactly ONE GitHub release
 * named for the train number, whose notes call out only the packages that actually changed.
 *
 * Refuses to overwrite an existing tag rather than force-tagging over it: a tag that already
 * exists means this version was published without ever being tagged, or this release ran
 * twice, and either way that's a bug worth surfacing loudly instead of silently rewriting.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { run as sharedRun } from '../lib/cli.mjs';
import { ALIGNMENT_COMMENT } from './apply-train.mjs';
import { listPublishablePackages } from './publish-missing.mjs';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..', '..');

// This module's every real call is meant to be seen live (git/gh output, prompts): inherit
// stdio by default instead of the shared run()'s default of capturing it.
function defaultRun(cmd, args, options) {
  return sharedRun(cmd, args, { inherit: true, ...options });
}

export function tagExists(tag, { run = defaultRun } = {}) {
  try {
    run('git', ['rev-parse', tag], { quiet: true });
    return true;
  } catch {
    return false;
  }
}

/** Tag one published package version and push the tag. No GitHub release: the train gets a
 *  single aggregate release (createTrainRelease), not one per package. */
export function tagPackage({ dryRun = false, package: pkg, run = defaultRun, version }) {
  const tag = `${pkg}@${version}`;

  if (dryRun) {
    console.log(`[dry-run] would tag ${tag}`);
    return;
  }

  if (tagExists(tag, { run })) {
    throw new Error(
      `Tag ${tag} already exists: refusing to overwrite it. This means this version was published without ever ` +
        `being tagged, or this release ran twice; investigate before retagging by hand.`,
    );
  }

  run('git', ['tag', tag]);
  run('git', ['push', 'origin', tag]);
}

/**
 * The packages that genuinely changed at `version`: those whose CHANGELOG.json entry for it
 * carries a comment other than the alignment placeholder. A package whose only entry is the
 * alignment comment rode the train for pin-resolution, not for a change worth a release note.
 */
export function trainRiders(version, { list = listPublishablePackages, root = repoRoot } = {}) {
  const riders = [];
  for (const { folder, name } of list(root)) {
    const file = path.join(root, folder, 'CHANGELOG.json');
    if (!existsSync(file)) continue;

    const log = JSON.parse(readFileSync(file, 'utf8'));
    const entry = (log.entries ?? []).find((candidate) => candidate.version === version);
    if (!entry) continue;

    const comments = Object.values(entry.comments ?? {}).flat();
    const realChange = comments.some(({ comment }) => comment !== ALIGNMENT_COMMENT);
    if (realChange) riders.push(name);
  }
  return riders.sort();
}

function trainReleaseNotes({ train, riders }) {
  const server = process.env.GITHUB_SERVER_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  const changed = riders.length
    ? riders.map((name) => `- \`${name}\` (see its CHANGELOG for ${train})`).join('\n')
    : '_No package changed this train: alignment-only release._';

  return `# Release train ${train}

Every \`@vielzeug/*\` package published at \`${train}\`. Install any of them at this version:

    npm install @vielzeug/<package>@${train}

## Packages that changed

${changed}

Read each changed package's CHANGELOG and \`migration.md\` before upgrading. The full family
shares this one version number: upgrade every \`@vielzeug/*\` dependency to \`${train}\` together.
${server && repo ? `\nPer-package tags: \`${server}/${repo}/tags\` (e.g. \`@vielzeug/ore@${train}\`).` : ''}
`;
}

/**
 * Create the single GitHub release for a train: tag the train number, push it, and open one
 * release whose notes list the packages that actually changed. `version` defaults to the
 * current stamped train (every publishable manifest carries it). Idempotent on the tag: a
 * train already tagged is skipped rather than re-released.
 */
export function createTrainRelease({
  dryRun = false,
  list = listPublishablePackages,
  riders,
  root = repoRoot,
  run = defaultRun,
  version,
} = {}) {
  const train = version ?? list(root)[0]?.version;
  if (!train) throw new Error('No publishable package found: nothing to release.');

  const changed = riders ?? trainRiders(train, { list, root });

  if (dryRun) {
    console.log(`[dry-run] would create train release ${train} (${changed.length} package(s) changed)`);
    return;
  }

  if (tagExists(train, { run })) {
    console.log(`⚠️  Train tag ${train} already exists: skipping the aggregate release`);
    return;
  }

  run('git', ['tag', train]);
  run('git', ['push', 'origin', train]);

  const notesPath = path.join(tmpdir(), `release-notes-${process.pid}.md`);
  writeFileSync(notesPath, trainReleaseNotes({ train, riders: changed }));
  try {
    run('gh', ['release', 'create', train, '--title', `Release train ${train}`, '--notes-file', notesPath]);
  } finally {
    unlinkSync(notesPath);
  }
}
