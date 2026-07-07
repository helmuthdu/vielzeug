/**
 * Manual local fallback for `publish-missing.yml` — for the case CI itself can't run (registry
 * outage recovery aside, most commonly: the `publish-missing` workflow is broken, GitHub Actions
 * is down, or someone needs a version on npm right now and can't wait for a dispatch + required
 * reviewer approval). Publishes every `@vielzeug/*` package whose current `package.json` version
 * isn't on npm yet — same logic as CI, via the same tested `publishMissing()` (see
 * `publish-missing.mjs`), not a second implementation.
 *
 * Usage:
 *   node scripts/release/local-publish.mjs [--dry-run] [--skip-build] [--yes] [--otp=<code>]
 *
 * ## Read this before running it
 *
 * CI never authenticates with a token — it relies entirely on npm Trusted Publishing (OIDC),
 * which only exists inside a GitHub Actions runner (see `npm-publish.mjs` for the full
 * explanation). There is no OIDC identity on your laptop, so this script requires you to already
 * be logged in as an npm user/token with publish rights on every `@vielzeug/*` package.
 *
 * **Use an Automation token or a Granular Access Token, not a browser/password `npm login`
 * session, if your account has 2FA-for-writes enabled.** A password-session publish under
 * 2FA-for-writes demands a fresh one-time password on *every single* `npm publish` call
 * (`EOTP`) — a TOTP code expires in ~30s, so that's a hard blocker for publishing more than one
 * or two packages in a run, not something `--otp` below meaningfully fixes at scale. Both token
 * types are npm's own sanctioned way to publish without an OTP prompt even with 2FA-for-writes
 * on: npmjs.com → Account → Access Tokens → Generate New Token → "Automation" (classic), or a
 * Granular Access Token scoped to the `@vielzeug` packages with read/write. Put it in your user
 * `~/.npmrc` as `//registry.npmjs.org/:_authToken=<token>` (or export `NODE_AUTH_TOKEN`/set it
 * via `npm config set`) — do not commit it anywhere.
 *
 * `--otp=<code>` exists only for the one-or-two-package manual case where you'd rather not set
 * up a token. It is applied to every package in this run, so it will start failing with `EOTP`
 * again partway through anything larger — re-run with a fresh code for whatever's left.
 *
 * If any `@vielzeug/*` package has "Require trusted publishing" enabled on npmjs.com, npm
 * rejects a token-based publish for it outright — no flag here can work around that. You'd need
 * to temporarily relax that setting on npmjs.com yourself before a local publish of that
 * specific package can succeed; this script does not attempt to detect or change it.
 *
 * This intentionally does **not** tag or create GitHub releases (same as `publish-missing` in
 * CI) — a tag pushed from a local clone that's behind `main` is a worse failure mode than a
 * missing tag. After a successful run, create each tag from an up-to-date `main` yourself:
 *
 *   git tag @vielzeug/<pkg>@<version> && git push origin @vielzeug/<pkg>@<version>
 *   gh release create @vielzeug/<pkg>@<version> --generate-notes
 */

import { createInterface } from 'node:readline';

import { isMain, parseArgs, run as defaultRun } from '../lib/cli.mjs';
import { publishMissing, summaryMarkdown } from './publish-missing.mjs';

/** Fails fast with a clear message instead of letting every package fail publish one by one. */
export function checkNpmAuth({ run = defaultRun } = {}) {
  try {
    run('npm', ['whoami']);
    return true;
  } catch {
    return false;
  }
}

export function buildAllPackages({ run = defaultRun } = {}) {
  run('node', ['common/scripts/install-run-rush.js', 'build', '--verbose'], { inherit: true });
}

export function confirm(question, { readline = createInterface } = {}) {
  const rl = readline({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

export async function runLocalPublish({
  build = buildAllPackages,
  checkAuth = checkNpmAuth,
  confirmFn = confirm,
  dryRun = false,
  otp,
  publish = publishMissing,
  skipBuild = false,
  yes = false,
} = {}) {
  if (!dryRun && !checkAuth()) {
    throw new Error(
      'Not logged in to npm (`npm whoami` failed). Run `npm login` with an account that has publish ' +
        'rights on every @vielzeug/* package, then re-run this script.',
    );
  }

  if (!skipBuild) {
    console.log('📦 Building all packages (rush build)...');
    build();
  }

  if (!dryRun && !yes) {
    const ok = await confirmFn(
      'This will publish every unpublished @vielzeug/* version to the real npm registry. Continue?',
    );
    if (!ok) {
      console.log('Aborted — nothing was published.');
      return { failed: [], published: [], skipped: [] };
    }
  }

  const results = await publish(undefined, { dryRun, interactive: true, otp });
  console.log(`\n${summaryMarkdown(results)}`);

  if (results.published.length > 0) {
    console.log(
      'Note: this did not create git tags or GitHub releases (see the header comment in this file). ' +
        'Tag each published version from an up-to-date main branch yourself.',
    );
  }

  return results;
}

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));

  runLocalPublish({
    dryRun: process.env.DRY_RUN === '1' || Boolean(flags['dry-run']),
    otp: flags.otp,
    skipBuild: Boolean(flags['skip-build']),
    yes: Boolean(flags.yes),
  }).then(
    (results) => {
      if (results.failed.length > 0) process.exitCode = 1;
    },
    (error) => {
      console.error(error); // not error.message — this is the terminal fatal-error path, keep any cause chain
      process.exitCode = 1;
    },
  );
}
