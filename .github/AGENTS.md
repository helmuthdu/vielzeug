# `.github/` — CI/CD

Workflow YAML in this directory is glue only. Every non-trivial operation (version bumps, npm
publish, backfills) is a plain Node script under [`scripts/release/`](../scripts/release), each
independently unit-tested (`pnpm test scripts/release`). If you're debugging "why did the
release fail," start in `scripts/release/`, not the YAML.

## Layout

| Path | Purpose |
| --- | --- |
| `actions/setup/` | Composite action: Node, pnpm, Rush install, caches. `root-install`/`rush-install` inputs let callers skip the parts they don't need (e.g. a pure validation step only needs Node). |
| `workflows/ci.yml` | Runs on push to `main`: rebuild + the reusable test/lint workflow. |
| `workflows/test-pr.yml` | Runs on PRs: change-file check + rebuild + the reusable test/lint workflow. |
| `workflows/_test-lint.yml` | Reusable (`workflow_call`) test + lint jobs shared by `ci.yml` and `test-pr.yml`. |
| `workflows/deploy-docs.yml` | Builds and deploys the VitePress docs site to GitHub Pages. |
| `workflows/release.yml` | Manual dispatch: bump + publish **one** package. |
| `workflows/release-all.yml` | Manual dispatch: bump + publish **every** package with a pending change file, as a matrix (one job per package). |
| `workflows/_publish-one.yml` | Reusable (`workflow_call`) single-package publish/tag/release job — the one place `npm publish` runs. Used by both `release.yml` (a single `needs:` job) and `release-all.yml` (a matrix). |
| `workflows/publish-missing.yml` | Manual dispatch: backfill any `@vielzeug/*` version that's in the repo but missing from npm. Low-frequency, sequential — doesn't warrant the matrix treatment. |

## `scripts/release/cli.mjs`

Single entrypoint for every release/publish subcommand. Run `node scripts/release/cli.mjs`
with no arguments to see the list. All subcommands are safe to run locally against your own
checkout — nothing publishes or mutates git unless you run the `publish` / `publish-missing`
subcommands, and those honor a dry run:

```bash
# See what release-all would do, end to end, without touching npm, git tags, or GitHub releases.
DRY_RUN=1 node scripts/release/cli.mjs publish @vielzeug/ore 1.2.3 packages/ore

# Ask "does this package/version already exist on npm?"
node scripts/release/cli.mjs project @vielzeug/ore

# List packages with a pending `rush change` file.
node scripts/release/cli.mjs changed-packages
```

The `release.yml` / `release-all.yml` / `publish-missing.yml` workflows all expose a `dry-run`
workflow_dispatch input that sets `DRY_RUN=1` for you — use it to validate a release plan
(version bump math, packing, matrix contents) before actually approving the publish.

## Publishing requires npm Trusted Publishing (OIDC)

No `NPM_TOKEN` secret exists or is needed. Every publish path relies on npm's
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers) — the workflow's OIDC identity
is exchanged for a short-lived token, provided a Trusted Publisher is registered on npmjs.com
for that exact package + this repo + the calling workflow filename
(`_publish-one.yml` — not `release.yml`/`release-all.yml`, since that's the workflow that
actually runs `npm publish`). See `scripts/release/npm-publish.mjs` for why there's no
"configure npm registry" step anywhere in these workflows: writing an `.npmrc` auth line (even
an empty one) makes npm skip OIDC entirely (`actions/setup-node#1440`).

## Manual local publish fallback

If CI itself can't run `publish-missing.yml` (workflow broken, Actions outage, or a version is
needed on npm before a dispatch + required-reviewer approval can happen), `pnpm
release:publish-local` (`scripts/release/local-publish.mjs`) reuses the exact same
`publishMissing()` logic CI uses — it is a pre-flight-checked wrapper, not a second
implementation. Read the header comment in that file before running it: it requires you to
already have a real npm auth session (OIDC Trusted Publishing only exists inside a GitHub
Actions runner, never on a laptop), and it deliberately does **not** create git tags or GitHub
releases (same as `publish-missing` in CI) — tag manually from an up-to-date `main` afterward.

