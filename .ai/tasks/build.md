# Build Task

## Use when

Change package source, tests, tooling, CI, or public behavior.

## Inputs

- `scope`
- `goal`
- `migrationMode`: `compatible` (default) or `breaking-approved`
- `depth`: `quick` or `full`

`quick` never skips public-impact analysis, dependency checks, required validation, or approval gates.

## Load

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- `.ai/core/conventions.md` when editing package source
- `.ai/data/packages.json` when dependency impact matters
- relevant `AGENTS.md` chain

## Preconditions

Use `[BLOCKED]` before changing a public API incompatibly under `compatible` mode, adding a dependency, performing an irreversible operation, or proceeding from an unrelated red baseline. `breaking-approved` requires explicit approval, a public API/dependent impact check, and migration scope before editing. A baseline records the exact command, result, and whether failures predate the work. Do not claim a regression without comparing against it.

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
- Under `breaking-approved`, replace incompatible behavior across implementation, exports, types, errors, lifecycle, tests, docs, examples, and internal call sites. Remove compatibility shims and dead implementation, add migration guidance, report dependent impact, and mark affected packages for a major release.

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

## Propagation

- Search before propagating.
- Bug pattern: search sibling packages and change every source-confirmed equivalent with the same contract.
- Dead dependency: scan all package manifests for the same stale entry.
- Public design change: check direct dependents; propagate only when needed for correctness or coherence.
- New feature or test-only change: do not invent sibling work.
- Do not propagate style-only similarity. Report searched scope and confirmed matches.

## Validation

Classify each changed file and apply the matching validation from the enforcement map in `.ai/core/conventions.md`. Run the narrowest useful validation for the changed surface — `quick` depth may combine checks for a trivial change, but never skips validation required by a public API or cross-package change.

## Common output

- `[BASELINE] <command> — <result> — <pre-existing failures>`
- `[IMPACT] <public change> — <dependent packages/call sites checked> — <propagation outcome>`
- `[DEFERRED] <work>: <reason>`
- `[BLOCKED] <decision>`

## Completion

Complete only when:

- acceptance criteria are met
- changed contracts and dependents are coherent
- source, tests, types, exports, and user-facing examples agree
- every required validation passed or is `[BLOCKED]` / `[VERIFY]`
- release impact is reported
- no known obsolete transitional code remains
