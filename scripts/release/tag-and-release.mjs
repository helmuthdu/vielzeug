/**
 * Tag a published package version and create its GitHub release.
 *
 * Refuses to overwrite an existing tag rather than force-tagging over it — a tag that already
 * exists means this version was published without ever being tagged, or this release ran
 * twice, and either way that's a bug worth surfacing loudly instead of silently rewriting.
 */

import { execFileSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function defaultRun(cmd, args, options) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: 'inherit', ...options });
}

function releaseNotes({ folder, package: pkg, tag, version }) {
  return `## ${pkg} v${version}

### Installation

    npm install ${pkg}@${version}

### Links

- npm: https://www.npmjs.com/package/${pkg}/v/${version}
- CHANGELOG: ${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/blob/${tag}/${folder}/CHANGELOG.md
`;
}

function tagExists(tag, run) {
  try {
    run('git', ['rev-parse', tag], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function tagAndRelease({ dryRun = false, folder, package: pkg, run = defaultRun, version }) {
  const tag = `${pkg}@${version}`;

  if (dryRun) {
    console.log(`[dry-run] would tag and release ${tag}`);
    return;
  }

  if (tagExists(tag, run)) {
    throw new Error(
      `Tag ${tag} already exists — refusing to overwrite it. This means this version was published without ever ` +
        `being tagged, or this release ran twice; investigate before retagging by hand.`,
    );
  }

  run('git', ['tag', tag]);
  run('git', ['push', 'origin', tag]);

  const notesPath = path.join(tmpdir(), `release-notes-${process.pid}.md`);
  writeFileSync(notesPath, releaseNotes({ folder, package: pkg, tag, version }));
  try {
    run('gh', ['release', 'create', tag, '--title', `${pkg} v${version}`, '--generate-notes', '--notes-file', notesPath]);
  } finally {
    unlinkSync(notesPath);
  }
}