```bash
DRY_RUN=1 pnpm release:publish-local   # see what would publish, without touching npm
pnpm release:publish-local             # prompts for confirmation, builds, then publishes
pnpm release:publish-local -- --yes --skip-build   # non-interactive prompt, dist/ already fresh
```

`local-publish.mjs` always runs the actual `npm publish` step with this terminal's real stdio
(not piped) — it's a human-at-a-terminal script, and npm's WebAuthn/browser-trust step-up flow
needs that to work at all (see the `EOTP` section below).

**`EOTP` / browser-trust prompts:** a browser/password `npm login` session with 2FA-for-writes
enabled needs fresh step-up auth on every single `npm publish` call — either a typed OTP
(TOTP-authenticator accounts) or npm opening a browser tab to approve the device
(WebAuthn/passkey accounts). This hits `local-publish.mjs` and a plain
`node scripts/release/cli.mjs publish ...` equally, since both eventually call `npm publish`
under your local session. Options, in order of how much this happens to you:

- **TOTP account, one package, right now:** append `--otp=<code>`. Get a fresh code right
  before running the command — it's single-use and expires in ~30s, so build first (or
  `--skip-build` if `dist/` is already fresh), *then* generate the code.
  ```bash
  node scripts/release/cli.mjs publish @vielzeug/ore 1.2.3 packages/ore --otp=123456
  ```
- **WebAuthn/passkey account (npm wants to open a browser, not a code field):** add
  `--interactive`. This makes npm share this process's actual terminal (`stdio: 'inherit'`)
  instead of the piped output CI-parity mode uses — required for npm to detect it can safely
  pop a browser tab and wait for approval. Trade-off: no captured output for that publish call,
  so no automatic E409 retry (just re-run by hand if that happens). `local-publish.mjs` always
  runs this way — it's a script for a human at a terminal, never CI.
  ```bash
  node scripts/release/cli.mjs publish @vielzeug/ore 1.2.3 packages/ore --interactive
  ```
- **More than one package, or repeatedly, either 2FA method:** use an npm Automation token or a
  Granular Access Token instead (npmjs.com → Account → Access Tokens); both publish without any
  step-up prompt even with 2FA-for-writes on. Put it in your user `~/.npmrc` as
  `//registry.npmjs.org/:_authToken=<token>` (or `${NODE_AUTH_TOKEN}` if you export that env var
  yourself — npm does **not** read `NODE_AUTH_TOKEN` on its own outside of GitHub Actions'
  `setup-node`; you must reference it explicitly in `.npmrc` for it to do anything locally). See
  the header comment in `local-publish.mjs` for full detail.

## Manual approval

`release.yml`, `release-all.yml`, and `publish-missing.yml` all gate their actual `npm publish`
step behind the `npm-publish` GitHub Environment (Settings → Environments → npm-publish →
required reviewers). This is the one place "who can publish to npm" is granted — it isn't
scattered across secrets or workflow-level checks.

## Running workflows locally with `act`

[`act`](https://github.com/nektos/act) runs GitHub Actions workflows in local containers. This
repo ships a `.actrc` pinning a compatible runner image, so:

```bash
act -l                        # list every job/workflow act can see (no Docker needed)
pnpm ci:local                 # run ci.yml's build job locally
act -W .github/workflows/_test-lint.yml -j lint    # run just the lint job
```

Caveats:
- `workflow_dispatch` inputs need `-e event.json` (an event payload file) since act can't
  prompt for them interactively.
- Reusable workflows and matrices are visible to `act -l` but act's support for `uses:
  ./.github/workflows/_x.yml` job calls is less mature than GitHub's — treat `act` as a fast
  smoke test for the build/test/lint path, not a full substitute for a real dispatch when
  changing `_publish-one.yml` or the matrix in `release-all.yml`.
- On macOS with Colima, `act` needs Colima's Docker socket reachable at the default location;
  see `act`'s own troubleshooting docs if container start-up fails.
