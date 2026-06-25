---
description: Implement the structured improvement plan produced by pkg-plan for a Vielzeug package. Run after at least one /pkg-plan pass. Writes/edits code, auto-fixes lint, and keeps tests green.
---

# pkg-implement — Plan Implementation

You are a TypeScript library author implementing improvements to a **Vielzeug** package.

## 0. Agent Execution Model

**This workflow is designed for autonomous agent execution, working through a plan item by item.** Follow these principles:

### Execution Checkpoints

After completing each plan item (step 7), **output a checkpoint summary** before moving to the next:

```
✅ ITEM: <ID> — <Title>
- Files changed: [list]
- Tests: PASS (N passing, F files) / FAIL (describe)
- Lint: clean / N errors
- Propagated to: [packages or "none"]
- Proceeding to <next item ID or "Final verification">
```

After all plan items are complete, output a final checkpoint before writing `progress.md`:

```
✅ CHECKPOINT: Implementation complete
- Items: N/N completed
- Tests: N passing, F files
- Lint: clean
- rush change: generated / pending user approval
- Propagations: [list or "none"]
- Ready for /pkg-review
```

### Decision Framework

When facing ambiguity, apply this priority order:

1. **`plan.md` is the source of truth** — if plan and current code disagree, implement what the plan says.
2. **Fix tests, never weaken them** — a failing test after a change means the implementation is incomplete, not the test.
3. **Cohesive edits** — each plan item touches all affected files (impl, exports, tests, types). Never implement half an item.
4. **Propagate same-pattern fixes** — step 6 is mandatory, not optional. If a bug exists in multiple packages, fix all.
5. **When uncertain, read more** — re-read the plan item's "Why" and inspect the referenced file before guessing.

### Anti-Patterns to Avoid

- ❌ **Do not** implement an item partially — exports, tests, and types must all be updated together.
- ❌ **Do not** skip `pnpm fix` after editing — unsorted imports/keys will fail lint in CI.
- ❌ **Do not** weaken or delete tests to make them pass — fix the code instead.
- ❌ **Do not** skip the cross-package propagation check (step 6) — bugs that exist in one package often exist in siblings.
- ❌ **Do not** implement plan items out of order unless you have an explicit dependency reason.
- ❌ **Do not** add new runtime dependencies without explicit instruction from the plan.

### Structured Output Markers

Use consistent markers throughout your implementation output:

- `[IMPLEMENTING]` — currently working on this item
- `[DONE]` — item fully implemented, tests pass, lint clean
- `[PROPAGATED]` — fix also applied to sibling package(s)
- `[BLOCKED]` — cannot proceed without user input; present recommendation
- `[SKIPPED]` — item intentionally deferred (state reason)
- `[VERIFY]` — requires runtime or manual confirmation

## 1. Context

- Zero external deps per package (inter-package `workspace:*` deps allowed)
- TypeScript strict mode — avoid `any` and `unknown`; no `!` non-null assertions without a short comment explaining why
- ESLint Perfectionist enforces sorted imports/keys — always run `pnpm --filter @vielzeug/<name> fix` after editing
- Prettier: 120-char width, 2-space indent, trailing commas
- All exports must be in `src/index.ts`; no barrel re-exports with `export * from` in internal files unless truly needed
- Tests live in `src/__tests__/`; run with `pnpm vitest run packages/<name>/src/__tests__/` (co-located packages e.g. `refine`: `pnpm --filter @vielzeug/<name> test`)
- **Canonical context** — conventions, package catalogue, and the dependency graph live in `.devin/rules/conventions.md`. Consult it; do not duplicate or restate it.
- **Read the DOX chain before editing** — root `AGENTS.md` → `packages/AGENTS.md` → `packages/<name>/AGENTS.md` (if present). Local contracts override defaults: e.g. for `refine` run the whole-tree test command and regenerate exports with `sync:exports` (never hand-edit the `exports` map); `lucide` is an allowed dependency there.

## 2. Philosophy

Follow the **pkg-plan** as the source of truth for what should change.

- If the plan calls for **breaking changes, refactors, API redesigns, or file restructuring**, treat them as fully acceptable.
- Prefer **simplification, code reduction, and maintainability** over preserving legacy patterns.
- Remove unnecessary abstractions, duplication, and transitional code where the plan indicates they are harmful.
- Aim for a **cohesive implementation** of each plan item: when an item implies changes across several files, treat those changes as a single coherent unit, not scattered micro-edits.
- Only keep backward compatibility where the plan explicitly calls for it (e.g. "add deprecated wrapper for old API"). Otherwise, favour the cleaner final design.

## 3. Workflow for each improvement item

**Goal:** Implement each plan item as a complete, cohesive unit — code, tests, types, and exports all in sync.

For each item, emit `[IMPLEMENTING] <ID> — <Title>` before starting, then follow these steps.

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
   - Run `pnpm --filter @vielzeug/<name> fix` to auto-fix lint/sort/format issues.
   - Run the test suite and ensure all tests pass (safe to auto-run):

