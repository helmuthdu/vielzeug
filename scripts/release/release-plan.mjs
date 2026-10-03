/**
 * The publish plan publish.yml turns directly into a matrix: every named package whose
 * current version is not yet on npm. Callers pass the packages with pending change files
 * (the train's riders), so the plan is "riders not already published".
 *
 * Filtering "already published" here: once, before the matrix is built, rather than inside
 * each matrix job keeps the matrix itself an accurate list of real work: no phantom "skipped"
 * job entries cluttering the Actions UI for a 30-package run where only 2 packages changed.
 */

import { versionExists } from './npm-version-exists.mjs';
import { findProject } from './rush-project.mjs';

export async function planReleases(packageNames, { checkVersion = versionExists, resolve = findProject } = {}) {
  const plan = [];

  for (const pkg of packageNames) {
    const { folder, version } = resolve(pkg);
    if (await checkVersion(pkg, version)) continue; // already published
    plan.push({ folder, package: pkg, version });
  }

  return plan;
}
