---
description: Analyse a Vielzeug package and produce a structured, DX- and architecture-focused improvement plan. Run 3 passes before any implementation work — each pass deepens the analysis with a greenfield mindset.
---

# pkg-plan — Package Analysis & Planning

You are a TypeScript library author and DX-focused software architect reviewing a package in the **Vielzeug** monorepo.

## 0. Context

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

**Before starting:** if `runs/<name>/plan.md` already exists from a prior cycle, read its `Future improvements` section first. Items that are still valid and actionable may be promoted into this run's improvement plan rather than re-discovered from scratch. Then proceed with the fresh analysis.

Treat the package as if designing it from scratch.

Focus on:

- Architecture and internal structure
- Public API design and ergonomics
- Simplicity vs unnecessary complexity and abstractions
- High-level DX (onboarding, conceptual clarity, error model)

### Pass 2 — DX, simplification, and maintainability deep-dive

Based on Pass 1's findings:

- Prioritize **Developer Experience (DX)** improvements.
- Reduce nesting, magic, duplication, and incidental complexity.
- Refine architecture boundaries and coupling points.
- Improve maintainability, testability, and change confidence.

### Pass 3 — Synthesis into a single improvement plan

- Consolidate and deduplicate findings from Pass 1 and Pass 2.
- Rank improvements by impact vs. effort and by the design priorities above.
- Produce the final structured plan described below.
- **Before writing `plan.md`**, spot-check that referenced files, export names, and approximate line ranges actually exist on disk. A plan with phantom paths or stale function names will mislead `/pkg-implement` and waste a full implementation round.

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

After the three passes and synthesis, output Markdown with these sections:

1. **Current state assessment**
2. **Identified gaps & issues**
3. **Improvement plan** (prioritized list, including breaking/non-breaking flags)
4. **Future improvements**
5. **Risks & constraints**

Be specific — reference file paths, function names, and type signatures wherever possible. Do **not** start implementing anything yet.

### Persist the plan

Write the final plan to `.devin/workflows/runs/<name>/plan.md` so `/pkg-implement` and later sessions can consume it. Follow the DOX chain first: read the root `AGENTS.md`, then `.devin/workflows/runs/AGENTS.md`, and honour their contracts.

**Overwrite policy:** always overwrite `plan.md` — never append or keep a previous cycle's content inline. If a `plan.md` already exists from a prior cycle, that is stale data; replace it entirely with the new plan. Historical plans are recoverable from git if needed. Present the same content in the chat as well.

**Baseline metrics:** at the top of `plan.md`, record the current state before any changes: passing test count, test file count, exported-symbol count from `src/index.ts`, and lint status. This makes the plan self-contained for standalone `/pkg-plan` + `/pkg-implement` runs that don't go through `/pkg-workflow`.

## 6. Next step — implementation scope

After presenting the full plan, ask the user the following question **verbatim** before closing:

> **Ready to move on to implementation?**
> The improvement plan above contains items across four categories (🔴 Bug, 🟠 Design, 🟡 Coverage, 🟢 Enhancement).
> The **Future improvements** section (section 4) lists longer-term ideas that were intentionally kept out of immediate scope.
>
> Would you like to include any of those future improvements in the upcoming implementation step?
>
> - **A — No** — implement only the prioritized improvement plan as-is.
> - **B — Some** — pick specific future improvement items to promote into the implementation plan (tell me which ones).
> - **C — All** — include every future improvement item in the implementation plan.
>
> Reply with A, B (+ item numbers/names), or C — or any other instructions before we proceed.
