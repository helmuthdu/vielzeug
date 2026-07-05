/**
 * Pack and publish the package in the given folder, retrying with backoff on registry
 * write conflicts (npm E409 — "a previous publish is still processing").
 *
 * This is the single place `npm publish` is invoked from CI — every release path (single
 * package, bulk matrix, missing-version backfill) goes through this module.
 *
 * Deliberately does NOT try to pattern-match npm's stderr to guess a friendlier error message
 * (E404 vs ENEEDAUTH vs auth misconfiguration) — that guesswork breaks silently whenever npm
 * changes its wording and hides the real, already-clear npm error. Non-conflict failures are
 * surfaced as-is.
 *
 * ## Why there's no npm auth/registry setup anywhere in CI
 *
 * No `NPM_TOKEN` secret exists. Publishing relies entirely on npm's Trusted Publishing (OIDC):
 * npm CLI >= 11.5.1 auto-exchanges the GitHub Actions job's OIDC identity for a short-lived
 * publish token, provided a Trusted Publisher is registered on npmjs.com for that package, this
 * repo, and the exact workflow filename that runs `npm publish` (`_publish-one.yml`) — and
 * provided the caller job has `permissions: id-token: write`.
 *
 * The workflows never write an `.npmrc` auth line for this. `actions/setup-node`'s
 * `registry-url` input always fills `${NODE_AUTH_TOKEN}` with a dummy placeholder value when no
 * token is given (actions/setup-node#1440) — npm reads that non-empty-but-garbage value as "a
 * credential is configured" and skips OIDC entirely, publishing unauthenticated. The fix isn't
 * clearing the placeholder afterwards (an empty `_authToken=` line still counts as "configured"
 * and produces `ENEEDAUTH` instead); it's never calling `actions/setup-node` with `registry-url`
 * at all. The repo-root `.npmrc`'s plain `registry=` line is all npm needs — Node/npm themselves
 * come from `.github/actions/setup`, which only sets `node-version-file`, never `registry-url`.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000];

function defaultRun(cmd, args, options) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...options });
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function publishPackage(folder, { dryRun = false, run = defaultRun, sleep = defaultSleep } = {}) {
  const [{ filename }] = JSON.parse(run('npm', ['pack', '--json'], { cwd: folder }));
  const tarballPath = path.join(folder, filename);

  try {
    if (dryRun) {
      console.log(`[dry-run] packed ${filename} — would run \`npm publish --access public\``);
      return;
    }

    for (let attempt = 0; ; attempt++) {
      try {
        process.stdout.write(run('npm', ['publish', filename, '--access', 'public'], { cwd: folder }));
        return;
      } catch (error) {
        const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
        process.stdout.write(output);

        const isRegistryConflict = output.includes('E409');
        if (!isRegistryConflict || attempt >= RETRY_DELAYS_MS.length) {
          throw new Error(`npm publish failed for ${filename}`);
        }

        const delay = RETRY_DELAYS_MS[attempt];
        console.error(`   registry conflict (E409) — retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
    }
  } finally {
    if (existsSync(tarballPath)) rmSync(tarballPath);
  }
}
