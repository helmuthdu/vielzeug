# pkg-implement — Plan Implementation

> **Canonical source:** This file is the single source of truth for all AI tools. Generated, gitignored stubs in `.claude/commands/` and `.devin/workflows/` delegate here (see `.ai/workflows/manifest.json` + `pnpm gen:workflow-docs`); `.junie/guidelines.md` links here directly with no stub file.

You are a TypeScript library author implementing improvements to a **Vielzeug** package.

## 0. Agent execution model

Follow `.ai/rules/process/agent-execution.md` — universal principles, decision framework, markers, and convergence rules. Use the universal `[SKIP]` marker (state reason) for an item you intentionally don't implement — don't invent a separate word for it.

### Workflow-specific markers

| Marker           | Meaning                        |
| ---------------- | ------------------------------- |
| `[IMPLEMENTING]` | Currently working on this item |

### Execution checkpoints

After completing each plan item, output a checkpoint before moving to the next:

```text
✅ ITEM: <ID> — <Title>
- Files changed: [list]
- Tests: PASS (N passing, F files) / FAIL (describe)
- Lint: clean / N errors
- Propagated to: [packages or "none"]
- Proceeding to <next item ID or "Final verification">
```

After all plan items are complete, output a final checkpoint:

```text
✅ CHECKPOINT: Implementation complete
- Items: N/N completed
- Tests: N passing, F files
- Lint: clean
- rush change: generated / pending user approval
- Propagations: [list or "none"]
- Ready for /pkg-review
```

## 1. Context

See `.ai/rules/process/agent-execution.md § Context pointers` and `§ DOX chain`. Local contracts override defaults — e.g. for `refine` run the whole-tree test command and regenerate exports with `sync:exports` (never hand-edit the `exports` map); `lucide` is an allowed dependency there.

## 2. Philosophy

Follow `plan.md` as the source of truth for what should change.

- If the plan calls for **breaking changes, refactors, API redesigns, or file restructuring**, treat them as fully acceptable.
- Prefer **simplification, code reduction, and maintainability** over preserving legacy patterns.
- Remove unnecessary abstractions, duplication, and transitional code where the plan indicates they are harmful.
- Aim for a **cohesive implementation** of each plan item: when an item implies changes across several files, treat those changes as a single coherent unit, not scattered micro-edits.
- Only keep backward compatibility where the plan explicitly calls for it.

## 3. Workflow for each item

For each item in the plan (in priority order), emit `[IMPLEMENTING] <ID> — <Title>` before starting.

1. **Understand the intent** — re-read the item's "What" and "Why". Inspect the referenced files and locations.

2. **Design the cohesive change** — identify all files and symbols affected (implementation, exports, tests, types, docs). Plan the minimal set of edits that fully realises this item.

3. **Edit the code**
   - Apply changes to implementation files under `packages/<name>/src/`.
   - Update public exports in `src/index.ts` (sorted, as required).
   - Update or add tests in `src/__tests__/` to reflect new behaviour.
   - Update types and JSDoc for all new or changed public APIs.

4. **Automated fixes and tests**
   - Run `pnpm --filter @vielzeug/<name> fix` to auto-fix lint/sort/format issues.
   - Run the test suite:

     ```bash
     pnpm vitest run packages/<name>/src/__tests__/
     ```

   - If tests fail, fix the underlying issue — never weaken tests.

5. **Monorepo stability** — if your change affects dependents, run the relevant tests. Do not revert via broad undo. Adjust and refine until dependents either work with the new API or are clearly documented as temporarily broken with a plan-accepted breaking change.

6. **Cross-package propagation (conditional)** — not optional for `Required` rows below; bugs and dead deps that exist in one package often exist in siblings.

   | Item category                              | Action                                                                 |
   | ------------------------------------------ | ---------------------------------------------------------------------- |
   | 🔴 Bug fix                                 | **Required** — grep all packages, fix all occurrences immediately      |
   | Dead-dep removal                           | **Required** — scan all `package.json` files for the same dead entry   |
   | 🟠 Design (type safety, naming, structure) | **Optional** — check dependents only (see dep graph in `catalogue.md`) |
   | 🟢 New feature / Enhancement               | **Skip** — by definition not present in siblings                       |
   | 🟡 Test / Coverage                         | **Skip** — tests are package-local                                     |

   For Required propagation, scope the grep to packages that transitively depend on `<name>` using the dependency graph in `.ai/rules/data/catalogue.md`. For each affected package, apply the same fix cohesively and run its tests. Record each propagated fix as a sub-item (e.g. `6.1 propagated to: ripple, courier`).

7. **Confirm completion** — emit `[DONE] <ID>` and output the item checkpoint.

## 4. Rules

- Treat `plan.md` as authoritative. If an item calls for a big refactor or API redesign, implement it fully, not superficially.
- Within each item, keep changes **cohesive but not gratuitously broad** — touch all code, tests, and docs needed, but do not refactor unrelated areas. Never implement an item partially: exports, tests, and types all update together, or the item isn't done.
- When adding or changing public APIs: export from `src/index.ts` in sorted order, add/update JSDoc, ensure types reflect intended usage.
- After all plan items are implemented:
  - Run `pnpm --filter @vielzeug/<name> fix`
  - Run `pnpm --filter @vielzeug/<name> lint`
  - Run the test suite (standard: `pnpm vitest run packages/<name>/src/__tests__/`; co-located e.g. `refine`: `pnpm --filter @vielzeug/<name> test`)
  - Generate a `rush change` file for the package (do **not** commit without user approval): `node scripts/rush-change.mjs <name> <patch|minor|major> "<summary>"`

## 5. Starting point

Before writing a single line of code:

1. Read the root `AGENTS.md`.
2. Read the persisted plan at `.ai/workflows/runs/<name>/plan.md`. This is the source of truth.
3. If no persisted plan exists, ask the user to provide one or offer to run `/pkg-plan` first.
4. Output the plan items you intend to implement (in order) so the user can intercept if scope is wrong.

Then execute item by item, emitting markers and checkpoints as described in §0. Keep `.ai/workflows/runs/<name>/progress.md` updated as items complete.

## 6. Quick reference — execution flow

```text
Read plan.md           → list items in order
    ↓
For each item:
  [IMPLEMENTING] <ID>
  ├─ Understand (re-read What/Why, inspect files)
  ├─ Design (identify all affected files)
  ├─ Edit (impl → exports → tests → types)
  ├─ pnpm fix (lint/sort/format)
  ├─ Run tests (fix failures — never weaken)
  ├─ Propagate (category gate → grep siblings → fix if Required)
  └─ [DONE] <ID> → Checkpoint
    ↓
Final verification:
  pnpm fix → pnpm lint → tests → rush change
    ↓
Update progress.md     → ✅ CHECKPOINT: complete
```
