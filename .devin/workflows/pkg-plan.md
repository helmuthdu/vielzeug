---
description: Analyse a Vielzeug package and produce a structured, DX- and architecture-focused improvement plan. Run 3 passes before any implementation work — each pass deepens the analysis with a greenfield mindset.
---

# pkg-plan — Package Analysis & Planning

You are a TypeScript library author and DX-focused software architect reviewing a package in the **Vielzeug** monorepo.

## 0. Agent Execution Model

**This workflow is designed for autonomous agent execution across three sequential passes.** Follow these principles:

### Execution Checkpoints

After each pass, **output a checkpoint summary** before proceeding to the next:

```
✅ CHECKPOINT: Pass N complete
- Findings: N issues (X 🔴 Bug, Y 🟠 Design, Z 🟡 Coverage, W 🟢 Enhancement)
- New since prior pass: [list or "N/A — first pass"]
- Deferred to Future: [list or "none"]
- Proceeding to Pass N+1 / Writing plan.md
```

This creates a traceable audit trail across the three passes and lets you track convergence.

### Decision Framework

When facing ambiguity, apply this priority order:

1. **Source code is truth** — if docs, tests, or comments disagree with implementation, implementation wins.
2. **Design priorities (§1) are the filter** — evaluate every finding against DX, simplicity, and architectural clarity.
3. **Greenfield mindset overrides preservation bias** — if an abstraction hurts more than it helps, recommend removal even if it means rewriting dependants.
4. **Minimal scope creep** — a plan item must be actionable by `/pkg-implement`. Avoid "investigate X" items; convert them to concrete findings or defer.
5. **When uncertain, read more** — use MCP tools or read source files before guessing at behaviour.

### Conflict Resolution

When multiple approaches or conflicting suggestions exist for a single problem:

1. **Evaluate against the "Best Version" criteria** — prioritize the option that minimizes cyclomatic complexity, maximizes readability for a mid-level developer, and adheres strictly to the greenfield mindset in §1.
2. **Apply the Rule of Least Surprise** — if two suggestions are equally valid but conflict, choose the pattern most idiomatic to modern TypeScript/JavaScript: the one that requires the least "mental map" to understand and that a reader fluent in the ecosystem would reach for first.
3. **Avoid "Design by Committee"** — do not implement multiple alternatives or leave "choose your own adventure" patterns in the plan. Make a single definitive architectural decision. When hesitant, choose the path that results in the thinnest possible implementation — the code that does the most with the fewest moving parts.
4. **Document the "Why"** — for every significant architectural choice surfaced during planning, note in the plan item's **Why** field the rationale for the chosen pattern. When that choice lands in source during `/pkg-implement`, a brief high-level comment should accompany the affected module.

### Anti-Patterns to Avoid

- ❌ **Do not** invent issues not grounded in actual source code.
- ❌ **Do not** reference phantom file paths or stale function names — spot-check before writing `plan.md`.
- ❌ **Do not** do Pass 2 work (refining) during Pass 1 (discovery), or Pass 3 work (ranking) during Pass 2.
- ❌ **Do not** promote every finding to the improvement plan — defer low-value or high-risk items to Future.
- ❌ **Do not** write `plan.md` before completing all three passes.
- ❌ **Do not** skip the spot-check before writing `plan.md` — phantom paths waste a full implementation round.

### Structured Output Markers

Use consistent markers throughout your analysis:

- `[ISSUE]` — concrete gap or problem found in source
- `[CANDIDATE]` — potential improvement item, not yet ranked
- `[PROMOTED]` — item moved from Future into the immediate plan
- `[DEFERRED]` — item placed in Future improvements
- `[BLOCKED]` — cannot resolve without user input; present recommendation
- `[VERIFY]` — requires runtime or external confirmation

## 1. Context

