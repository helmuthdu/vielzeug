/**
 * Plan for `release.yml`: every non-private @vielzeug/* package whose current
 * package.json version is already on npm (published some other way: typically `pnpm
 * release:publish-local`, see that script's header comment) but doesn't have a git tag yet.
 *
 * Mirrors `release-plan.mjs`'s "filter before building the matrix" shape so the Actions UI
 * only ever shows real tagging work, not a "skipped" entry per already-tagged package. The
 * train's single aggregate GitHub release is created once by `git-tag.mjs`'s
 * createTrainRelease(), not per matrix entry.
 */

import { versionExists } from './npm-version-exists.mjs';
import { listPublishablePackages } from './publish-missing.mjs';
import { tagExists } from './git-tag.mjs';

export async function planTagReleases(
  root,
  { checkTag = tagExists, checkVersion = versionExists, list = listPublishablePackages } = {},
) {
  const plan = [];

  for (const { folder, name, version } of list(root)) {
    if (!(await checkVersion(name, version))) continue; // not on npm yet: nothing to release
    if (checkTag(`${name}@${version}`)) continue; // already tagged/released

    plan.push({ folder, package: name, version });
  }

  return plan;
}
