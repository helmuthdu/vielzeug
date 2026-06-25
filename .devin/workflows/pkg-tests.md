---
description: Audit, restructure, and expand the test suite for a Vielzeug package. Identifies coverage gaps, reorganises tests for clarity, adds edge-case and negative tests, and ensures every public export is exercised with high-quality tests.
---

# pkg-tests — Test Suite Restructuring & Expansion

You are a test engineer improving the Vitest test suite for a **Vielzeug** package.

## 0. Agent Execution Model

**This workflow is designed for autonomous agent execution across four sequential steps.** Follow these principles:

### Execution Checkpoints

After each step, **output a checkpoint summary** before proceeding:

```
✅ CHECKPOINT: Step N — <Name> complete
- <step-specific fields (see below)>
- Proceeding to Step N+1
```

### Decision Framework

When facing ambiguity, apply this priority order:

1. **Observable behaviour over implementation details** — test what the function does, not how it does it. If two approaches both validate observable output, prefer the simpler one.
2. **Never weaken tests to make them pass** — a failing test after restructuring means the implementation has a bug or the test was already wrong; investigate before deleting.
3. **Cover every public export** — if a symbol is in `src/index.ts` and has no test, add one. Gaps are not acceptable for public APIs.
4. **When uncertain, add the test** — a redundant test is cheaper than a missing one for a critical edge case.
5. **Suite must be green before and after** — if the baseline is red, surface it immediately and do not proceed until the cause is understood.

### Anti-Patterns to Avoid