- Monorepo of 24 zero-dependency, tree-shakable TypeScript packages under `packages/`
- Each package: `src/index.ts` (public API), `src/__tests__/` (Vitest), `vite.config.ts` (ESM+CJS), `tsconfig.json` (strict)
- Zero external deps per package; inter-package `workspace:*` deps are allowed
- ESLint Perfectionist enforces sorted imports/keys — run `pnpm fix` to auto-sort
- Prettier: 120-char width, 2-space indent, trailing commas
- Rush orchestrates the monorepo; `pnpm test` runs all tests via Vitest
- **Canonical context** — conventions, package catalogue, and the dependency graph live in `.devin/rules/conventions.md`. Consult it; do not duplicate or restate it.
- **Read the DOX chain first** — before analysing, read the root `AGENTS.md`, then `packages/AGENTS.md`, then `packages/<name>/AGENTS.md` if it exists. Honour any local contract (e.g. `sigil` bundles `lucide` and co-locates tests; `craft`/`sigil` have multiple sub-path exports).
- **Prefer the `@vielzeug` MCP for context** to gather API/doc context efficiently before reading source file-by-file. Use `get-docs` and `get-source` for most packages; for `sigil` use `list-components` / `get-component`.
- **Scope large packages.** For big packages (e.g. `sigil`, with 70+ component files), analyse one category/area per pass rather than reading the whole `src/` tree at once.

## 1. Design priorities and mindset

Apply these principles throughout the analysis:

1. **Developer Experience (DX) first**
   - Onboarding: how quickly can a new user understand and use `packages/<name>` from `src/index.ts` and tests?
   - Debuggability: clarity of error messages, stack traces, and failure modes.
   - Local usage and testability: easy to test, mock, and integrate.

2. **Simplicity & minimal abstractions**
   - Prefer clean, minimal, and easy-to-understand solutions.
   - Remove unnecessary layers, abstractions, and indirection where possible.
   - Avoid YAGNI and premature flexibility.

3. **Greenfield mindset**
   - Assume this is a greenfield project.
   - Breaking changes, refactors, and redesigns are acceptable.
   - Challenge existing assumptions instead of preserving the current design by default.
   - If a pattern or abstraction hurts more than it helps, recommend its removal even if dependent code must be rewritten.

4. **Maintainability & architectural clarity**
   - Favor clear boundaries, minimal coupling, and explicit data flow.
   - Optimize for long-term maintainability and change confidence.

5. **Framework-agnostic**
   - Minimize coupling to specific frameworks.
   - Make future framework integrations straightforward.

## 2. Phase 1 — Three-pass analysis workflow

Run three passes over `packages/<name>/src/` before any implementation:

### Pass 1 — Greenfield architecture & API review

**Goal:** Discover raw findings with a fresh eye. Do not rank or deduplicate yet.

**Before starting:**

1. **Check for a prior cycle** — if `runs/<name>/plan.md` exists, read its `Future improvements` section. Tag still-valid items as `[PROMOTED]` candidates for this run.
2. **Gather API context** — prefer `mcp0_get-source` (`packageSlug: "<name>"`) over reading files one-by-one. Follow up with `mcp0_get-docs` for documented behaviour.
3. **Read the DOX chain** — root `AGENTS.md` → `packages/AGENTS.md` → `packages/<name>/AGENTS.md` (if present).

Treat the package as if designing it from scratch. Focus on:

- Architecture and internal structure
- Public API design and ergonomics
- Simplicity vs unnecessary complexity and abstractions
- High-level DX (onboarding, conceptual clarity, error model)

**Output each finding as:**

```
[ISSUE] <Category> — <Title>
Location: <file>:<approx lines or function name>
Problem: <what is wrong>
Impact: <who is affected and how>
```

**Checkpoint:**

```
✅ CHECKPOINT: Pass 1 complete
- Findings: N (X 🔴, Y 🟠, Z 🟡, W 🟢)
- Prior-cycle promotions: [list or "none"]
- Proceeding to Pass 2
```

