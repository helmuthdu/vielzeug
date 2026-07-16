# Change Task

Use this when the goal is to implement a package or repo change.

## Load first

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- `.ai/core/conventions.md`
- relevant `AGENTS.md` chain
- `.ai/data/packages.json` when dependency impact matters

## Goal

Implement the smallest coherent change that solves the problem cleanly.

## Rigor

Default is `full` — follow every step of the Default flow below, including the pre-edit item list (step 4). Use `quick` (see `.ai/core/policy.md`) only for a trivial, single-function fix — skip stating the pre-edit item list explicitly, but still capture a baseline and run validation.

## Default flow

1. Capture a narrow baseline for the package or area you will change.
2. Read the affected source and tests.
3. Design the simplest durable implementation.
4. State the ordered list of files/changes you intend to make before editing, so scope can be corrected early — don't discover a bigger blast radius mid-edit without saying so.
5. Update implementation, exports, tests, and docs together.
6. Run the narrowest useful validation.
7. If the public API is changed, update docs and REPL examples that demonstrate it.

## Rules

- No compatibility shims.
- No deprecated parallel APIs.
- Delete obsolete code instead of layering around it.
- A breaking change discovered mid-implementation gets a `[BLOCKED]` marker and user confirmation (see `.ai/core/policy.md`), not a silent apply.

## Cross-package propagation

A fix in one package often exists in siblings too — check `.ai/data/packages.json`'s dependency graph to scope the search:

- **Bug fix** — required: grep all packages for the same pattern and fix every occurrence, not just the one that was reported.
- **Dead-dep removal** — required: scan all `package.json` files for the same dead `workspace:*` entry.
- **Design change** (naming, structure, type safety) — optional: check direct dependents; propagate only where it clearly improves consistency.
- **New feature / enhancement / test-only change** — skip: not present it in siblings by definition.

If a dependent package breaks as a result, fix it in the same pass or document the break explicitly — don't leave it silently red.

## Outputs

- updated source
- updated tests
- updated docs/examples when required
- optional implementation note under `.ai/state/<scope>/` if the task is likely to resume later

