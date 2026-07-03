# Vielzeug — Plan Template

Static reference for `plan.md` output formats. Consumed by `/pkg-plan` — do not duplicate in workflow files, reference here.

---

## `analyse` mode — `plan.md` format

````md
# <name> — Improvement Plan

## Baseline

- Tests: <N> passing, <F> files
- Exports: <N> symbols in `src/index.ts`
- Lint: clean / <N> errors
- Build: clean / errors

## Current State Assessment

<Structured assessment covering API surface, implementation quality, DX, test coverage,
documentation alignment, TypeScript strictness, architectural clarity.>

## Identified Gaps & Issues

| ID  | Category  | Title   | Location        | Impact |
| --- | --------- | ------- | --------------- | ------ |
| B1  | 🔴 Bug    | <title> | `file.ts:~L100` | High   |
| D1  | 🟠 Design | <title> | `file.ts:~L200` | Medium |

## Improvement Plan

### B1 — <Title> 🔴

- **What:** <concise change description>
- **Why:** <motivation — DX, correctness, simplicity>
- **Where:** `packages/<name>/src/<file>.ts` — `functionName()` (~L100)
- **Effort:** S / M / L
- **Breaking?:** Yes — <describe> / No
- **Example:**
  ```ts
  // Before
  ...
  // After
  ...
  ```

## Future Improvements

### F1 — <Title>

- **Idea:** <high-level description>
- **Why:** <long-term DX/architecture benefit>
- **Risk/Cost:** <complexity + migration impact>
- **Prerequisites:** <groundwork needed first>

## Risks & Constraints

<Downstream breakage, migration considerations.
Reference `.ai/rules/data/catalogue.md` for the dependency graph — do not restate it.>

## Cycle Log (optional, append-only)

<One dated subsection per `/pkg-workflow` cycle, only if there's real narrative worth keeping — what changed, why, notable deviations. This is where session detail belongs, not `progress.md`'s Notes column (which stays a one-line resumption pointer — see `.ai/rules/process/agent-execution.md § Run artifacts`). Omit entirely on a fresh plan with nothing to log yet.>

### Cycle 1 — <one-line summary>

<Narrative.>
````

---

## `feature` / `new-package` mode — `plan.md` format

Future items in this section use `FUT*` IDs to avoid colliding with feature implementation IDs (`F*`).

```md
# <name> — <Feature Name | "New Package"> Spec Plan

## Baseline

- Tests: <N> passing, <F> files ← write 0 / 0 for new-package
- Exports: <N> symbols in `src/index.ts` ← write 0 for new-package
- Lint: clean ← write N/A for new-package
- Build: clean ← write N/A for new-package

## Spec Summary

<One to two paragraphs: what this feature/package does, who it is for, and the core use cases.>

## Requirements

| ID  | Description   | Status       |
| --- | ------------- | ------------ |
| R1  | <requirement> | [REQ]        |
| —   | <item>        | [CONSTRAINT] |
| —   | <item>        | [SKIP]       |

## Proposed API

<List all [API], [TYPE], [ERROR] items from Pass 2 with exact signatures and JSDoc notes.>

## Implementation Plan

### D1 — Scaffold package structure 🟠 ← new-package only; omit for feature mode

- **What:** Create `packages/<name>/` with all standard files
- **Why:** Bootstrap the package in the monorepo
- **Where:** `packages/<name>/` (new directory)
- **Effort:** S
- **Breaking?:** No
- **Done when:** `pnpm --filter @vielzeug/<name> build` passes with a stub `src/index.ts`

### F1 — <Feature Title> 🟢

- **What:** <concise implementation description>
- **Why:** <motivation — user value, DX>
- **Where:** `packages/<name>/src/<file>.ts`
- **Effort:** S / M / L
- **Breaking?:** No / Yes — <describe>
- **Done when:** <concrete acceptance criteria>

### C1 — Test coverage for <feature> 🟡

- **What:** <what tests to write>
- **Why:** <what behavior is verified>
- **Where:** `packages/<name>/src/__tests__/<name>.test.ts`
- **Effort:** S / M / L
- **Breaking?:** No
- **Done when:** all tests pass, N new cases covering <list>

## Future Improvements

### FUT1 — <Title>

- **Idea:** <high-level description>
- **Why:** <long-term DX/architecture benefit>
- **Risk/Cost:** <complexity and migration impact>
- **Prerequisites:** <groundwork needed first>

## Risks & Constraints

<Integration risks, breaking changes, cross-package implications.
Reference `.ai/rules/data/catalogue.md` for the dependency graph — do not restate it.>

## Cycle Log (optional, append-only)

<Same convention as `analyse` mode above — dated narrative subsections, only if worth keeping.>
```
