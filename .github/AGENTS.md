# `.github/`: CI/CD

Workflow YAML is glue. Every non-trivial release operation is a plain Node module under
[`scripts/release/`](../scripts/release) with its own tests (`pnpm vitest run scripts/release`);
`scripts/release/cli.mjs` is the single entrypoint workflows call. Debug release failures there,
not in the YAML.

## Workflows

| File                         | Trigger                 | Does                                                                                                                                                          |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workflows/ci.yml`           | push `main`, PR         | Build, test (coverage on push), demos, REPL examples, docs build; lint and structure validators; `rush change --verify` on PRs.                                 |
| `workflows/deploy-docs.yml`  | push `main`, dispatch   | Builds packages, docs and demos, deploys to GitHub Pages.                                                                                                     |
| `workflows/publish.yml`      | dispatch                | **The only workflow that publishes.** `mode=single`/`all` apply the CalVer release train (lockstep stamp + changelog entry for every package: full-family publishing: see `RELEASE.md`), push, then publish the whole family as a matrix via `_publish-one.yml` and create the train's single aggregate GitHub release; `mode=missing` backfills released-but-unpublished versions (subset publish guarded by dangling-pins.mjs). `dry-run` input. |
| `workflows/_publish-one.yml` | `workflow_call`         | Publish + git tag for one package (the matrix body). The train's aggregate GitHub release is created by publish.yml's `train-release` job, not per package.                             |
| `workflows/release.yml`      | dispatch                | Git tags + GitHub release only, for versions published via `pnpm release:publish-local` (which never tags). Scans for "on npm, not yet tagged", tags each, then creates the train's aggregate release; no inputs besides `dry-run`. |
| `actions/setup/`             | composite               | Node (`.nvmrc`), pnpm (`package.json#packageManager`), caches, `rush install`, root `pnpm install`. Inputs let a job skip installs it doesn't need; `trusted-publishing` pins npm for OIDC. |

Dispatched production workflows refuse to run off `main`.

## Invariants (read before touching publishing)

1. **`publish.yml` is the only Trusted Publisher filename.** npm allows one Trusted Publisher
   config per package and validates the *triggering* workflow's filename, not the reusable
   workflow that runs `npm publish`. Splitting a publish mode into another dispatchable file
   silently breaks OIDC (`ENEEDAUTH`) for whatever isn't registered. Never register
   `_publish-one.yml` or `release.yml`.
2. **No `NPM_TOKEN`, no `registry-url` in `setup-node`, no `.npmrc` auth line.** Any auth
   configuration makes npm skip OIDC (`actions/setup-node#1440`). The root `.npmrc`'s
   `registry=` line is all npm needs.
3. **npm is pinned to 11 for publishing** (`actions/setup/` `trusted-publishing` input) because
   npm 12.0.0 ships without `sigstore` (`npm/cli#9722`). Remove the pin once Node 22's bundled
   npm is a fixed 12.x.
4. **Publish approval is held in one place:** the `npm-publish` GitHub Environment (required
   reviewers). `publish.yml`'s single `gate` job declares it once per train and the publish
   matrix `needs` it, so a full-family train is one approval, not one per package; the matrix
   jobs deliberately do NOT declare the environment. `mode=missing` is a single job and declares
   the environment directly (still one approval). Keep it that way: re-declaring the environment
   on each matrix job reintroduces ~40 approval prompts per train.
5. **Rush does not run npm `pre*`/`post*` hooks.** Anything a package build needs must be in its
   `build` script itself (see `@vielzeug/codex`).

## Local use

```bash
node scripts/release/cli.mjs                          # list subcommands
DRY_RUN=1 node scripts/release/cli.mjs publish @vielzeug/ore 1.2.3 packages/ore
node scripts/release/cli.mjs changed-packages         # packages with a pending change file
DRY_RUN=1 pnpm release:publish-local                  # what mode=missing would publish, from a laptop
pnpm ci:local                                         # run ci.yml under act (see .actrc)
```

`pnpm release:publish-local` is the human-at-a-terminal fallback when `publish.yml` itself
can't run. Its header comment (`scripts/release/local-publish.mjs`) and
`scripts/release/npm-publish.mjs` cover npm auth, `--otp`, `--interactive` (WebAuthn) and why
you want an Automation/Granular token for more than a package or two. Tag afterwards by
dispatching `release.yml`.

`act` runs `ci.yml` well; treat it as a smoke test only for `publish.yml` (reusable-workflow
and matrix support lag GitHub's, and `workflow_dispatch` inputs need `-e event.json`).
