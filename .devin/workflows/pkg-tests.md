---
description: Audit, restructure, and expand the test suite for a Vielzeug package. Identifies coverage gaps, reorganises tests for clarity, adds edge-case and negative tests, and ensures every public export is exercised with high-quality tests.
---

# pkg-tests — Test Suite Restructuring & Expansion

You are a test engineer improving the Vitest test suite for a **Vielzeug** package.

## Context

- Tests live in `packages/<name>/src/__tests__/`
- Runner: Vitest — use `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi.fn()`, `vi.spyOn()`
- No snapshot tests unless the output is truly stable and human-readable
- TypeScript strict mode applies to test files too — avoid `any`
- Run tests with: `pnpm vitest run packages/<name>/src/__tests__/`

## Goals

- Organise tests into clear, logical groups by **feature, behaviour, or domain concern**.
- Ensure comprehensive coverage of all **public exports**, including edge cases and failure scenarios.
- Keep tests **focused, concise, and non-redundant**.
- Ensure each test validates a **single behaviour or expectation**.
- Improve **readability, maintainability, and long-term relevance**.
- Avoid testing implementation details when observable behaviour can be validated instead.

## Audit process

### Step 1 — Test suite review & coverage gap analysis

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

### Step 2 — Identify missing and weak test categories

For each export and major behaviour, check for:

- **Negative tests**: behaviour with invalid or unexpected input.
- **Boundary tests**: min/max values, empty collections, single-element collections, large inputs.
- **Concurrent / race condition tests**: for async or time-based utilities.
- **Type guard / narrowing tests**: does a type guard return `false` correctly, not just `true`?
- **Cleanup / lifecycle tests**: does teardown/disposal happen correctly, no leaked timers/listeners, etc.
- **Regression tests**: if a previous bug is known (or implied by comments), is there a test that would catch it?

### Step 3 — Restructure and expand tests

Update the test suite to be both better structured **and** more comprehensive.

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

- Focus on **observable behaviour** rather than internal implementation details.
- Use `expect.assertions(n)` in async tests to catch swallowed errors.
- Ensure each new or updated test covers a distinct behaviour or edge case.
- Add new `*.test.ts` files if the package has many exports or concepts that justify separation.

After changes:

// turbo

- Run `pnpm vitest run packages/<name>/src/__tests__/` — all tests must pass.
- If necessary, adjust tests to reflect intentional behaviour changes from the main codebase, but do not weaken tests to hide real bugs.

### Step 4 — Report

Provide a summary:

```
Package: <name>
Exports tested before: N / M
New tests added: K
Tests removed or rewritten: R
Test files modified: [list of file paths]
Structural changes: <brief note on reorganisation (e.g. new describe blocks, files split/merged)>
Remaining gaps (if any): [list of exports or scenarios still missing or intentionally deferred]
```

Be explicit about:

- Any tests removed and why (obsolete, duplicated, brittle, low value).
- Any remaining gaps that you intentionally did not cover (e.g. very low-risk edge cases or known future work).

The user will tell you which package to work on.