- ❌ **Do not** weaken or soften test assertions to make a suite green — fix the underlying code instead.
- ❌ **Do not** delete a test without stating why it is obsolete, duplicated, or low-value.
- ❌ **Do not** over-mock — mocks that mirror the implementation only test the mock, not the behaviour.
- ❌ **Do not** test implementation details (private methods, internal state, exact call order when order doesn't matter).
- ❌ **Do not** skip Step 0 baseline capture — without it, the final delta is unverifiable.
- ❌ **Do not** write vague `it()` descriptions like `'works'` or `'handles edge case'` — be specific.

### Structured Output Markers

Use consistent markers throughout your output:

- `[GAP]` — export or behaviour with no test coverage
- `[ADDED]` — new test added
- `[REMOVED]` — test removed (always include reason)
- `[REWRITTEN]` — existing test improved without changing what it covers
- `[DEFERRED]` — gap intentionally not covered this pass (include reason)
- `[VERIFY]` — requires runtime or manual confirmation

## 1. Context

- Tests usually live in `packages/<name>/src/__tests__/`, but some packages **co-locate** tests next to source (e.g. `refine`: `src/<category>/<component>/<component>.test.ts`). Check the package's `AGENTS.md` for the correct command.
- Runner: Vitest — use `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi.fn()`, `vi.spyOn()`
- No snapshot tests unless the output is truly stable and human-readable
- TypeScript strict mode applies to test files too — avoid `any`
- Run tests with: `pnpm vitest run packages/<name>/src/__tests__/` (or `pnpm --filter @vielzeug/<name> test` to cover co-located tests)
- **Canonical context** — conventions, package catalogue, and the dependency graph live in `.devin/rules/conventions.md`. Consult it; do not duplicate or restate it.
- **Read the DOX chain first** — root `AGENTS.md` → `packages/AGENTS.md` → `packages/<name>/AGENTS.md` (if present) — and honour the local test command.
- **Scope large packages.** For big packages (e.g. `refine`), audit one category/area per pass rather than the whole tree at once.
- **UI / DOM-output packages** (`refine`, `ore`, `prism`): accessibility coverage is a **hard requirement**. Follow each package's `AGENTS.md` "Accessibility testing" contract — the scope differs by package type:
  - `refine` / `prism` — full component/chart ARIA pattern assertions; every test must call `axeCheck` and assert zero violations.
  - `ore` — primitive-level only: assert correct `role`, `tabindex`, `aria-*` wiring on elements the primitives produce. Full ARIA pattern correctness is `refine`'s concern, not `ore`'s. See `packages/ore/AGENTS.md` for details.
  - In all cases, under jsdom use the scoped `axeCheck` helper and treat layout/contrast rules as out of automated scope.

## 2. Goals

- Organise tests into clear, logical groups by **feature, behaviour, or domain concern**.
- Ensure comprehensive coverage of all **public exports**, including edge cases and failure scenarios.
- Keep tests **focused, concise, and non-redundant**.
- Ensure each test validates a **single behaviour or expectation**.
- Improve **readability, maintainability, and long-term relevance**.
- Avoid testing implementation details when observable behaviour can be validated instead.

## 3. Audit process

### Step 0 — Capture the baseline

**Goal:** Establish a verified green baseline before making any change.

**Check the package's `AGENTS.md` for the correct test command first.** Packages that co-locate tests next to source (e.g. `refine`) require a different command:

```bash
# Standard packages (tests in src/__tests__/)
pnpm vitest run packages/<name>/src/__tests__/

# Co-located packages (e.g. refine — tests alongside source)
pnpm --filter @vielzeug/<name> test
```

Record: current passing test count, number of test files, and the count of exported symbols in `src/index.ts`. Confirm the suite is green before you start — if it is already red, surface that immediately and do not proceed until the cause is understood.

**Checkpoint:**

```
✅ CHECKPOINT: Step 0 — Baseline captured
- Tests: N passing, F files
- Exports: N symbols in src/index.ts
- Suite status: GREEN / ❌ RED (describe cause)
- Proceeding to Step 1
```

### Step 1 — Test suite review & coverage gap analysis

**Goal:** Identify every untested or under-tested export and flag quality issues in existing tests. Emit `[GAP]` for each coverage hole found.

1. Read every file in `src/` (excluding `__tests__/`). For each exported symbol in `src/index.ts`:
   - Is it tested at all?
   - Are the **happy paths** covered?
   - Are **error / edge cases** covered? (empty input, null/undefined, boundary values, invalid shapes at runtime)
   - Are **async paths** covered? (resolved, rejected, timeout, cancellation if relevant)

2. Review existing tests under `src/__tests__/` for:
   - Organisation:
     - Are tests grouped by feature/behaviour (`describe` blocks) in a way that matches the current architecture and concepts?
   - Quality:
     - Are there **obsolete**, **duplicated**, **brittle**, or **low-value** tests?
     - Are there tests that over-mock or hide intent behind complex setup?
     - Do tests assert multiple behaviours at once instead of staying focused?

**Checkpoint:**

```
✅ CHECKPOINT: Step 1 — Gap analysis complete
- Exports with no tests: [list or "none"]
- Exports with partial coverage: [list or "none"]
- Obsolete/duplicate/brittle tests found: [list or "none"]
- Proceeding to Step 2
```

### Step 2 — Identify missing and weak test categories

**Goal:** Produce a concrete test plan for gaps identified in Step 1.

For each export and major behaviour, check for:

- **Negative tests**: behaviour with invalid or unexpected input.
- **Boundary tests**: min/max values, empty collections, single-element collections, large inputs.
- **Concurrent / race condition tests**: for async or time-based utilities.
- **Type guard / narrowing tests**: does a type guard return `false` correctly, not just `true`?
- **Cleanup / lifecycle tests**: does teardown/disposal happen correctly, no leaked timers/listeners, etc.
- **Regression tests**: if a previous bug is known (or implied by comments), is there a test that would catch it?

**Checkpoint:**

```
✅ CHECKPOINT: Step 2 — Missing categories identified
- Negative tests needed: [list or "none"]
- Boundary tests needed: [list or "none"]
- Async/race tests needed: [list or "none"]
- Cleanup/lifecycle tests needed: [list or "none"]
- Regression tests needed: [list or "none"]
- Proceeding to Step 3
```

### Step 3 — Restructure and expand tests

**Goal:** Implement all changes from Steps 1 and 2. Suite must be green when done.

When restructuring:

- Organise tests into `describe()` blocks named after the function/class or feature.
- Keep each `it()` description a clear, specific statement (e.g. `'returns empty array when input is empty'`, not `'works'`).
- Remove or rewrite:
  - Obsolete tests that no longer match the implementation.
  - Duplicated tests that assert the same behaviour.
  - Brittle tests that rely heavily on internal implementation details.
- Reduce unnecessary mocking and indirection:
  - Prefer simple, deterministic tests with minimal setup.
  - Keep setup reusable but not so abstract that intent is hidden.

When adding or updating tests:

- Emit `[ADDED]`, `[REMOVED]`, or `[REWRITTEN]` for each test touched.
- Focus on **observable behaviour** rather than internal implementation details.
- Use `expect.assertions(n)` in async tests to catch swallowed errors.
- Ensure each new or updated test covers a distinct behaviour or edge case.
- Add new `*.test.ts` files if the package has many exports or concepts that justify separation.

After changes, run the test suite (safe to auto-run). Use the command that matches the package layout (see Step 0):

// turbo

```bash
pnpm vitest run packages/<name>/src/__tests__/
```

For co-located packages (e.g. `refine`), use `pnpm --filter @vielzeug/<name> test` instead.

- All tests must pass.
- If necessary, adjust tests to reflect intentional behaviour changes from the main codebase, but do not weaken tests to hide real bugs.

**Checkpoint:**

```
✅ CHECKPOINT: Step 3 — Tests updated
- Tests added: N
- Tests removed: N ([REMOVED] items with reasons)
- Tests rewritten: N
- Suite status: GREEN / ❌ RED (describe)
- Proceeding to Step 4
```

### Step 4 — Report

**Goal:** Produce a concise, parseable summary of all changes and remaining gaps.

Provide the summary using **exactly this format**:

```
## Test Suite Report

### Baseline
- Tests before: N passing, F files
- Exports: N symbols in src/index.ts

### Changes

| Category | Count | Details |
|----------|-------|---------|
| [ADDED] | N | <brief list> |
| [REMOVED] | N | <brief list with reasons> |
| [REWRITTEN] | N | <brief list> |
| [DEFERRED] | N | <list with reasons> |

### Final State
- Tests after: N passing, F files
- Net delta: +N / -N tests
- Test files modified: [list]
- Structural changes: <describe block additions, file splits/merges>

### Remaining Gaps
<list of exports or scenarios not covered and why, or "None — all public exports covered">
```

## 4. Quick Reference — Execution Flow

```
Step 0: Baseline capture     → Checkpoint (GREEN required to proceed)
    ↓
Step 1: Gap analysis         → Checkpoint ([GAP] markers)
    ↓
Step 2: Missing categories   → Checkpoint (test plan)
    ↓
Step 3: Restructure/expand   → run tests → Checkpoint (GREEN required)
    ↓
Step 4: Report               → Structured summary
```

The user will tell you which package to work on.
