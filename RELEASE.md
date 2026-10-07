# Releases: CalVer lockstep trains

Every `@vielzeug/*` package carries the same version: the release train it last shipped on. The number answers *when*, never *how big*: change size lives in the changelog sections and each package's `docs/<name>/migration.md`, not the version.

## The version grammar

`YY.MM.N`: the calendar year and month the train shipped in, plus the train revision. `26.10.0` is October 2026's first train; `26.10.1` its second; November starts fresh at `26.11.0`. There is no major/minor judgment to make: a breaking change rides the next train like any other, and says so in the changelog and migration notes.

This replaces semantic versioning, deliberately. Semver's compat signal was aimed at consumers we don't have: every in-repo consumer (demos, docs, REPL) moves in the same commit as the packages. The compatibility contract for outside consumers is the changelog and `migration.md`, read per train.

## Releasing a train

1. Land changes. Every publishable package that changed carries a change file:
   `node scripts/rush-change.mjs <pkg> <patch|minor|major> "<message>"`.
   The type only picks the changelog section: it never touches the version.
2. Dispatch the **Publish** workflow (`publish.yml`) with `mode=all` (or `single` for one package). It applies the train: stamps every manifest with the train number, writes changelog entries for packages with pending change files *and* for the `@vielzeug/*` dependencies they pin (alignment-only, so a published package's exact dependency pin always resolves on npm), consumes the riders' change files in one commit: then verifies packed packages and publishes and tags each package in that publish set. CI details: `.github/AGENTS.md`.
3. `mode=missing` backfills any released-but-unpublished version. A package is a candidate only when its CHANGELOG has an entry for its current version: a lockstep stamp alone never republishes an unchanged package. It refuses to publish a package whose dependency pin is neither in the same batch nor already on npm, so a partial backfill can never ship a dangling pin.

`mode=single` still stamps the whole family (a train is repo-wide by definition) but consumes only the named package's change files; sibling change files survive for their own train. The named package's `@vielzeug/*` dependencies still ride (alignment-only), so publishing one package never leaves it pinning an unpublished version.

## The epoch train

The first CalVer train (`26.10.0`) is an epoch: every publishable package carries a change file, so all 41 publish at the same number and the registry starts the new era uniform. Three of those entries (`orbit`, `prism`, `rune`) are alignment-only: "no code change this train". Since then, alignment entries are printed automatically whenever a published package pins a `@vielzeug/*` dependency that has no change file of its own: a dependency must ride every train its dependents ride, or the dependent's exact pin would point at a version that never reaches npm. So a package skips a train only when nothing that *did* ride the train depends on it.

## Consequences

- An npm version is "the last train in which that package changed, or a dependent did": a package can be republished unchanged (an alignment entry) to keep a dependent's pin resolvable, but it never rides a train that nothing depending on it rides.
- Consumers outside the monorepo should pin exact versions and read the package's `migration.md` when moving between trains. Caret ranges stop at the pre-CalVer history by design: trains you should read about don't flow through `^`.
- The docs site and demos always track `main`, the latest train.

## Local use

```sh
node scripts/release/cli.mjs changed-packages      # packages with a pending change file
DRY_RUN=1 node scripts/release/cli.mjs apply       # print the next train number, touch nothing
pnpm release:publish-local                          # laptop fallback, see scripts/release/local-publish.mjs
```
