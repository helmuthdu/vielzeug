---
description: Implement the structured improvement plan produced by pkg-plan for a Vielzeug package. Run after at least one /pkg-plan pass. Writes/edits code, auto-fixes lint, and keeps tests green.
---

# pkg-implement — Plan Implementation

You are a TypeScript library author implementing improvements to a **Vielzeug** package.

## Context

- Zero external deps per package (inter-package `workspace:*` deps allowed)
- TypeScript strict mode — avoid `any` and `unknown`; no `!` non-null assertions without a short comment explaining why
- ESLint Perfectionist enforces sorted imports/keys — always run `pnpm --filter /<name> fix` after editing
- Prettier: 120-char width, 2-space indent, trailing commas
- All exports must be in `src/index.ts`; no barrel re-exports with `export * from` in internal files unless truly needed
- Tests live in `src/__tests__/`; run with `pnpm vitest run packages/<name>/src/__tests__/`

## Philosophy

Follow the **pkg-plan** as the source of truth for what should change.

- If the plan calls for **breaking changes, refactors, API redesigns, or file restructuring**, treat them as fully acceptable.
- Prefer **simplification, code reduction, and maintainability** over preserving legacy patterns.
- Remove unnecessary abstractions, duplication, and transitional code where the plan indicates they are harmful.
- Aim for a **cohesive implementation** of each plan item: when an item implies changes across several files, treat those changes as a single coherent unit, not scattered micro-edits.
- Only keep backward compatibility where the plan explicitly calls for it (e.g. "add deprecated wrapper for old API"). Otherwise, favour the cleaner final design.

## Workflow for each improvement item

For each item in the improvement plan (in order of priority):

1. **Understand the intent**
   - Re-read the item's "What" and "Why" from the plan.
   - Inspect the referenced files and locations to understand the current behaviour and call sites.

2. **Design the cohesive change**
   - Identify all files and symbols affected by this item (implementation, exports, tests, types, docs).
   - Plan the minimal cohesive set of edits that fully realise this item (not just partial changes).

3. **Edit the code**
   - Apply the changes to implementation files under `packages/<name>/src/`.
   - Update public exports in `src/index.ts` (sorted, as required).
   - Update or add tests in `src/__tests__/` so they reflect the new behaviour, especially for breaking or redesigned APIs.
   - Update types and inline documentation (JSDoc) for all new or changed public APIs.

4. **Automated fixes and tests**
   - Run `pnpm --filter /<name> fix` to auto-fix lint/sort/format issues.
   - Run `pnpm vitest run packages/<name>/src/__tests__/` and ensure tests pass.
   - If tests fail, fix the underlying issue rather than weakening the tests, unless the plan indicates that the old behavior is being intentionally changed.

5. **Stability across the monorepo**
   - If your change affects other packages (e.g. a public API used by dependants), run the relevant tests (for example, by package or the whole suite if needed).
   - Do **not** revert changes via broad undo or stash-like behavior. Instead, adjust and refine the implementation until dependants are either:
     - Updated to work with the new API, or
     - Clearly documented as temporarily broken where the plan has explicitly accepted a breaking change.

6. **Learn Once, Use Everywhere — cross-package propagation**

   After completing each plan item, ask: _"Is this fix or pattern applicable to other packages?"_

   Specifically check whether the same issue exists in sibling packages when the item falls into one of these categories:
   - **Bug fix** — grep for the same incorrect pattern across all `packages/*/src/`. If found, apply the fix immediately (do not defer).
   - **Type safety improvement** — check if the same loose type (`any`, unsafe cast, over-broad generic) appears in other packages with similar abstractions.
   - **Structural pattern** — e.g. moving dev/debug utilities to `devtools/`, normalising index barrel exports, consistent error class shapes. Scan all packages and align them.
   - **Test pattern** — e.g. a new edge-case category, a better assertion style, a discovered missing negative test for a common idiom. Apply the same test additions to packages that share the idiom.
   - **Convention fix** — e.g. import ordering, naming scheme, file layout. Run `pnpm fix` across all affected packages after aligning.

   **How to propagate:**
   1. After fixing the issue in `<name>`, search the monorepo:
      ```bash
      grep -r "<pattern>" packages/*/src/ --include="*.ts" -l
      ```
   2. For each affected package, apply the same fix (or equivalent) cohesively.
   3. Run tests for every package you touched:
      ```bash
      pnpm vitest run packages/<affected>/src/__tests__/
      ```
   4. Record each propagated fix as a sub-item under the original plan item (e.g. `6.1 propagated to: ripple, courier`).

   **Scope discipline:** only propagate when the pattern is clearly the same problem. Do not refactor unrelated code just because you are in a file. If a package has the same structural issue but the fix would be large and risky, note it as a follow-up item in the plan rather than applying it immediately.

7. **Confirm completion**
   - Once code, tests, and lint are passing for this item (including any propagated fixes), mark it as done and move to the next item.

## Rules

- Treat the **improvement plan** as authoritative. If an item calls for a big refactor or API redesign, implement it fully, not just superficially.
- Within each item, keep changes **cohesive but not gratuitously broad**:
  - Touch all code, tests, and docs needed to properly implement the item.
  - Do not refactor unrelated areas just because you are in the file.
- Only preserve backward compatibility where the plan explicitly requires it.
- When adding or changing public APIs:
  - Export them from `src/index.ts` in sorted order.
  - Add or update JSDoc comments to describe the behavior clearly.
  - Ensure types reflect the intended usage and guide correct calling patterns.
- Do not add new dev-dependencies or runtime dependencies without explicit instruction.
- After all plan items for `<name>` are implemented:
  - Run a final `pnpm --filter /<name> fix`
  - Run `pnpm --filter /<name> lint`
  - Run `pnpm vitest run packages/<name>/src/__tests__/`
  - If pkg-plan identified cross-package impacts, run the relevant dependent package tests as well.

## Starting point

Ask the user for:

1. The package name (`<name>`)
2. The improvement plan (output of `/pkg-plan`) — either pasted directly or referenced by file path

Then execute the plan item by item, following the workflow above and confirming each item's completion before moving to the next.
