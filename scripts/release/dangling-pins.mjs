/**
 * The check that no packed pin points at a version that will never exist on the registry.
 *
 * A published package pins its `@vielzeug/*` dependencies to an exact version: a train
 * stamps every manifest with the same number, and `resolve-workspace-deps.mjs` rewrites a
 * `workspace:*` edge to the dependency's stamped version. That exact pin is only installable
 * if the dependency is published at that same version.
 *
 * Normal trains are safe by construction: every publishable package rides every train
 * (apply-train.mjs), so every pin resolves by the time the publish matrix runs. This guard
 * exists for the paths that publish a *subset*: `mode=missing` backfills only the versions
 * absent from npm, and a partial batch can pin a dependency that is neither in the batch nor
 * on the registry — the historical `@vielzeug/prism@26.10.2` → `@vielzeug/orbit@26.10.2`
 * breakage, where the stamp existed but nothing ever put that version on npm. `findDanglingPins`
 * turns that gap into a loud release failure instead of a broken consumer install
 * (`YN0082: No candidates found`).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { internalDependencies } from '../lib/packed-package-model.mjs';
import { versionExists } from './npm-version-exists.mjs';
import { listPublishablePackages } from './publish-missing.mjs';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..', '..');

const defaultReadManifest = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** name → { folder, version } for every publishable package, so only real workspace edges are checked. */
function packageIndex(list, root) {
  return new Map(list(root).map(({ folder, name, version }) => [name, { folder, version }]));
}

/**
 * Every dependency pin in `publishSet` that will dangle: the dependency is neither riding this
 * same train (present in `publishSet` at the version it is pinned to) nor already on the
 * registry at that version. `publishSet` entries are `{ package, version }` (a release plan) or
 * `{ name, version }`. A dependency's pin is its own stamped version (lockstep: the same train
 * number), so that is the version checked. Returns `{ dependency, dependencyVersion, package }`
 * for each gap; an empty array means the publish set is self-consistent.
 */
export async function findDanglingPins(
  publishSet,
  { checkVersion = versionExists, list = listPublishablePackages, readManifest = defaultReadManifest, root = repoRoot } = {},
) {
  const publishing = new Map(publishSet.map((entry) => [entry.package ?? entry.name, entry.version]));
  const index = packageIndex(list, root);
  const dangling = [];

  for (const [name] of publishing) {
    const entry = index.get(name);
    if (!entry) continue;

    const manifest = readManifest(path.join(root, entry.folder, 'package.json'));
    for (const dep of internalDependencies(manifest)) {
      const depEntry = index.get(dep);
      if (!depEntry) continue; // not a publishable workspace package: not this train's to publish
      const depVersion = depEntry.version; // a workspace dep pins to its own stamped version
      if (publishing.get(dep) === depVersion) continue; // riding this same train
      if (await checkVersion(dep, depVersion)) continue; // already on the registry

      dangling.push({ dependency: dep, dependencyVersion: depVersion, package: name });
    }
  }

  return dangling;
}
