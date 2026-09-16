---
name: build
description: Change package source, tests, tooling, CI, or public behavior with baseline, propagation, and per-surface validation. Use when asked to implement, fix, refactor, add a feature or package, migrate, rename, or update tests or scripts.
---

# Build

## Load

- root `AGENTS.md` (policy, safety, markers, commands)
- `.agents/conventions.md` when editing package source
- `.agents/reference/packages.md` when dependency impact matters
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
6. Run the validation row below for every changed surface.
7. Report (see Report) and confirm every completion criterion.

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

## Tooling and agent contract

- For tooling changes, read affected script entry points and `scripts/AGENTS.md`; run focused script tests and a direct smoke command where practical.
- For `.agents/` changes, run `pnpm gen:ai-data` when the generated package table must change, then `pnpm check:ai-data`.
- New package: `pnpm new:package <name> "<description>"`, then follow the printed next steps.

## Propagation

- Search before propagating.
- Bug pattern: search sibling packages and change every source-confirmed equivalent with the same contract.
- Dead dependency: scan all package manifests for the same stale entry.
- Public design change: check direct dependents; propagate only when needed for correctness or coherence.
- New feature or test-only change: do not invent sibling work.
- Do not propagate style-only similarity. Report searched scope and confirmed matches.

## Cross-cutting removals and migrations

For removals, migrations, workspace-wide renames, or package deprecations, build the completeness inventory from the `review` skill (`.agents/skills/review/SKILL.md`) before editing and reconcile it after validation. A green test run does not replace checking dependencies, generated artifacts, demos, docs, configuration, and release surfaces for leftovers.

After renaming a path or prefix, search for the old name with hidden files included (`rg --hidden '<old>'`). Reference validators only know the new name and cannot see stale references to the old one.

## Validation

| Changed surface                | Run                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Package source                 | `pnpm vitest run packages/<name>/src/__tests__/`, `pnpm --filter @vielzeug/<name> lint`, `pnpm --filter @vielzeug/<name> build`           |
| Public API                     | package validation above, plus the docs/REPL rows of the `document` skill                                                                 |
| Tests only                     | focused tests; lint/build only when config or imports changed                                                                             |
| Cross-package call sites       | focused tests, lint, and build for every affected package                                                                                 |
| Demo or integration            | owning-package validation when library behavior changed; affected demo test/build; `pnpm validate:demos` for shared or broad demo impact |
| Production dev-warning gate    | `pnpm verify:prod-gate` after any change to build config or `_dev.ts` gating                                                              |
| Tooling (`scripts/`)           | `pnpm vitest run scripts/` and a direct smoke run of the changed script                                                                   |
| `.agents/` or package manifest | `pnpm check:ai-data`; `pnpm check:package-manifests` for manifests                                                                        |

## Report

- Baseline: `<command> — <result> — <pre-existing failures>`
- Impact: each public change, the dependents/call sites checked, and the propagation outcome
- `[DEFERRED]` / `[BLOCKED]` items

Complete only when acceptance criteria are met; changed contracts and dependents are coherent; source, tests, types, exports, and user-facing examples agree; every required validation passed or is `[BLOCKED]` / `[VERIFY]`; release impact is reported; and no obsolete transitional code remains.
