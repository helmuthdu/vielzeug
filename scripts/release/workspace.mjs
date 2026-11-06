/**
 * Look up a workspace package's folder and current package.json version by package name.
 *
 * The package registry is the filesystem: every directory under `packages/` with a
 * parseable package.json is a workspace package (Bun's `workspaces` glob in the root
 * manifest says the same thing). There is no second registry to keep in sync.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..', '..');

function readManifests(root) {
  const packagesDir = path.join(root, 'packages');
  const found = [];

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const folder = `packages/${entry.name}`;
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(path.join(root, folder, 'package.json'), 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') continue; // half-scaffolded package directory
      throw new Error(`${folder}/package.json: ${err.message}`);
    }

    if (typeof pkg.name !== 'string') continue;
    found.push({ folder, name: pkg.name, private: Boolean(pkg.private), version: pkg.version });
  }

  return found.sort((a, b) => a.name.localeCompare(b.name));
}

/** Every workspace package as `{ folder, name, private, version }`, sorted by name. */
export function listWorkspacePackages(root = repoRoot) {
  return readManifests(root);
}

/** Every workspace package name, sorted. */
export function listProjectNames(root = repoRoot) {
  return readManifests(root).map(({ name }) => name);
}

/** `{ folder, version }` for one package, or a clear error listing every valid name. */
export function findProject(packageName, root = repoRoot) {
  const project = readManifests(root).find((entry) => entry.name === packageName);

  if (!project) {
    throw new Error(`Unknown package: ${packageName}\n\nValid packages:\n${listProjectNames(root).join('\n')}`);
  }

  return { folder: project.folder, version: project.version };
}
