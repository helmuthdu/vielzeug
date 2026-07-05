/**
 * Diff each changed package's current version against its pre-bump snapshot and drop anything
 * already on npm, producing the plan release-all.yml turns directly into a matrix.
 *
 * Filtering "already published" here — once, before the matrix is built — rather than inside
 * each matrix job keeps the matrix itself an accurate list of real work: no phantom "skipped"
 * job entries cluttering the Actions UI for a 30-package run where only 2 packages changed.
 */

import { versionExists } from './npm-version-exists.mjs';
import { findProject } from './rush-project.mjs';

export async function planReleases(packageNames, versionsBefore, { checkVersion = versionExists, resolve = findProject } = {}) {
  const plan = [];

  for (const pkg of packageNames) {
    const { folder, version } = resolve(pkg);
    if (versionsBefore[pkg] === version) continue; // change file present but rush didn't bump it
    if (await checkVersion(pkg, version)) continue; // already published
    plan.push({ folder, package: pkg, version });
  }

  return plan;
}
