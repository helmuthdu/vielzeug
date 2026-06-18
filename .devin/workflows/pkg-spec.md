---
description: Spec-first planning for adding a feature or creating a new Vielzeug package. Produces a plan.md compatible with /pkg-implement. Run 3 passes — requirements, API design, acceptance criteria.
---

# pkg-spec — Feature & New-Package Specification

You are a TypeScript library author and DX-focused software architect specifying a new feature or package in the **Vielzeug** monorepo.

## 0. Agent Execution Model

**This workflow is designed for autonomous agent execution across three sequential passes.** Follow these principles:

### Execution Checkpoints

After each pass, **output a checkpoint summary** before proceeding:

```
✅ CHECKPOINT: Pass N complete
- Mode: feature / new-package
- Requirements: N [REQ], N [CONSTRAINT], N [OUT-OF-SCOPE]  ← Pass 1
- API items: N [API], N [TYPE], N [ERROR], N [BREAKING]    ← Pass 2+
- Plan items: N (Pass 3 only)
- Proceeding to Pass N+1 / Writing plan.md
```

### Decision Framework

When facing ambiguity, apply this priority order:

1. **User value is the primary filter** — every plan item must solve a real problem or enable a real use case. No speculative features.
2. **Monorepo fit over maximum generality** — spec to Vielzeug conventions (zero runtime deps, tree-shakable, TypeScript strict, Vitest).
3. **Start narrow, design wide** — implement the minimal useful surface; move nice-to-haves to Future.
4. **API compatibility first (`feature` mode)** — new exports must not silently break existing consumers. Use `[BREAKING]` for anything that changes existing behavior; escalate before proceeding.
5. **When uncertain, read more** — use MCP tools or read source files rather than guessing at behavior.

### Anti-Patterns to Avoid

- ❌ **Do not** design APIs without reading existing package conventions first.
- ❌ **Do not** mix Pass 1 (requirements) with Pass 2 (API design) — requirements must be settled before API decisions.
- ❌ **Do not** reference phantom file paths — for `feature` mode, spot-check that all referenced files exist before writing `plan.md`.
- ❌ **Do not** write `plan.md` before completing all three passes.
- ❌ **Do not** omit the scaffold item (D1) for `new-package` mode — it is always the first plan item.
- ❌ **Do not** add runtime dependencies without explicit user instruction.
- ❌ **Do not** commit, push, or implement anything — this workflow is spec-only.

### Structured Output Markers

Use consistent markers throughout your analysis:

- `[REQ]` — confirmed requirement
- `[CONSTRAINT]` — hard constraint (zero-dep, browser compat, export shape, etc.)
- `[OUT-OF-SCOPE]` — explicitly excluded from this cycle
- `[API]` — proposed public export (function, class, constant)
- `[TYPE]` — proposed type or interface
- `[ERROR]` — proposed error class or error code
- `[BREAKING]` — item that changes an existing public export — must be escalated
- `[BLOCKED]` — cannot proceed without user input; present a recommendation
- `[VERIFY]` — requires runtime or external confirmation before committing

## 1. Context

Use this workflow when:
- **`feature` mode** — adding a new capability to an existing `packages/<name>` package
- **`new-package` mode** — creating a new `packages/<name>` package from scratch

This workflow produces a `plan.md` in `.devin/workflows/runs/<name>/` that is **format-compatible with `/pkg-implement`**. The output uses the same item structure (category emoji, ID, effort, breaking flag) so Phases 2–7 of `/pkg-workflow` consume it without modification.

**Monorepo constraints to honor (consult `.devin/rules/conventions.md` for the authoritative list):**

- Zero external runtime dependencies per package
- ESM + CJS dual-format build via `vite.config.ts`
- TypeScript strict mode (`tsconfig.json`)
- Vitest for tests; test files in `src/__tests__/`
- ESLint Perfectionist — sorted imports and object keys

**Before Pass 1:**

- `feature` mode: gather existing package context via MCP before reading files:
  ```
  mcp0_get-source(packageSlug: "<name>")
  mcp0_get-docs(packageSlug: "<name>", page: "api")
  ```
  Then read `src/index.ts` to confirm the current public surface.

- `new-package` mode: read:
  1. `.devin/rules/conventions.md` — scaffold structure, naming conventions, dependency graph
  2. A similar existing package for reference (e.g. `arsenal` for utilities, `ripple` for reactive state, `conduit` for resource management)

## 2. Design priorities

Apply these when evaluating API proposals in Pass 2:

1. **User value** — does this solve a real, concrete problem? Can you write three working examples?
2. **DX first** — easy to discover, hard to misuse, self-documenting via types.
3. **Minimal surface** — avoid YAGNI; a smaller, well-designed API is better than a large speculative one.
4. **Monorepo fit** — consistent with existing packages: camelCase functions, PascalCase types, `dispose/disposed/disposalSignal` for resources, `_warn.ts` for dev logging, no `get` prefix on simple accessors.
5. **Testability** — every export must be unit-testable without DOM or complex external setup.
6. **Framework-agnostic** — no framework coupling; future integrations stay straightforward.