### Pass 2 — DX, simplification, and maintainability deep-dive

**Goal:** Refine Pass 1 findings, discover gaps missed in the first sweep, and identify concrete simplification opportunities.

Based on Pass 1's findings:

- Prioritize **Developer Experience (DX)** improvements.
- Reduce nesting, magic, duplication, and incidental complexity.
- Refine architecture boundaries and coupling points.
- Improve maintainability, testability, and change confidence.

**For each Pass 1 finding**, apply this decision:

```
Is the finding actionable for /pkg-implement?
├─ YES → keep as [CANDIDATE], add "Where" and "Effort"
└─ NO → Is it a valuable longer-term idea?
         ├─ YES → mark [DEFERRED] for Future improvements
         └─ NO → discard (note as dropped with reason)
```

Also actively look for:

- Missing tests for exported symbols
- Error messages that are unclear or unhelpful
- Type-level issues (`any`, overly broad casts, non-null assertions)
- Duplicated logic that could be a shared internal helper

**Checkpoint:**

```
✅ CHECKPOINT: Pass 2 complete
- Refined candidates: N
- New findings this pass: [list]
- Deferred to Future: [list or "none"]
- Dropped: [list with reason or "none"]
- Proceeding to Pass 3
```

### Pass 3 — Synthesis into a single improvement plan

**Goal:** Produce the final ranked, verified, actionable plan.

**Actions:**

1. **Consolidate** — deduplicate candidates from Passes 1 and 2 into a single flat list.
2. **Rank** — order by impact × effort using the design priorities in §1:
   - Bugs (🔴) always come first regardless of effort.
   - Within a category, high-impact low-effort items precede high-effort ones.
3. **Assign labels** — each item gets: category emoji, sequential ID (B1, D1, C1, E1…), effort (S/M/L), breaking flag.
4. **Spot-check** — before writing `plan.md`, verify:

   - [ ] Every file path exists in `packages/<name>/src/`
   - [ ] Every function/export name exists in `src/index.ts` or the named source file
   - [ ] Approximate line ranges are in the right ballpark (±20 lines is fine)
   - [ ] No item references a symbol that was already removed in a prior cycle

5. **Produce the final structured plan** (see §5 for format).

**Checkpoint:**

```
✅ CHECKPOINT: Pass 3 complete
- Final plan: N items (X 🔴, Y 🟠, Z 🟡, W 🟢)
- Future improvements: N items
- Spot-check: PASS (all paths/names verified)
- Writing plan.md…
```

## 3. Analysis dimensions (per pass)

For the currently analyzed package (`packages/<name>`), review **`src/`** with focus on:

### 3.1 Current state assessment

Assess and describe:

- **Public API surface (`src/index.ts`)**
  - Completeness: are important capabilities hidden behind non-exported functions?
  - Consistency: naming conventions, parameter ordering, return types, sync/async patterns.
  - Ergonomics: defaults, overloads, error handling, configuration shapes, discoverability.

- **Implementation quality**
  - Correctness and edge cases (boundary conditions, invalid inputs, concurrency/async, race conditions).
  - Performance characteristics where relevant (hot paths, avoid unnecessary allocations, repeated work).
  - Simplicity: avoid over-abstraction, unnecessary indirection, and "clever" code.

- **Developer Experience**
  - How easily a new user can:
    - Discover main entry points.
    - Understand behavior from types, JSDoc, and tests.
    - Reason about failure modes and error messages.
  - Clarity and usefulness of error messages and invariants.

- **Test coverage**
  - What scenarios are covered or missing.
  - Untested exports, especially in `src/index.ts`.
  - Brittle or overly indirect tests (tests hitting too many layers at once).

- **Documentation alignment**
  - Does the documentation (README, JSDoc, comments, examples) match actual behaviour?
  - Are there undocumented footguns or surprising behaviours?

