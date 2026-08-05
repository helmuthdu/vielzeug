# Build Task

## Use when

Change package source, tests, tooling, CI, or public behavior.

## Inputs

- `scope`
- `goal`
- `migrationMode`: `compatible` (default) or `breaking-approved`
- `depth`: `quick` or `full`

### Migration modes

| Mode | Public API | Dependents | Release impact |
| --- | --- | --- | --- |
| `compatible` | Must remain compatible | Check when contracts change | Patch or minor as appropriate |
| `breaking-approved` | Explicitly approved breaks only | Update all known internal call sites | Major |

`quick` never skips public-impact analysis, dependency checks, required validation, or approval gates.

## Load

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- `.ai/core/conventions.md` when editing package source
- `.ai/data/packages.json` when dependency impact matters
- relevant `AGENTS.md` chain

## Preconditions

Use `[BLOCKED]` before changing a public API incompatibly under `compatible` mode, adding a dependency, performing an irreversible operation, or proceeding from an unrelated red baseline. `breaking-approved` requires explicit approval, a public API/dependent impact check, and migration scope before editing.

A baseline records the exact command, result, and whether failures predate the work. Do not claim a regression without comparing against it.

## Common flow

1. Confirm acceptance criteria, migration mode, depth, and baseline.
2. Read affected source, public surfaces, tests, and local contracts.
3. Classify every changed surface and determine dependency, documentation, validation, and release impact.
4. Under full depth, state a change map before editing: contracts affected, implementation areas, dependents, tests, docs, validation, and release impact.
5. Apply policy decision-ownership and concurrent-work rules before delegation.
6. Apply every relevant change flow.
7. Run every matching validation row.
8. Report changes, impact, validation, release impact, and deferred work.

## Behavior change

- Add or update behavior-focused contract tests before or alongside implementation.
- Implement the smallest coherent change; update source, exports, types, and error/disposal contracts together.
- Update documentation, README, recipes, and REPL examples when public use changes.

## Test maintenance

When tests are primary scope:

1. Run focused current tests and record the pass/fail baseline.
2. Read root and package Vitest configuration; confirm discovery, environment, setup files, and package-specific test command.
3. Read the current implementation before changing any test assertion.
4. Group tests by behavior; remove tests that only assert intentionally removed behavior or duplicate low-value coverage.
5. Record coverage only when the task enables it or a configured threshold exists; preserve or explain any measured coverage loss.

## Tooling and AI metadata

- For tooling changes, read affected script entry points and local script contracts; run focused script tests and a direct smoke command where practical.
- For canonical AI-data changes, regenerate derived adapters/references with `pnpm gen:ai-data`, then run `pnpm check:ai-data`.
- For AI-document-only changes, run `pnpm check:ai-data` without regenerating unrelated output.

## Breaking-approved change

- Replace obsolete behavior across implementation, exports, tests, docs, recipes, README, REPL examples, and internal call sites.
- Remove compatibility shims, transitional wrappers, deprecated symbols, obsolete tests, and dead implementation unless explicitly approved.
- Add migration guidance for removed or renamed public APIs.
- Report every affected package as major release impact; do not create release artifacts in this task.

## Propagation

- Search before propagating.
- Bug pattern: search sibling packages and change every source-confirmed equivalent with the same contract.
- Dead dependency: scan all package manifests for the same stale entry.
- Public design change: check direct dependents; propagate only when needed for correctness or coherence.
- New feature or test-only change: do not invent sibling work.
- Do not propagate style-only similarity. Report searched scope and confirmed matches.

## Validation

Classify each changed file as package source, public API, tests, docs, REPL, tooling, AI metadata, release metadata, or cross-package call site. Apply every matching row.

| Changed surface | Required validation |
| --- | --- |
| Package source | focused tests, lint, build |
| Public API | package source validation; focused docs and REPL validation when examples exist |
| Tests only | focused tests; lint/build only when test config or imports require them |
| Documentation | `pnpm validate:docs -- --package=<name>`, Codex build, docs build |
| REPL | `pnpm validate:repl -- --package=<name>`, docs build |
| Tooling | focused script tests and direct smoke command |
| AI metadata | `pnpm gen:ai-data` when canonical data changed; `pnpm check:ai-data` |
| Release metadata | validate scoped artifact format and package/version intent |
| Cross-package call sites | focused tests, lint, and build for every affected package |

## Common output

- `[UPDATED] <file>: <reason>`
- `[FIXED] <finding>: <validation>`
- `[BASELINE] <command> — <result> — <pre-existing failures>`
- `[RELEASE] <package> — <none|patch|minor|major> — <reason>`
- `[DEFERRED] <work>: <reason>`
- `[BLOCKED] <decision>`

## Public and cross-package output

- `[IMPACT] <public change> — <dependent packages/call sites checked> — <propagation outcome>`
- `[PROPAGATED] <pattern> — <scope searched> — <confirmed files/packages>`

## Test output

- `[TESTS] <area> — <behaviors added/rewritten/removed> — <reason>`
- `[COVERAGE] <before/after or unavailable> — <gaps/restoration/justification>`

## Completion

Complete only when:

- acceptance criteria are met
- changed contracts and dependents are coherent
- source, tests, types, exports, and user-facing examples agree
- every required validation passed or is `[BLOCKED]` / `[VERIFY]`
- release impact is reported
- no known obsolete transitional code remains
