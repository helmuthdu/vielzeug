# pkg-plan — Package Planning

> **Canonical source:** This file is the single source of truth for all AI tools. Generated, gitignored stubs in `.claude/commands/` and `.devin/workflows/` delegate here (see `.ai/workflows/manifest.json` + `pnpm gen:workflow-docs`); `.junie/guidelines.md` links here directly with no stub file.

You are a TypeScript library author and DX-focused software architect planning work on a **Vielzeug** package.

## Modes

| Mode                | Use when                                             | Pass structure                                              |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| `analyse` (default) | Existing package improvement                         | arch review → DX deep-dive → synthesis → `plan.md`          |
| `feature`           | Adding a specific new feature to an existing package | requirements → API design → acceptance criteria → `plan.md` |
| `new-package`       | Creating a new package from scratch                  | requirements → API design → acceptance criteria → `plan.md` |

**Phases 2–7 of `/pkg-workflow` consume `plan.md` identically regardless of mode.** The output format is shared.

## 0. Agent execution model

Follow `.ai/rules/agent-execution.md` for universal principles, decision framework, anti-patterns, and convergence rules. This section defines only workflow-specific markers.

### Workflow-specific markers

| Marker           | Meaning                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `[ISSUE]`        | Concrete gap or problem found in source                                  |
| `[CANDIDATE]`    | Potential improvement item, not yet ranked                               |
| `[PROMOTED]`     | Item moved from Future into the immediate plan                           |
| `[REQ]`          | Confirmed requirement (spec modes)                                       |
| `[CONSTRAINT]`   | Hard constraint — zero-dep, browser compat, export shape (spec modes)    |
| `[OUT-OF-SCOPE]` | Explicitly excluded from this cycle                                      |
| `[API]`          | Proposed public export — function, class, or constant (spec modes)       |
| `[TYPE]`         | Proposed type or interface (spec modes)                                  |
| `[ERROR]`        | Proposed error class (spec modes)                                        |
| `[BREAKING]`     | Item that changes an existing public export — escalate before proceeding |

### Execution checkpoints

After each pass, output a checkpoint summary before proceeding:

**`analyse` mode:**

```
✅ CHECKPOINT: Pass N complete
- Findings: N issues (X 🔴 Bug, Y 🟠 Design, Z 🟡 Coverage, W 🟢 Enhancement)
- New since prior pass: [list or "N/A — first pass"]
- Deferred to Future: [list or "none"]
- Proceeding to Pass N+1 / Writing plan.md
```

**`feature` / `new-package` mode:**

```
✅ CHECKPOINT: Pass N complete
- Mode: feature / new-package
- Requirements: N [REQ], N [CONSTRAINT], N [OUT-OF-SCOPE]  ← Pass 1
- API items: N [API], N [TYPE], N [ERROR], N [BREAKING]    ← Pass 2+
- Plan items: N (Pass 3 only)
- Proceeding to Pass N+1 / Writing plan.md
```

## 1. Context

Monorepo conventions → `.ai/rules/conventions.md`
Package catalogue and dependency graph → `.ai/rules/catalogue.md`
Toolchain commands → `.ai/rules/workspace.md`

Read the DOX chain before analyzing: root `AGENTS.md` → `packages/AGENTS.md` → `packages/<name>/AGENTS.md` (if present). Honor any local contracts.

**Before starting any pass:**

- **`analyse` / `feature` mode** — prefer the `@vielzeug` MCP's source-lookup tool (`packageSlug: "<name>"`) over reading files one-by-one, then its docs-lookup tool for documented behaviour. Resolve exact tool names from your client's MCP tool list — don't assume a fixed prefix (e.g. `mcp0_`).
- **`new-package` mode** — read a similar existing package for reference (e.g. `spell` for standard packages, `arsenal` for utilities, `ripple` for reactive state).
- **Prior cycle** — if `runs/<name>/plan.md` exists, read its `Future improvements` section and tag still-valid items as `[PROMOTED]` candidates.
- **Scope large packages** (e.g. `refine`, 70+ component files) — analyse one category/area per pass rather than the whole `src/` tree at once.

## 2. Design priorities

Apply throughout all passes and modes:

1. **Developer Experience (DX) first** — onboarding speed, error message clarity, debuggability, testability.
2. **Simplicity & minimal abstractions** — prefer clean solutions; remove unnecessary layers and indirection; avoid YAGNI.
3. **Greenfield mindset** — breaking changes, refactors, and redesigns are acceptable; challenge existing assumptions rather than preserving them.
4. **Maintainability & architectural clarity** — clear boundaries, minimal coupling, explicit data flow.
5. **Framework-agnostic** — no framework coupling; future integrations stay straightforward.
6. **User value** (spec modes) — every plan item must solve a real problem. Write three working examples before accepting a requirement.

