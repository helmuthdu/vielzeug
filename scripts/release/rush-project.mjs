/**
 * Look up a Rush project's folder and current package.json version by package name.
 *
 * Centralizes what used to be three slightly-different `node -e "require('./rush.json')..."`
 * one-liners inline in release workflow YAML — including one that threw an unhelpful
 * `Cannot read properties of undefined` on a typo'd package name instead of a clear error.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..', '..');

export function listProjectNames(root = repoRoot) {
  const rush = JSON.parse(readFileSync(path.join(root, 'rush.json'), 'utf8'));
  return (rush.projects ?? []).map((project) => project.packageName);
}

export function findProject(packageName, root = repoRoot) {
  const rush = JSON.parse(readFileSync(path.join(root, 'rush.json'), 'utf8'));
  const project = rush.projects?.find((p) => p.packageName === packageName);

  if (!project) {
    throw new Error(`Unknown package: ${packageName}\n\nValid packages:\n${listProjectNames(root).join('\n')}`);
  }

  const pkgJson = JSON.parse(readFileSync(path.join(root, project.projectFolder, 'package.json'), 'utf8'));
  return { folder: project.projectFolder, version: pkgJson.version };
}