- **TypeScript strictness**
  - Usage of `any`, `unknown`, `as` casts, non-null assertions (`!`), and overly broad types.
  - Quality of public types (naming, reusability, how they guide correct usage).
  - Whether types encourage correct usage patterns and make incorrect usage hard.

- **Architectural clarity**
  - Cohesion within the package: do modules and files have clear responsibilities?
  - Coupling: unnecessary dependencies between modules or on other packages.
  - Data flow: how data and control move through the package; any hidden global state or side effects.

### 3.2 Identified gaps and issues

List every concrete gap or issue. For each, assign a category:

- 🔴 **Bug** — incorrect behavior
- 🟠 **Design** — API inconsistency, architectural smell, poor ergonomics, or confusing abstraction
- 🟡 **Coverage** — missing or brittle test, missing or misleading doc
- 🟢 **Enhancement** — new capability or DX improvement worth adding

Each item should include:

- **Problem**: a concise description of what is wrong today.
- **Location**: concrete file(s) and, if possible, approximate line ranges or function names.
- **Impact**: who is affected and how (user-facing, internal maintainers, performance, DX).

Be explicit when an issue suggests that an existing abstraction or pattern should be removed entirely.

### 3.3 Improvement plan

Produce a **prioritized, numbered list** of actionable items.

Each item must include:

- **What**: concise description of the change (API design, refactor, test addition, doc update, deletion of an abstraction, etc.).
- **Why**: motivation, focusing on DX, simplicity, architecture clarity, correctness, or performance.
- **Where**: specific file(s) and approximate line ranges or function names to change.
- **Effort**: S / M / L, relative to the package.
- **Category**: 🔴 Bug / 🟠 Design / 🟡 Coverage / 🟢 Enhancement.
- **Example (if relevant)**: short before/after sketch of the API or code.
- **Breaking?**: explicitly state whether this item is a breaking change for public consumers.

Guidelines for this plan:

- Prioritize high-value-to-effort improvements.
- Favor changes that improve both maintainability and usability.
- Do not hesitate to propose **breaking changes, refactors, or deletions** when they significantly improve DX and architecture.
- Call out items that require coordinated work across packages (e.g., updating dependants).

### 3.4 Future improvements (longer-term)

Add a separate section for **larger, longer-term changes** that are valuable but may be out of immediate scope.

For each:

- **Idea**: high-level description.
- **Why**: long-term DX/architecture benefits.
- **Risk/Cost**: rough sense of complexity, migration impact, and coordination needs.
- **Prerequisites**: any groundwork that should be done first (e.g., smaller refactors or API cleanups).

## 4. Risks & constraints

Consult the canonical dependency graph in `.devin/rules/conventions.md` (section "Package dependency graph") before suggesting breaking changes or major refactors. Do not restate it here — it is maintained in one place to avoid drift.

Document:

- Potential downstream breakage in dependent packages.
- Migration considerations and suggested mitigation strategies (e.g. phased deprecation, adapters, or temporary compatibility shims) where you recommend preserving compatibility.
- Where you explicitly recommend **not** keeping compatibility because the new design is significantly better, note that clearly.
- Any cross-package architectural implications that should be addressed in follow-up work.

**Escalate, don't assume.** If the analysis surfaces a material breaking change to dependents, genuinely ambiguous requirements, or a decision with significant migration cost, call it out explicitly and ask the user before treating it as settled — present a recommendation rather than silently committing to a large path.

## 5. Output format

After the three passes and synthesis, write `plan.md` with **exactly these sections** in order:

````md
# <name> — Improvement Plan

## Baseline

- Tests: <N> passing, <F> files
- Exports: <N> symbols in `src/index.ts`
- Lint: clean / <N> errors
- Build: clean / errors

## Current State Assessment

<Structured assessment covering: API surface, implementation quality, DX, test coverage,
documentation alignment, TypeScript strictness, architectural clarity.>

## Identified Gaps & Issues