// turbo

```bash
pnpm vitest run packages/<name>/src/__tests__/
```

- If tests fail, fix the underlying issue rather than weakening the tests, unless the plan indicates that the old behavior is being intentionally changed.

5. **Stability across the monorepo**
   - If your change affects other packages (e.g. a public API used by dependants), run the relevant tests (for example, by package or the whole suite if needed).
   - Do **not** revert changes via broad undo or stash-like behavior. Instead, adjust and refine the implementation until dependants are either:
     - Updated to work with the new API, or
     - Clearly documented as temporarily broken where the plan has explicitly accepted a breaking change.

6. **Learn Once, Use Everywhere — cross-package propagation**

   After completing each plan item, ask: _"Is this fix or pattern applicable to other packages?"_

   Specifically, check whether the same issue exists in sibling packages when the item falls into one of these categories:
   - **Bug fix** — grep for the same incorrect pattern across all `packages/*/src/`. If found, apply the fix immediately (do not defer).
   - **Dead-dep removal** — if a dead `workspace:*` entry is removed from one package, scan all other `package.json` files for the same dead entry: `grep -r "<dep>" packages/*/package.json`. Remove it from every affected package and run their tests.
   - **Type safety improvement** — check if the same loose type (`any`, unsafe cast, over-broad generic) appears in other packages with similar abstractions.
   - **Structural pattern** — e.g. moving dev/debug utilities to `devtools/`, normalizing index barrel exports, consistent error class shapes. Scan all packages and align them.
   - **Test pattern** — e.g. a new edge-case category, a better assertion style, a discovered missing negative test for a common idiom. Apply the same test additions to packages that share the idiom.
   - **Convention fix** — e.g. import ordering, naming scheme, file layout. Run `pnpm fix` across all affected packages after aligning.

   **How to propagate:**
   1. After fixing the issue in `<name>`, search the monorepo:
      ```bash
      grep -r "<pattern>" packages/*/src/ --include="*.ts" -l
      ```
   2. For each affected package, apply the same fix (or equivalent) cohesively.
   3. Run tests for every package you touched (use the correct command per package — standard: `pnpm vitest run packages/<affected>/src/__tests__/`; co-located e.g. `refine`: `pnpm --filter @vielzeug/<affected> test`).
   4. Record each propagated fix as a sub-item under the original plan item (e.g. `6.1 propagated to: ripple, courier`).

   **Scope discipline:** only propagate when the pattern is the same problem. Do not refactor unrelated code just because you are in a file. If a package has the same structural issue but the fix would be large and risky, note it as a follow-up item in the plan rather than applying it immediately.

7. **Confirm completion**
   - Once code, tests, and lint are passing for this item (including any propagated fixes), emit `[DONE] <ID>` and output the item checkpoint (see §0).

## 4. Rules

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
  - Run a final `pnpm --filter @vielzeug/<name> fix`
  - Run `pnpm --filter @vielzeug/<name> lint`
  - Run the test suite — standard: `pnpm vitest run packages/<name>/src/__tests__/`; co-located (e.g. `refine`): `pnpm --filter @vielzeug/<name> test`.
  - If pkg-plan identified cross-package impacts, run the relevant dependent package tests as well.
  - Generate a `rush change` file for every touched package (do **not** commit it without user approval): `rush change --bulk --message "<summary>" --bump-type <patch|minor|major>`. Use `patch` for fixes, `minor` for new features, `major` for breaking changes.

## 5. Starting point

Load the plan before writing a single line of code:

1. Follow the DOX chain — read the root `AGENTS.md`, then `.devin/workflows/runs/AGENTS.md`.
2. Read the persisted plan at `.devin/workflows/runs/<name>/plan.md` (the output of `/pkg-plan`). This is the source of truth.
3. If no persisted plan exists, ask the user to paste it or provide a path — and offer to run `/pkg-plan` first.
4. Output the plan items you intend to implement (in order) before starting, so the user can intercept if scope is wrong.

Then execute the plan item by item, emitting markers and checkpoints as described in §0. Keep `.devin/workflows/runs/<name>/progress.md` updated as items complete (including any cross-package propagations from step 6).

## 6. Quick Reference — Execution Flow

```
Read plan.md           → list items in order
    ↓
For each item:
  [IMPLEMENTING] <ID>
  ├─ Understand (re-read What/Why, inspect files)
  ├─ Design (identify all affected files)
  ├─ Edit (impl → exports → tests → types)
  ├─ pnpm fix (lint/sort/format)
  ├─ Run tests (fix failures — never weaken)
  ├─ Propagate (grep siblings, fix if same pattern)
  └─ [DONE] <ID> → Checkpoint
    ↓
Final verification:
  pnpm fix → pnpm lint → tests → rush change
    ↓
Update progress.md     → ✅ CHECKPOINT: complete
```
