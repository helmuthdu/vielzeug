#!/usr/bin/env node
/**
 * Single entrypoint for every release/publish operation CI runs. Workflow YAML only ever
 * calls `node scripts/release/cli.mjs <subcommand> ...`: the actual logic (and all of its
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
 *   apply [pkg]                             apply pending change files as a CalVer lockstep
 *                                            train: stamp every manifest, changelog changed
 *                                            packages, consume their change files, commit
 *   plan <pkg...>                           print a JSON publish plan (for a matrix)
 *   publish <pkg> <version> <folder> [--otp=<code>] [--interactive]   publish + tag + release one package
 *   publish-missing [--otp=<code>] [--interactive]                    backfill any @vielzeug/* version missing from npm
 *   tag-release <pkg> <version> <folder>    tag + GitHub release only: no `npm publish` (the
 *                                            version must already exist on npm, e.g. published
 *                                            via `pnpm release:publish-local`)
 *   release-plan                            print a JSON tag+release plan (release.yml's matrix):
 *                                            every publishable package whose
 *                                            current version is on npm but not yet tagged
 *
 * `publish` and `publish-missing` take two flags relevant only when running this locally
 * rather than in CI (CI never needs either: see `npm-publish.mjs` for why):
 *   --otp=<code>    for a TOTP-authenticator account, a one-off retry only: the code expires
 *                   in ~30s, so it doesn't scale to publishing many packages in one run.
 *   --interactive   for a WebAuthn/passkey account, where npm opens a browser tab to approve
 *                   the publish instead of asking for a code: requires a real terminal (shares
 *                   this process's stdio with npm) and disables automatic E409 retry.
 * Either way, for more than one or two packages use an npm Automation token or Granular Access
 * Token instead: see `scripts/release/local-publish.mjs`.
 */

import { appendFileSync } from 'node:fs';

import { isMain, parseArgs } from '../lib/cli.mjs';
import { publishPackage } from './npm-publish.mjs';
import { versionExists } from './npm-version-exists.mjs';
import { publishMissing, summaryMarkdown } from './publish-missing.mjs';
import { planTagReleases } from './release-only-plan.mjs';
import { planReleases } from './release-plan.mjs';
import { applyTrain, listChangedPackageNames } from './apply-train.mjs';
import { findProject, listProjectNames } from './rush-project.mjs';
import { tagAndRelease } from './tag-and-release.mjs';

async function main(argv) {
  const { flags, positionals } = parseArgs(argv);
  const [command, ...args] = positionals;
  const dryRun = process.env.DRY_RUN === '1'; // read per-call, not at import time: see scripts/AGENTS.md

  switch (command) {
    case 'changed-packages': {
      const packages = listChangedPackageNames();
      if (packages.length === 0) {
        throw new Error('No pending change files found. Write one with scripts/rush-change.mjs, commit, then re-trigger.');
      }
      console.log(packages.join(' '));
      return;
    }

    case 'project': {
      const [pkg] = args;
      if (!listProjectNames().includes(pkg))
        throw new Error(`Unknown package: ${pkg}\n\nValid packages:\n${listProjectNames().join('\n')}`);
      const { folder, version } = findProject(pkg);
      console.log(`folder=${folder}\nversion=${version}`);
      return;
    }

    case 'apply': {
      const [pkg] = args;
      const { changedPackages, train } = applyTrain(pkg, { dryRun });
      console.log(
        `${dryRun ? '[dry-run] would apply' : 'Applied'} release train ${train}: changelog for: ${changedPackages.join(', ')}`,
      );
      return;
    }

    case 'plan': {
      const plan = await planReleases(args);
      console.log(JSON.stringify(plan));
      return;
    }

    case 'publish': {
      const [pkg, version, folder] = args;
      if (await versionExists(pkg, version)) {
        console.log(`⚠️  ${pkg}@${version} already on npm: skipping`);
        return;
      }
      await publishPackage(folder, { dryRun, interactive: Boolean(flags.interactive), otp: flags.otp });
      tagAndRelease({ dryRun, folder, package: pkg, version });
      console.log(dryRun ? `[dry-run] validated ${pkg}@${version}` : `✅ Published ${pkg}@${version}`);
      return;
    }

    case 'tag-release': {
      const [pkg, version, folder] = args;
      if (!(await versionExists(pkg, version))) {
        throw new Error(
          `${pkg}@${version} not found on npm: this command only tags and creates a GitHub release for a ` +
            `version already published (e.g. via 'pnpm release:publish-local'). Publish it first, then re-run.`,
        );
      }
      tagAndRelease({ dryRun, folder, package: pkg, version });
      console.log(`✅ Tagged and released ${pkg}@${version} (no npm publish: already on npm)`);
      return;
    }

    case 'release-plan': {
      const plan = await planTagReleases();
      console.log(JSON.stringify(plan));
      return;
    }

    case 'publish-missing': {
      const results = await publishMissing(undefined, {
        dryRun,
        interactive: Boolean(flags.interactive),
        otp: flags.otp,
      });
      console.log(`\n${summaryMarkdown(results)}`);
      if (process.env.GITHUB_STEP_SUMMARY)
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summaryMarkdown(results)}\n`);
      if (results.failed.length > 0) process.exitCode = 1;
      return;
    }

    default:
      throw new Error(`Unknown subcommand: ${command ?? '(none)'}`);
  }
}

export { main };

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error); // not error.message: several subcommands wrap a real cause, and this is the terminal fatal-error path
    process.exitCode = 1;
  });
}
