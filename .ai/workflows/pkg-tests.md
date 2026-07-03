# pkg-tests — Test Suite Restructuring & Expansion

> **Canonical source:** This file is the single source of truth for all AI tools. Generated, gitignored stubs in `.claude/commands/` and `.devin/workflows/` delegate here (see `.ai/workflows/manifest.json` + `pnpm gen:workflow-docs`); `.junie/guidelines.md` links here directly with no stub file.

You are a test engineer improving the Vitest test suite for a **Vielzeug** package.

## 0. Agent execution model

Follow `.ai/rules/process/agent-execution.md` — universal principles, decision framework, markers, and convergence rules.

### Workflow-specific markers

| Marker        | Meaning                                                |
| ------------- | ------------------------------------------------------ |
| `[GAP]`       | Export or behaviour with no test coverage              |
| `[ADDED]`     | New test added                                         |
| `[REMOVED]`   | Test removed (always include reason)                   |
| `[UPDATED]` | Existing test improved without changing what it covers (same word `pkg-repl` uses for the equivalent action) |

### Execution checkpoints

After each step, output a checkpoint before proceeding:

```text
✅ CHECKPOINT: Step N — <Name> complete
- <step-specific fields (see below)>
- Proceeding to Step N+1
```

## 1. Context

See `.ai/rules/process/agent-execution.md § Context pointers` and `§ DOX chain`.

**Test location:** most packages use `packages/<name>/src/__tests__/`. Some packages co-locate tests next to source (e.g. `refine`: `src/<category>/<component>/<component>.test.ts`). Check the package's `AGENTS.md` for the correct command.

**Runner:** Vitest — use `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi.fn()`, `vi.spyOn()`. No snapshot tests unless the output is truly stable and human-readable. TypeScript strict mode applies to test files.

**Standard test command:**

```bash
pnpm vitest run packages/<name>/src/__tests__/
```

**Co-located packages** (e.g. `refine`): `pnpm --filter @vielzeug/<name> test`

**Scope large packages** (e.g. `refine`) — audit one category/area per pass rather than the whole tree at once.

**UI / DOM-output packages** (`refine`, `ore`, `prism`): accessibility coverage is a **hard requirement**. Follow each package's `AGENTS.md` "Accessibility testing" contract:

- `refine` / `prism` — full component/chart ARIA pattern assertions; every test must call `axeCheck` and assert zero violations.
- `ore` — primitive-level only: assert correct `role`, `tabindex`, `aria-*` wiring. Full ARIA pattern correctness is `refine`'s concern.

## 2. Goals

- Organise tests into clear, logical groups by feature, behaviour, or domain concern.
- Ensure comprehensive coverage of all public exports, including edge cases and failure scenarios.
- Keep tests focused, concise, and non-redundant.
- Each test validates a **single behaviour or expectation**.
- Avoid testing implementation details when observable behaviour can be validated instead.

## 3. Audit process

### Step 0 — Capture the baseline

**Goal:** Establish a verified green baseline before making any change.

Run the correct test command for the package (check `AGENTS.md` first). Record: current passing test count, number of test files, exported-symbol count from `src/index.ts`. If the suite is already red, surface that immediately — do not proceed until the cause is understood.

```text
✅ CHECKPOINT: Step 0 — Baseline captured
- Tests: N passing, F files
- Exports: N symbols in src/index.ts
- Suite status: GREEN / ❌ RED (describe cause)
- Proceeding to Step 1
```

### Step 1 — Test suite review & coverage gap analysis

**Goal:** Identify every untested or under-tested export and flag quality issues in existing tests.

1. Read every file in `src/` (excluding `__tests__/`). For each exported symbol in `src/index.ts`:
   - Is it tested at all?
   - Are happy paths covered?
   - Are error / edge cases covered? (empty input, null/undefined, boundary values, invalid shapes at runtime)
   - Are async paths covered? (resolved, rejected, timeout, cancellation if relevant)

2. Review existing tests for:
   - Organisation: are tests grouped by feature/behaviour with `describe` blocks matching current architecture?
   - Quality: any obsolete, duplicated, brittle, or low-value tests? Over-mocking? Multiple behaviours in one assertion?

Emit `[GAP]` for each coverage hole found.

```text
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
- **Cleanup / lifecycle tests**: does teardown/disposal happen correctly, no leaked timers/listeners?
- **Regression tests**: if a previous bug is known (or implied by comments), is there a test catching it?

```text
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
- Remove or rewrite: obsolete tests, duplicated tests, brittle tests relying on internal implementation details.
- Reduce unnecessary mocking — prefer simple, deterministic tests with minimal setup.

When adding or updating tests:

- Emit `[ADDED]`, `[REMOVED]`, or `[UPDATED]` for each test touched.
- Focus on **observable behaviour** rather than internal implementation details.
- Use `expect.assertions(n)` in async tests to catch swallowed errors.
- Ensure each new or updated test covers a distinct behaviour or edge case.
- Add new `*.test.ts` files if the package has many exports or concepts that justify separation.

Run the test suite after changes (use the command that matches the package layout). All tests must pass.

```text
✅ CHECKPOINT: Step 3 — Tests updated
- Tests added: N
- Tests removed: N ([REMOVED] items with reasons)
- Tests updated: N
- Suite status: GREEN / ❌ RED (describe)
- Proceeding to Step 4
```

### Step 4 — Report

Output using **exactly this format**:

```text
## Test Suite Report

### Baseline
- Tests before: N passing, F files
- Exports: N symbols in src/index.ts

### Changes

| Category | Count | Details |
|----------|-------|---------|
| [ADDED] | N | <brief list> |
| [REMOVED] | N | <brief list with reasons> |
| [UPDATED] | N | <brief list> |
| [DEFERRED] | N | <list with reasons> |

### Final State
- Tests after: N passing, F files
- Net delta: +N / -N tests
- Test files modified: [list]
- Structural changes: <describe block additions, file splits/merges>

### Remaining Gaps
<list of exports or scenarios not covered and why, or "None — all public exports covered">
```

Write this report to `.ai/workflows/runs/<name>/tests-report.md`, overwriting any prior contents (see `.ai/rules/process/agent-execution.md § Run artifacts`). Present the same content in chat.

## 4. Quick reference — execution flow

```text
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
