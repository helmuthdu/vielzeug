---
description: Change package source, tests, tooling, CI, or public behavior.
---

# Build Task

## Use when

Change package source, tests, tooling, CI, or public behavior.

## Load

- root `AGENTS.md` (policy, safety, markers, commands)
- `.ai/core/conventions.md` when editing package source
- `.ai/reference/packages.md` when dependency impact matters
- relevant subtree `AGENTS.md`

## Preconditions

Changes are compatible by default. Use `[BLOCKED]` before changing a public API incompatibly, adding a dependency, performing an irreversible operation, or proceeding from an unrelated red baseline. A breaking change requires explicit approval, a public API/dependent impact check, and migration scope before editing.

Record a baseline: the exact command, its result, and whether failures predate the work. Do not claim a regression without comparing against it.

## Flow

1. Confirm acceptance criteria, compatibility expectation, and baseline.
2. Read affected source, public surfaces, tests, and local contracts.
3. Classify every changed surface and determine dependency, documentation, validation, and release impact. For non-trivial work, state a change map before editing: contracts affected, implementation areas, dependents, tests, docs, validation, release impact.
4. Apply the delegation rules in `AGENTS.md` before splitting work.
5. Apply every relevant change flow below.
6. Run every matching validation row from the enforcement map in `.ai/core/conventions.md`.
7. Report changes, impact, validation, release impact, and `[DEFERRED]` work.

## Behavior change

- Add or update behavior-focused contract tests before or alongside implementation.
- Implement the smallest coherent change; update source, exports, types, and error/disposal contracts together.
- Update documentation, README, recipes, and REPL examples when public use changes.
- For an approved breaking change, replace incompatible behavior across implementation, exports, types, errors, lifecycle, tests, docs, examples, and internal call sites. Remove compatibility shims and dead implementation, add migration guidance, report dependent impact, and mark affected packages for a major release.

## Test maintenance

When tests are the primary scope:

1. Run focused current tests and record the pass/fail baseline.
2. Read root and package Vitest configuration; confirm discovery, environment, setup files, and the package-specific test command.
3. Read the current implementation before changing any test assertion.
4. Group tests by behavior; remove tests that only assert intentionally removed behavior or duplicate low-value coverage.
5. Record coverage only when the task enables it or a configured threshold exists; preserve or explain any measured coverage loss.

## Tooling and AI metadata

- For tooling changes, read affected script entry points and local script contracts; run focused script tests and a direct smoke command where practical.
- For `.ai/` changes, run `pnpm gen:ai-data` when generated output (package table, task stubs) must change, then `pnpm check:ai-data`.

## Propagation

- Search before propagating.
- Bug pattern: search sibling packages and change every source-confirmed equivalent with the same contract.
- Dead dependency: scan all package manifests for the same stale entry.
- Public design change: check direct dependents; propagate only when needed for correctness or coherence.
- New feature or test-only change: do not invent sibling work.
- Do not propagate style-only similarity. Report searched scope and confirmed matches.

## Cross-cutting removals and migrations

For removals, migrations, workspace-wide renames, or package deprecations, build the completeness inventory from `.ai/tasks/review.md` before editing and reconcile it after validation. A green test run does not replace checking dependencies, generated artifacts, demos, docs, configuration, and release surfaces for leftovers.

## Report

- Baseline: `<command> — <result> — <pre-existing failures>`
- Impact: each public change, the dependents/call sites checked, and the propagation outcome
- `[DEFERRED]` / `[BLOCKED]` items

## Completion

Complete only when:

- acceptance criteria are met
- changed contracts and dependents are coherent
- source, tests, types, exports, and user-facing examples agree
- every required validation passed or is `[BLOCKED]` / `[VERIFY]`
- release impact is reported
- no known obsolete transitional code remains
