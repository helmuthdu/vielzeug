# Releases: CalVer lockstep trains

Every `@vielzeug/*` package carries the same version: the release train it last shipped on. The number answers *when*, never *how big*: change size lives in the changelog sections and each package's `docs/<name>/migration.md`, not the version.

## The version grammar

`YY.MM.N`: the calendar year and month the train shipped in, plus the train revision. `26.10.0` is October 2026's first train; `26.10.1` its second; November starts fresh at `26.11.0`. There is no major/minor judgment to make: a breaking change rides the next train like any other, and says so in the changelog and migration notes.

This replaces semantic versioning, deliberately. Semver's compat signal was aimed at consumers we don't have: every in-repo consumer (demos, docs, REPL) moves in the same commit as the packages. The compatibility contract for outside consumers is the changelog and `migration.md`, read per train.

## Full-family trains

Every publishable package rides every train: each train stamps every manifest, writes a CHANGELOG entry for every package (real comments for packages with change files, an alignment-only entry for the rest), and publishes the whole family at the train number.

This is what makes exact `@vielzeug/*` dependency pins always resolvable: a consumer on any train gets one consistent version set, every package pinning its deps to the number it carries. Selective publishing was the earlier design and it left stale versions on npm: a consumer mixing `@vielzeug/arsenal@26.10.4` with a dependent last published at `26.10.3` got two nested copies of arsenal, because the dependent's exact pin could not stretch. Under full-family lockstep, `npm i @vielzeug/<pkg>@latest` for any set of packages always dedupes to one version each.

The cost is honest and mechanical: most publishes in a train carry no code change (an alignment entry), and every package's `latest` tag moves each train.

## Releasing a train

1. Land changes. Every publishable package that changed carries a change file:
   `node scripts/rush-change.mjs <pkg> <patch|minor|major> "<message>"`.
   The type only picks the changelog section: it never touches the version.
2. Dispatch the **Publish** workflow (`publish.yml`). It applies the train: stamps every manifest with the train number and writes a CHANGELOG entry for every package (alignment-only where there is no change file), consumes the riders' change files in one commit: then verifies every packed package, publishes the full family as a matrix, tags each published version, and creates the train's single aggregate GitHub release. CI details: `.github/AGENTS.md`.

Dispatching `publish.yml` is the only release path. There is no per-package mode: "only one package changed this train" is already what a train does (that package gets a real changelog entry, everyone else rides alignment-only), and publishing a subset of the family is exactly what lockstep rules out.

If a train's publish matrix fails partway — some packages on npm, others not — re-run the failed publish jobs from the Actions UI: each one skips a version that is already on npm, so a retry only publishes what is still missing. (Re-running the *whole* workflow does not work: the train commit already consumed the change files.)

When Actions itself is unavailable, `pnpm release:publish-local` (`scripts/release/local-publish.mjs`) runs the same backfill from a laptop: it publishes every `@vielzeug/*` version whose CHANGELOG entry exists but which is absent from npm, refuses a package whose dependency pin is neither in the same batch nor already on npm (`dangling-pins.mjs`), and shares the tested `publishMissing()` implementation with the CLI. Afterwards dispatch `release.yml` to land any missing tags and the aggregate release.

## Releases and tags

Each published package version gets its own git tag (`@vielzeug/<pkg>@<version>`: the anchor CHANGELOG deep-links point at), and the train gets exactly **one** GitHub release named for the train number, whose notes list only the packages that actually changed. Per-package GitHub releases would bury the release page under dozens of alignment-only entries per train.

## The epoch train

The first CalVer train (`26.10.0`) was an epoch: every publishable package carried a change file, so all 41 published at the same number and the registry started the new era uniform. Three of those entries (`orbit`, `prism`, `rune`) were alignment-only: "no code change this train". From the first full-family train on, every train is like that by design: alignment entries are written automatically for every package without a change file.

## Consequences

- An npm version is "the train this package last shipped on": which is every train, since every package rides every train. A package's version number tells you *when*, and its changelog entry for that train tells you *whether anything changed*.
- Consumers outside the monorepo should pin exact versions and read the changed packages' `migration.md` when moving between trains. Note what CalVer means for ranges: `^26.10.0` spans *months* (`>=26.10.0 <27.0.0` includes `26.11.x`, `26.12.x`:), and a breaking change rides the next train like any other, so a caret range can silently pull a breaking monthly train. Exact pins are the contract; upgrade deliberately, train by train.
- The docs site and demos always track `main`, the latest train.

## Local use

```sh
node scripts/release/cli.mjs changed-packages      # packages with a pending change file
DRY_RUN=1 node scripts/release/cli.mjs apply       # print the next train number, touch nothing
pnpm release:publish-local                          # laptop fallback, see scripts/release/local-publish.mjs
```
