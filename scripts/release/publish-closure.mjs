/**
 * The publish closure: every package a set of packages-to-publish depends on, and the
 * check that no packed pin points at a version that will never exist on the registry.
 *
 * A published package pins its `@vielzeug/*` dependencies to an exact version: a train
 * stamps every manifest with the same number, and `resolve-workspace-deps.mjs` rewrites a
 * `workspace:*` edge to the dependency's stamped version. That exact pin is only installable
 * if the dependency is published at that same version. But a train stamps *every* manifest
 * while publishing only the packages that rode it (a CHANGELOG entry for the version is the
 * gate), so a rider whose dependency skipped the train ships a pin to a version that was
 * never published — the `@vielzeug/prism@26.10.2` → `@vielzeug/orbit@26.10.2` breakage, where
 * orbit was stamped 26.10.2 but had no change file, so nothing ever put 26.10.2 on npm.
 *
 * The rule that makes exact pins safe: **a package's dependencies must ride every train the
 * package rides.** `expandWithWorkspaceDependencies` computes that closure (the transitive
 * `@vielzeug/*` runtime-dependency set); `findDanglingPins` is the belt-and-braces check that
 * every dependency pin in a publish set is either riding the same train or already on the
 * registry, so a gap fails the release loudly instead of surfacing as a broken consumer
 * install (`YN0082: No candidates found`).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { internalDependencies } from '../lib/packed-package-model.mjs';
import { versionExists } from './npm-version-exists.mjs';
import { listPublishablePackages } from './publish-missing.mjs';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..', '..');

const defaultReadManifest = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** name → { folder, version } for every publishable package, so the graph walks only real edges. */
function packageIndex(list, root) {
  return new Map(list(root).map(({ folder, name, version }) => [name, { folder, version }]));
}

/**
 * The transitive closure of `names` over `@vielzeug/*` runtime dependencies: `names` plus
 * everything they depend on, directly or transitively, that is itself a publishable workspace
 * package. Dependencies outside the workspace (private packages, external npm deps) are not
 * traversed — they are not this train's to publish. Returned sorted for a stable plan.
 */
export function expandWithWorkspaceDependencies(
  names,
  { list = listPublishablePackages, readManifest = defaultReadManifest, root = repoRoot } = {},
) {
  const index = packageIndex(list, root);
  const closure = new Set();
  const stack = [...names];

  while (stack.length > 0) {
    const name = stack.pop();
    if (closure.has(name)) continue;
    closure.add(name);

    const entry = index.get(name);
    if (!entry) continue; // not a publishable workspace package: nothing to expand

    const manifest = readManifest(path.join(root, entry.folder, 'package.json'));
    for (const dep of internalDependencies(manifest)) {
      if (index.has(dep)) stack.push(dep);
    }
  }

  return [...closure].sort();
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
