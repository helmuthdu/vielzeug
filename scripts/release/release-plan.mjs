/**
 * The publish plan publish.yml turns directly into a matrix: every named package whose
 * current version is not yet on npm. Under full-family lockstep the caller passes every
 * publishable package (the whole train); a narrowed call passes an explicit subset.
 *
 * Filtering "already published" here, once before the matrix is built rather than inside
 * each matrix job, keeps the matrix itself an accurate list of real work: no phantom
 * "skipped" job entries cluttering the Actions UI for a 40-package train.
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
