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