| ID  | Category  | Title   | Location        | Impact |
| --- | --------- | ------- | --------------- | ------ |
| B1  | 🔴 Bug    | <title> | `file.ts:~L100` | High   |
| D1  | 🟠 Design | <title> | `file.ts:~L200` | Medium |
| ... |           |         |                 |        |

## Improvement Plan

### B1 — <Title> 🔴

- **What:** <concise change description>
- **Why:** <motivation — DX, correctness, simplicity>
- **Where:** `packages/<name>/src/<file>.ts` — `functionName()` (~L100)
- **Effort:** S / M / L
- **Breaking?:** Yes — <describe breakage> / No
- **Example:**
  ```ts
  // Before
  ...
  // After
  ...
  ```
````

### D1 — <Title> 🟠

...

## Future Improvements

### F1 — <Title>

- **Idea:** <high-level description>
- **Why:** <long-term DX/architecture benefit>
- **Risk/Cost:** <complexity + migration impact>
- **Prerequisites:** <groundwork needed first>

## Risks & Constraints

<Downstream breakage, migration considerations, cross-package implications.
Reference `.devin/rules/conventions.md` for the dependency graph — do not restate it.>

```

Be specific — reference file paths, function names, and type signatures wherever possible. Do **not** start implementing anything yet.

### Persist the plan

Write the final plan to `.devin/workflows/runs/<name>/plan.md` so `/pkg-implement` and later sessions can consume it. Follow the DOX chain first: read the root `AGENTS.md`, then `.devin/workflows/runs/AGENTS.md`, and honour their contracts.

**Overwrite policy:** always overwrite `plan.md` — never append or keep a previous cycle's content inline. If a `plan.md` already exists from a prior cycle, that is stale data; replace it entirely with the new plan. Historical plans are recoverable from git if needed. Present the same content in the chat as well.

**Baseline metrics:** record the current state before any changes at the top of `plan.md`: passing test count, test file count, exported-symbol count from `src/index.ts`, lint status, and build status. This makes the plan self-contained for standalone `/pkg-plan` + `/pkg-implement` runs that don't go through `/pkg-workflow`.

## 6. Quick Reference — Execution Flow

```

Pass 1: Architecture review → raw [ISSUE] list → Checkpoint
↓
Pass 2: DX deep-dive → [CANDIDATE] list → Checkpoint
↓
Pass 3: Synthesis & ranking → spot-check paths → Checkpoint
↓
Write plan.md → structured artifact
↓
Ask user → A/B/C prompt

```

## 7. Next step — implementation scope

After presenting the full plan, fill in the template below with concrete numbers from the plan you just wrote, then ask the user:

---

> **Ready to move on to implementation?**
>
> The improvement plan contains **N items**:
> - 🔴 Bug: N
> - 🟠 Design: N
> - 🟡 Coverage: N
> - 🟢 Enhancement: N
>
> ---
>
> The **Future improvements** section contains N ideas intentionally kept out of immediate scope:
> - F1 — \<title\> (\<effort S/M/L\>)
> - F2 — \<title\> (\<effort S/M/L\>)
> - *(list all Future items with their IDs and one-line descriptions)*
>
> *(If the Future section is empty, write: "The **Future improvements** section is empty — nothing to promote.")*
>
> ---
>
> Would you like to include any Future improvements in the upcoming implementation step?
>
> - **A — Implement as planned** — `/pkg-implement` works through the N items above in priority order (🔴 first, then 🟠, 🟡, 🟢). Nothing from Future is added.
> - **B — Promote specific Future items** — tell me which items by ID or name; I'll add them to the plan before closing. They will be implemented after the current priority items.
> - **C — Promote all Future items** — all N Future items move into the implementation plan and will be implemented in this cycle. Effort and risk will increase accordingly.
>
> Reply with A, B (+ item IDs or names), or C — or any other instructions before we proceed.
```
