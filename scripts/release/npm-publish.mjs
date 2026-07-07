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
 *
 * ## EOTP / browser-trust prompts when running this outside CI
 *
 * A browser/password `npm login` session with 2FA-for-writes enabled needs a fresh step-up
 * auth on *every* `npm publish` call — either a typed OTP (TOTP authenticator accounts) or npm
 * opening a browser tab to approve the device (WebAuthn/passkey accounts). The `otp` option
 * below only covers the first kind, and only for a one-or-two-package manual run — a TOTP code
 * expires in ~30s, so it doesn't scale. For bulk local publishing, use an npm Automation token
 * or a Granular Access Token instead of a browser-login session — both are designed by npm to
 * publish without any step-up prompt even with 2FA-for-writes enabled. See
 * `scripts/release/local-publish.mjs` for the exact setup.
 *
 * The WebAuthn/browser-trust flow specifically requires npm's own subprocess to see a real
 * TTY on stdout to decide it's safe to open a browser and wait for the approval — the default
 * `run()` below captures output through plain OS pipes (needed so CI can parse E409 conflicts
 * and this module never has to guess at npm's error wording), which look like a non-interactive
 * context to npm and make it fail straight to `EOTP` instead of opening a browser. Pass
 * `interactive: true` (only meaningful for a human at a real terminal, e.g.
 * `local-publish.mjs`) to run the publish step with `stdio: 'inherit'` so npm shares the
 * caller's actual terminal and can do the browser-trust dance — the tradeoff is no captured
 * output for that call, so no automatic E409 retry; just re-run by hand on a conflict.
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

export async function publishPackage(
  folder,
  { dryRun = false, interactive = false, otp, run = defaultRun, sleep = defaultSleep } = {},
) {
  const [{ filename }] = JSON.parse(run('npm', ['pack', '--json'], { cwd: folder }));
  const tarballPath = path.join(folder, filename);
  const publishArgs = ['publish', filename, '--access', 'public', ...(otp ? [`--otp=${otp}`] : [])];

  try {
    if (dryRun) {
      console.log(`[dry-run] packed ${filename} — would run \`npm publish --access public\``);
      return;
    }

    if (interactive) {
      // No captured output here (stdio is inherited, not piped) — so no E409 retry loop either;
      // npm's own prompts (including a browser-trust tab) go straight to the real terminal.
      run('npm', publishArgs, { cwd: folder, stdio: 'inherit' });
      return;
    }

    for (let attempt = 0; ; attempt++) {
      try {
        process.stdout.write(run('npm', publishArgs, { cwd: folder }));
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