## 3. Three-pass spec workflow

### Pass 1 — Requirements & scope

**Goal:** Define the "why" and "what" without making API decisions yet.

Answer these questions explicitly:

1. **Problem statement** — what concrete problem does this feature/package solve?
2. **Target users** — who will use this, and in what context?
3. **Core use cases** — write 3–5 concrete scenarios as mini-examples (prose or pseudocode).
4. **Scope boundary** — what is explicitly OUT of scope for this cycle?
5. **Integration points** — which existing packages does this depend on or integrate with?
6. **Constraints** — browser/server/universal? Sub-path exports needed? Zero-dep required?

Output each confirmed requirement as:

```
[REQ] R<N> — <one-line description>
Context: <why this is needed / which use case it enables>
```

Output each constraint as:

```
[CONSTRAINT] — <description>
Reason: <why this constraint applies>
```

Output out-of-scope items as:

```
[OUT-OF-SCOPE] — <description>
Reason: <why deferred to Future>
```

**Checkpoint:**

```
✅ CHECKPOINT: Pass 1 complete
- Mode: feature / new-package
- Requirements: N [REQ]
- Constraints: N [CONSTRAINT]
- Out of scope: N [OUT-OF-SCOPE]
- Proceeding to Pass 2
```

---

### Pass 2 — API design & types

**Goal:** Design the full public surface — names, signatures, types, errors.

Based on Pass 1 requirements, produce one block per proposed export:

**Function/class exports:**

```
[API] <name>(<params>): <return type>
Purpose: <one-line description>
Notes: <overloads, options object shape, edge cases, disposal pattern if applicable>
```

**Types and interfaces:**

```
[TYPE] <Name>
Fields:
  <field>: <type> — <description>
```

**Error types:**

```
[ERROR] <ClassName> extends <Base>
When: <condition that triggers this error>
Code: <optional string code, e.g. 'DISPOSED'>
```

**Breaking changes (escalate before proceeding):**

```
[BREAKING] <existing export> — <what changes>
Reason: <why the change is necessary>
Migration: <how callers update their code>
```

Apply these design checks for each `[API]` proposal:

- Naming consistent with existing packages? (`camelCase` functions, `PascalCase` types)
- 3+ parameters → options object
- Error types follow `@vielzeug/<name>Error` naming pattern
- Resources expose `dispose()`, `disposed: boolean`, `disposalSignal: AbortSignal`
- Dev logging via `_warn.ts` pattern (no `console.log` inline)
- For `feature` mode: do new exports compose cleanly with existing ones?

**Checkpoint:**

```
✅ CHECKPOINT: Pass 2 complete
- API exports: N [API]
- Types: N [TYPE]
- Errors: N [ERROR]
- Breaking changes: N [BREAKING] (use [ESCALATE] and wait if N > 0)
- Proceeding to Pass 3
```

---

### Pass 3 — Acceptance criteria & implementation plan

**Goal:** Translate the spec into a concrete, `/pkg-implement`-compatible plan.

**Actions:**

1. **Map each `[REQ]` and `[API]` to one or more plan items.** Each item gets:
   - Category: 🔴 Bug / 🟠 Design / 🟡 Coverage / 🟢 Feature
   - Sequential ID: `B1`, `D1`, `C1`, `F1`, etc.
   - Effort: S / M / L
   - Breaking flag
   - **Done-when** acceptance criteria (one or two concrete, verifiable conditions)

2. **For `new-package` mode:** the first item is always the scaffold:
   ```
   D1 — Scaffold package structure 🟠 (S)
   What: Create packages/<name>/ with all standard files
   Done when: pnpm --filter @vielzeug/<name> build passes with a stub src/index.ts
   ```

3. **Category guidance:**
   - 🟠 Design — API definitions, type declarations, error classes, architecture items (including scaffold)
   - 🟢 Feature — new functionality being implemented
   - 🟡 Coverage — test cases for the new feature
   - 🔴 Bug — correctness requirements that must be handled (e.g. edge cases identified in Pass 2)

4. **Spot-check** (`feature` mode only):
   - [ ] All referenced source files exist in `packages/<name>/src/`
   - [ ] All referenced function/type names exist in `src/index.ts`
   - [ ] No item modifies a symbol that was removed in a prior cycle

5. **Produce `plan.md`** (see §4 for format) and write it to `.devin/workflows/runs/<name>/plan.md`.

**Checkpoint:**

```
✅ CHECKPOINT: Pass 3 complete
- Plan items: N (X 🔴, Y 🟠, Z 🟡, W 🟢 Feature)
- Future improvements: N
- Spot-check: PASS / N/A (new-package)
- Writing plan.md…
```

