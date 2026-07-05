/**
 * Publish every public @vielzeug/* package whose current package.json version isn't on npm
 * yet. A one-off backfill for versions that were bumped and merged but never made it to the
 * registry (e.g. a prior release run failed after the version-bump commit but before
 * publish) — normal releases go through release.yml / release-all.yml instead.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { publishPackage } from './npm-publish.mjs';
import { versionExists } from './npm-version-exists.mjs';

const repoRoot = path.join(fileURLToPath(import.meta.url), '..', '..', '..');

/** Every non-private @vielzeug/* package declared in rush.json, with its current version. */
export function listPublishablePackages(root = repoRoot) {
  const rush = JSON.parse(readFileSync(path.join(root, 'rush.json'), 'utf8'));
  const packages = [];

  for (const project of rush.projects ?? []) {
    const pkgPath = path.join(root, project.projectFolder, 'package.json');
    if (!existsSync(pkgPath)) continue;

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.name?.startsWith('@vielzeug/') || pkg.private) continue;

    packages.push({ folder: project.projectFolder, name: pkg.name, version: pkg.version });
  }
  return packages;
}

export async function publishMissing(
  root = repoRoot,
  { checkVersion = versionExists, dryRun = false, publish = publishPackage } = {},
) {
  const results = { failed: [], published: [], skipped: [] };

  for (const { folder, name, version } of listPublishablePackages(root)) {
    if (await checkVersion(name, version)) {
      results.skipped.push(`${name}@${version}`);
      continue;
    }

    console.log(`\n📦 Publishing ${name}@${version}`);
    try {
      await publish(path.join(root, folder), { dryRun });
      results.published.push(`${name}@${version}`);
    } catch (error) {
      console.error(error.message);
      results.failed.push(`${name}@${version}`);
    }
  }

  return results;
}

export function summaryMarkdown({ failed, published, skipped }) {
  const section = (title, items) => `### ${title}\n${items.length ? items.map((item) => `- ${item}`).join('\n') : '_none_'}\n`;
  return ['## Publish Missing Summary', '', section('Published ✅', published), section('Skipped ℹ️', skipped), section('Failed ❌', failed)].join(
    '\n',
  );
}
