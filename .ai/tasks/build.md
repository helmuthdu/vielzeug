# Build Task

## Use when

Change package source, tests, tooling, CI, or public behavior.

## Inputs

- `scope`
- `goal`

## Load

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- `.ai/core/conventions.md` when editing package source
- `.ai/data/packages.json` when dependency impact matters
- relevant `AGENTS.md` chain

## Preconditions

Use `[BLOCKED]` before changing a public API incompatibly, adding a dependency, performing an irreversible operation, or proceeding from an unrelated red baseline.

## Flow

1. State acceptance criteria and capture a narrow baseline.
2. Read affected source, public entry points, tests, and local contracts.
3. Check direct dependents when a dependency edge or public API is involved.
4. State ordered file changes before editing under full rigor.
5. Add or update a regression test when behavior changes.
6. Implement smallest coherent change; update exports, types, and error/disposal contracts together.
7. Update documentation, README, recipes, or REPL examples when public use changes.
8. Run validation selected by changed surface.
9. Under full rigor, create a scoped Rush change file for every modified publishable package with version-relevant behavior.

## Propagation

- Bug pattern: search sibling packages and fix every confirmed equivalent.
- Dead dependency: scan all package manifests for same stale entry.
- Public design change: check direct dependents; propagate only when needed for correctness or coherence.
- New feature or test-only change: do not invent sibling work.

## Validation

| Changed surface       | Required validation                                               |
| --------------------- | ----------------------------------------------------------------- |
| Package source        | focused tests, lint, build                                        |
| Public API            | focused docs and REPL validation when examples exist              |
| Documentation         | `pnpm validate:docs -- --package=<name>`, Codex build, docs build |
| REPL                  | `pnpm validate:repl -- --package=<name>`, docs build              |
| Tooling / AI metadata | focused script tests, `pnpm check:ai-data`                        |

## Output

- `[UPDATED] <file>: <reason>`
- `[FIXED] <finding>: <validation>`
- `[DEFERRED] <work>: <reason>`
- `[BLOCKED] <decision>`