**Conflict resolution:** when two approaches conflict, choose the pattern that minimizes cyclomatic complexity and requires the least "mental map" for a mid-level developer. Make a single definitive decision — no "choose your own adventure" items in the plan.

## 3. Three-pass workflow

Three passes (discover → refine → synthesize) is the default shape for a mid-size package. For a small package (roughly <10 exports), it's fine to move faster and merge Pass 1+2 into a single discover-and-rank sweep before synthesis — you still need a synthesis pass to produce `plan.md`, but don't manufacture filler findings in a separate pass just to hit 3. For a large or unusually messy package, add an extra discovery pass rather than cramming — see `.ai/rules/agent-execution.md § Multi-pass convergence`.

### `analyse` mode

#### Pass 1 — Greenfield architecture & API review

**Goal:** Discover raw findings with a fresh eye. Do not rank or deduplicate yet.

Treat the package as if designing it from scratch. Focus on:

- Architecture and internal structure
- Public API design and ergonomics
- Simplicity vs unnecessary complexity and abstractions
- High-level DX (onboarding, conceptual clarity, error model)

Output each finding as:

```
[ISSUE] <Category> — <Title>
Location: <file>:<approx lines or function name>
Problem: <what is wrong>
Impact: <who is affected and how>
```

#### Pass 2 — DX, simplification, and maintainability deep-dive

**Goal:** Refine Pass 1 findings, discover gaps missed in the first sweep, and identify concrete simplification opportunities.

For each Pass 1 finding, apply this decision:

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

#### Pass 3 — Synthesis into a single improvement plan

**Goal:** Produce the final ranked, verified, actionable plan.

1. **Consolidate** — deduplicate candidates from Passes 1 and 2 into a single flat list.
2. **Rank** — order by impact × effort using the design priorities in §2. Bugs (🔴) always come first.
3. **Assign labels** — category emoji, sequential ID (B1, D1, C1, E1…), effort (S/M/L), breaking flag.
4. **Spot-check** before writing `plan.md`:
   - [ ] Every file path exists in `packages/<name>/src/`
   - [ ] Every function/export name exists in `src/index.ts` or the named source file
   - [ ] Approximate line ranges are in the right ballpark (±20 lines is fine)
   - [ ] No item references a symbol removed in a prior cycle
5. **Produce the final structured plan** (see §6 for format).

---

### `feature` and `new-package` modes

#### Pass 1 — Requirements & scope

**Goal:** Define the "why" and "what" without making API decisions yet.

Answer these questions explicitly:

1. **Problem statement** — what concrete problem does this feature/package solve?
2. **Target users** — who will use this, and in what context?
3. **Core use cases** — write 3–5 concrete scenarios as mini-examples (prose or pseudocode).
4. **Scope boundary** — what is explicitly OUT of scope for this cycle?
5. **Integration points** — which existing packages does this depend on or integrate with?
6. **Constraints** — browser/server/universal? Sub-path exports needed? Zero-dep required?

Output confirmed requirements as:

```
[REQ] R<N> — <one-line description>
Context: <why this is needed / which use case it enables>
```

Output constraints as:

```
[CONSTRAINT] — <description>
Reason: <why this constraint applies>
```

Output out-of-scope items as:

```
[OUT-OF-SCOPE] — <description>
Reason: <why deferred to Future>
```

#### Pass 2 — API design & types

**Goal:** Design the full public surface — names, signatures, types, errors.

Based on Pass 1 requirements, produce one block per proposed export:

```
[API] <name>(<params>): <return type>
Purpose: <one-line description>
Notes: <overloads, options object shape, edge cases, disposal pattern if applicable>
```

```
[TYPE] <Name>
Fields:
  <field>: <type> — <description>
```

```
[ERROR] <ClassName> extends <Base>
When: <condition that triggers this error>
Code: <optional string code>
```

For breaking changes, emit `[BREAKING]` and use `[ESCALATE]` — do not proceed until the user approves.

Apply these checks for each `[API]`:

- Naming consistent with existing packages? (`camelCase` functions, `PascalCase` types)
- 3+ parameters → options object
- Error types follow `<Pkg>Error` naming pattern
- Resources expose `dispose()`, `disposed: boolean`, `disposalSignal: AbortSignal`
- No inline `console.log` — use `_warn.ts` pattern

#### Pass 3 — Acceptance criteria & implementation plan

**Goal:** Translate the spec into a concrete, `/pkg-implement`-compatible plan.

Map each `[REQ]` and `[API]` to one or more plan items. Each item gets:

- Category: 🔴 Bug / 🟠 Design / 🟡 Coverage / 🟢 Feature
- Sequential ID: `B1`, `D1`, `C1`, `F1`, etc.
- Effort: S / M / L
- Breaking flag
- **Done-when** acceptance criteria (one or two concrete, verifiable conditions)

