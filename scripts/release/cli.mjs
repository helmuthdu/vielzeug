#!/usr/bin/env node
/**
 * Single entrypoint for every release/publish operation CI runs. Workflow YAML only ever
 * calls `node scripts/release/cli.mjs <subcommand> ...` — the actual logic (and all of its
 * tests) lives in the sibling modules this file imports. One CLI surface instead of N flat
 * scripts is what makes "how do I run a release step locally" a one-command answer instead of
 * "which of these eight files do I need."
 *
 * Every subcommand that touches the registry, git, or GitHub honors `DRY_RUN=1` in the
 * environment: it still does real, read-only work (packing a tarball, resolving versions) but
 * skips `npm publish` / `git push` / `gh release create`, printing what it would have done.
 *
 * Subcommands:
 *   changed-packages                        list packages with a pending change file
 *   project <pkg>                           print folder=/version= for one package
 *   versions <pkg...>                       print pkg=version for each package (pre-bump snapshot)
 *   apply [pkg]                             apply pending rush version bump(s)
 *   plan --before-file <path> <pkg...>      print a JSON publish plan (for a matrix)
 *   publish <pkg> <version> <folder>        publish + tag + release one package
 *   publish-missing                         backfill any @vielzeug/* version missing from npm
 */

import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { publishPackage } from './npm-publish.mjs';
import { versionExists } from './npm-version-exists.mjs';
import { publishMissing, summaryMarkdown } from './publish-missing.mjs';
import { planReleases } from './release-plan.mjs';
import { applyVersionBump, listChangedPackageNames } from './rush-publish-apply.mjs';
import { findProject, listProjectNames } from './rush-project.mjs';
import { tagAndRelease } from './tag-and-release.mjs';

const dryRun = process.env.DRY_RUN === '1';

function parseVersionsBeforeFile(filePath) {
  const versions = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const [pkg, version] = line.split('=');
    if (pkg && version) versions[pkg] = version.trim();
  }
  return versions;
}

async function main([command, ...args]) {
  switch (command) {
    case 'changed-packages': {
      const packages = listChangedPackageNames();
      if (packages.length === 0) {
        throw new Error("No pending change files found. Run 'rush change' for each package, commit, then re-trigger.");
      }
      console.log(packages.join(' '));
      return;
    }

    case 'project': {
      const [pkg] = args;
      if (!listProjectNames().includes(pkg)) throw new Error(`Unknown package: ${pkg}\n\nValid packages:\n${listProjectNames().join('\n')}`);
      const { folder, version } = findProject(pkg);
      console.log(`folder=${folder}\nversion=${version}`);
      return;
    }

    case 'versions': {
      for (const pkg of args) console.log(`${pkg}=${findProject(pkg).version}`);
      return;
    }

    case 'apply': {
      const [pkg] = args;
      applyVersionBump(pkg);
      return;
    }

    case 'plan': {
      const beforeFileIndex = args.indexOf('--before-file');
      if (beforeFileIndex === -1) throw new Error('Usage: plan --before-file <path> <pkg...>');
      const versionsBefore = parseVersionsBeforeFile(args[beforeFileIndex + 1]);
      const packages = args.filter((_, i) => i !== beforeFileIndex && i !== beforeFileIndex + 1);
      const plan = await planReleases(packages, versionsBefore);
      console.log(JSON.stringify(plan));
      return;
    }

    case 'publish': {
      const [pkg, version, folder] = args;
      if (await versionExists(pkg, version)) {
        console.log(`⚠️  ${pkg}@${version} already on npm — skipping`);
        return;
      }
      await publishPackage(folder, { dryRun });
      tagAndRelease({ dryRun, folder, package: pkg, version });
      console.log(`✅ Published ${pkg}@${version}`);
      return;
    }

    case 'publish-missing': {
      const results = await publishMissing(undefined, { dryRun });
      console.log(`\n${summaryMarkdown(results)}`);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summaryMarkdown(results)}\n`);
      if (results.failed.length > 0) process.exitCode = 1;
      return;
    }

    default:
      throw new Error(`Unknown subcommand: ${command ?? '(none)'}`);
  }
}

export { main };

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
