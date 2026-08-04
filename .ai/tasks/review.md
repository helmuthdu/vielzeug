# Review Task

## Use when

Investigate, audit, redesign, plan, or review code without making changes unless explicitly requested.

## Inputs

- `scope`
- `goal`
- `checks`: `correctness`, `design`, `types`, `security`, `coverage`
- `depth`: `quick` or `full`

## Load

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- `.ai/core/conventions.md` when package source is in scope
- `.ai/reference/security-checklist.md` for security review
- relevant `AGENTS.md` chain

## Preconditions

Confirm scope and goal. Use `[BLOCKED]` when requirements permit materially different designs or the review requires destructive/runtime-only evidence.

## Flow

1. Read public entry points and affected implementation.
2. Read tests, docs, and package metadata only where they establish intended behavior.
3. Apply selected checks at requested depth. Under full depth, review public API, stateful, or cross-package work in two independent passes: contract (API, types, errors, lifecycle, exports, docs, dependents), then implementation (correctness, boundaries, cleanup, tests, races, security). Start the second pass from source, not first-pass claims.
4. Identify decisions shared across recommended workstreams. Resolve each once, assign one owner, or mark it `[BLOCKED]`; do not delegate overlapping decision authority.
5. Inspect changed and adjacent coordination hotspots for mixed responsibilities; report `[DECOMPOSE]` when cohesive extraction reduces future change coupling.
6. Verify every claim against source or mark it `[VERIFY]`.
7. Produce prioritized, concrete recommendations and validation implications.

## Checks

- `correctness`: logic, boundaries, async behavior, errors, cleanup, regression tests.
- `design`: API clarity, naming, architecture boundaries, duplication, dependency hygiene.
- `maintainability`: cohesion, file responsibility, dependency direction, repeated coordination hotspots, extraction boundaries.
- `types`: unsafe assertions, broad types, narrowing, generic invariants.
- `security`: checklist-driven injection, prototype, data exposure, runtime validation, browser/server risks.
- `coverage`: public happy paths, failures, boundaries, races, guards, lifecycle behavior.

For security reviews, finish only after every raised finding is `[FIXED]`, `[DEFERRED]`, or explicitly open.

## Output

`[FINDING] <severity> — <file:line> — <problem> — <evidence> — <recommended fix>`

`[DECOMPOSE] <file> — <evidence> — <suggested module boundaries>`

Also report `[DEFERRED]`, `[VERIFY]`, and `[BLOCKED]` as needed. Persist a report under `.ai/state/<scope>/` only when another session must resume it.