## 4. Plan output format

Write `plan.md` to `.devin/workflows/runs/<name>/plan.md` using **exactly this format** — compatible with `/pkg-implement`:

```md
# <name> — <Feature Name | "New Package"> Spec Plan

## Baseline

- Tests: <N> passing, <F> files   ← write 0 / 0 for new-package
- Exports: <N> symbols in `src/index.ts`   ← write 0 for new-package
- Lint: clean   ← write N/A for new-package
- Build: clean   ← write N/A for new-package

## Spec Summary

<One to two paragraphs: what this feature/package does, who it is for, and the core use cases.>

## Requirements

| ID | Description | Status |
|----|-------------|--------|
| R1 | <requirement> | [REQ] |
| — | <item> | [CONSTRAINT] |
| — | <item> | [OUT-OF-SCOPE] |

## Proposed API

<List all [API], [TYPE], [ERROR] items from Pass 2 with exact signatures and JSDoc notes.>

## Implementation Plan

### D1 — Scaffold package structure 🟠   ← new-package only; omit for feature mode

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

### F1 — <Title>

- **Idea:** <high-level description>
- **Why:** <long-term DX/architecture benefit>
- **Risk/Cost:** <complexity and migration impact>
- **Prerequisites:** <groundwork needed first>

## Risks & Constraints

<Integration risks, breaking changes, cross-package implications.
Reference `.devin/rules/conventions.md` for the dependency graph — do not restate it here.>
```

**Overwrite policy:** always overwrite `plan.md` — never append. Historical plans are recoverable from git. Present the same content in chat as well.

## 5. Scaffolding reference (new-package mode)

When creating a new package (`new-package` mode), plan item D1 must produce these files:

```
packages/<name>/
  package.json          ← copy + adapt from a similar package; update name, version, description
  tsconfig.json         ← extends ../../tsconfig.json; include src/**/*.ts
  vite.config.ts        ← ESM + CJS dual build; lib.entry: src/index.ts
  src/
    index.ts            ← empty barrel with a single comment: // exports go here
    __tests__/
      <name>.test.ts    ← describe('<name>', () => { it.todo('baseline') })
  README.md             ← package name + one-liner + install snippet
```

After scaffold, also register the package in:

- **`rush.json`** — add an entry to the `projects` array following the existing pattern
- **`pnpm-workspace.yaml`** — verify the existing `packages/**` glob already covers it (no change needed in most cases)
- **`docs/.vitepress/config.ts`** — add a `resolve.alias` entry: `'@vielzeug/<name>': resolve(__dirname, '../../packages/<name>/src')`

Run `pnpm --filter @vielzeug/<name> build` to confirm the scaffold is correct before proceeding to Round 1 of Phase 2.

## 6. Quick Reference — Execution Flow

```
feature: Read existing API (MCP)      new-package: Read conventions.md + similar pkg
    ↓                                         ↓
Pass 1: Requirements & scope  → [REQ] / [CONSTRAINT] / [OUT-OF-SCOPE]    → Checkpoint
    ↓
Pass 2: API design & types    → [API] / [TYPE] / [ERROR] / [BREAKING]    → Checkpoint
    ↓
Pass 3: Acceptance criteria   → plan.md items with Done-when criteria     → Checkpoint
    ↓
Write plan.md                 → .devin/workflows/runs/<name>/plan.md
    ↓
Ask user                      → A/B/C prompt
```

## 7. Next step — implementation scope

After presenting the full spec plan, fill in the template below with concrete numbers from the plan you just wrote, then ask the user:

---

> **Ready to move on to implementation?**
>
> The spec plan contains **N items**:
> - 🟠 Design: N *(API/type definitions; scaffold for new-package)*
> - 🟢 Feature: N *(new functionality to implement)*
> - 🟡 Coverage: N *(tests to write)*
> - 🔴 Bug: N *(correctness requirements, if any)*
>
> ---
>
> The **Future improvements** section contains N ideas intentionally kept out of immediate scope:
> - F1 — \<title\> (\<effort S/M/L\>)
> - *(list all Future items with their IDs and one-line descriptions)*
>
> *(If empty: "The **Future improvements** section is empty — nothing to promote.")*
>
> ---
>
> Would you like to include any Future improvements in the upcoming implementation step?
>
> - **A — Implement as planned** — `/pkg-implement` works through the N items in sequence (🟠 scaffold/design first, then 🟢 Feature, then 🟡 Coverage). Nothing from Future is added.
> - **B — Promote specific Future items** — tell me which items by ID or name; I'll add them to the plan before closing. They will be implemented after the current items.
> - **C — Promote all Future items** — all N Future items move into the implementation plan and will be implemented in this cycle.
>
> Reply with A, B (+ item IDs or names), or C — or any other instructions before we proceed.