**`new-package` mode:** the first item is always the scaffold:

```
D1 — Scaffold package structure 🟠 (S)
What: Create packages/<name>/ with all standard files
Done when: pnpm --filter @vielzeug/<name> build passes with a stub src/index.ts
```

Spot-check (`feature` mode only): verify all referenced source files and symbols exist before writing `plan.md`.

## 4. Analysis dimensions (analyse mode only)

> This section applies to `analyse` mode. Skip to §5 if running `feature` or `new-package` mode.

For the currently analyzed package (`packages/<name>`), review `src/` with focus on:

### 4.1 Public API surface (`src/index.ts`)

- Completeness: are important capabilities hidden behind non-exported functions?
- Consistency: naming conventions, parameter ordering, return types, sync/async patterns.
- Ergonomics: defaults, overloads, error handling, configuration shapes, discoverability.

### 4.2 Implementation quality

- Correctness and edge cases (boundary conditions, invalid inputs, concurrency/async, race conditions).
- Performance characteristics where relevant (hot paths, avoid unnecessary allocations).
- Simplicity: avoid over-abstraction, unnecessary indirection, and "clever" code.

### 4.3 Developer experience

- How easily a new user can discover main entry points, understand behavior from types/tests, and reason about failure modes.
- Clarity and usefulness of error messages.

### 4.4 Test coverage

- Scenarios covered or missing. Untested exports (especially in `src/index.ts`).
- Brittle or overly indirect tests.

### 4.5 Documentation alignment

- Does documentation (JSDoc, comments, examples) match actual behaviour?
- Undocumented footguns or surprising behaviours?

### 4.6 TypeScript strictness

- Usage of `any`, `unknown`, `as` casts, non-null assertions, overly broad types.
- Whether types encourage correct usage and make incorrect usage hard.

### 4.7 Architectural clarity

- Cohesion: do modules and files have clear responsibilities?
- Coupling: unnecessary dependencies between modules or on other packages.
- Data flow: any hidden global state or side effects?

### 4.8 Identified gaps

For each issue, assign a category:

- 🔴 **Bug** — incorrect behavior
- 🟠 **Design** — API inconsistency, architectural smell, poor ergonomics
- 🟡 **Coverage** — missing or brittle test, missing or misleading doc
- 🟢 **Enhancement** — new capability or DX improvement

## 5. Risks & constraints

Consult `.ai/rules/catalogue.md` for the dependency graph before suggesting breaking changes. Do not restate it here.

Document potential downstream breakage in dependent packages and migration considerations. **Escalate, don't assume** — surface material breaking changes and ask the user before treating them as settled.

## 6. Output format

After the passes converge, write `plan.md` to `.ai/workflows/runs/<name>/plan.md`. Read the root `AGENTS.md` first. **Always overwrite** — never append. `runs/` is gitignored scratch state, not history (see `.ai/workflows/runs/AGENTS.md`) — once overwritten, a prior plan is gone unless the user copied it out first.

See `.ai/rules/plan-template.md` for the complete `plan.md` structure for both `analyse` and `feature`/`new-package` modes.

## 7. Scaffolding reference (`new-package` mode)

See `.ai/rules/workspace.md § New-package scaffolding` for the complete file list and registration steps.

## 8. Next step — implementation scope

After writing `plan.md`, fill in the template below and ask the user:

---

> **Ready to move on to implementation?**
>
> The plan contains **N items**:
>
> - 🔴 Bug: N
> - 🟠 Design: N
> - 🟡 Coverage: N
> - 🟢 Enhancement / Feature: N
>
> The **Future improvements** section contains N ideas intentionally kept out of immediate scope:
>
> - FUT1 — \<title\> (\<effort S/M/L\>)
>
> Would you like to include any Future improvements?
>
> - **A — Implement as planned** — `/pkg-implement` works through the N items in priority order.
> - **B — Promote specific Future items** — tell me which items by ID; I'll add them before closing.
> - **C — Promote all Future items** — all N items move into the immediate plan.
>
> Reply with A, B (+ item IDs), or C — or any other instructions before we proceed.

Note for the agent: list all Future items. If none exist, write: "The **Future improvements** section is empty."

## 9. Quick reference — execution flow

```
analyse:    Read DOX chain → gather API/docs (MCP) → check prior cycle Future items
feature:    Read DOX chain → gather existing API/docs (MCP) → check prior cycle Future items
new-pkg:    Read DOX chain → read conventions/catalogue + similar package
    ↓
Pass 1 →  Checkpoint
    ↓
Pass 2 →  Checkpoint
    ↓
Pass 3 →  spot-check → Checkpoint
    ↓
Write plan.md → .ai/workflows/runs/<name>/plan.md
    ↓
Ask user → A/B/C prompt
```
