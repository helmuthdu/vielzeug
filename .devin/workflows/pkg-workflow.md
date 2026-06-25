---
description: Master orchestrator for the full Vielzeug package workflow. Supports three modes — improve (default), feature, and new-package. Runs plan/spec → implement → review → security → tests → docs → repl with the correct repetition cadence (3×/3×/3×/3×/1×/1×/1×).
---

# pkg-workflow — Full Package Workflow

You are orchestrating the complete workflow for a **Vielzeug** package. This workflow supports three modes:

| Mode          | Use when                                                                              |
| ------------- | ------------------------------------------------------------------------------------- |
| `improve`     | Analysing an existing package to find bugs, design issues, and enhancements (default) |
| `feature`     | Adding a specific new feature to an existing package                                  |
| `new-package` | Creating a new package from scratch                                                   |

The mode is declared at invocation (e.g. `/pkg-workflow mode:feature`) or established in §3. It determines which planning workflow is used in Phase 1. **Phases 2–7 are identical across all modes.**

## 0. Agent Execution Model

**This workflow is designed for autonomous agent execution across 7 sequential phases.** Follow these principles:

### Execution Checkpoints

After each phase, **output a checkpoint summary** before proceeding:

```
✅ PHASE N: <Name> complete
- <phase-specific fields (see each phase below)>
- Proceeding to Phase N+1 / Final checklist
```

### Decision Framework

When facing ambiguity, apply this priority order:

1. **Stay green** — if tests or lint are red at the start of any phase, fix them before proceeding. Never carry a broken baseline into a new phase.
2. **Escalate before breaking** — breaking API changes, large propagations, or dependency additions must be escalated to the user (see Guardrails). Do not choose silently.
3. **Build on prior phase outputs** — load context from `runs/<name>/plan.md`, `review.md`, `security.md`, and `progress.md` rather than re-deriving from scratch each phase.
4. **Propagate patterns** — fixes identified in Phase 2 that apply to sibling packages must be applied and tested before the Propagation Checkpoint.
5. **Persist, don't repeat** — prefer the `@vielzeug` MCP for stable API context; avoid re-reading the full package on every pass.

### Anti-Patterns to Avoid

- ❌ **Do not** skip a phase or combine multiple phases into a single pass — each has a distinct focus that compounds with the others.
- ❌ **Do not** commit, push, or publish without explicit user approval.
- ❌ **Do not** weaken, skip, or delete tests to make a phase pass — surface real failures.
- ❌ **Do not** start a phase with a red baseline — fix it first.
- ❌ **Do not** silently apply a breaking API change — always use `[ESCALATE]` and wait.
- ❌ **Do not** leave a phase marked 🔄 (in progress) in `progress.md` without a resume note in the Notes column.

### Structured Output Markers

Use consistent markers throughout your output:

- `[PHASE N]` — starting phase N
- `[PASS N/3]` — starting pass N within a multi-pass phase
- `[BLOCKED]` — cannot proceed without user input; present recommendation
- `[ESCALATE]` — breaking change or large propagation requiring user decision
- `[PROPAGATED]` — fix applied to sibling package(s)
- `[SKIP]` — phase not applicable (e.g. REPL for DOM-output packages)

The workflow has **7 phases** with specific repetition counts:

```
Phase 1: Plan/Spec     × 3   (/pkg-plan for improve · /pkg-spec for feature & new-package)
Phase 2: Implement     × 3   (/pkg-implement)
Phase 3: Review        × 3   (/pkg-review)
Phase 4: Security      × 3   (/pkg-security)
Phase 5: Tests         × 1   (/pkg-tests)
Phase 6: Docs          × 1   (/pkg-docs)
Phase 7: REPL          × 1   (/pkg-repl)
```

## 1. Guardrails

These apply to every phase:

- **Do not commit, push, publish, or run `npm/pnpm publish` without explicit user approval.** Generating a `rush change` file is fine; committing it is not unless asked.
- **Do not modify other packages** beyond the scoped propagations defined in `/pkg-implement` step 6, and never without noting them.
- **Do not add runtime or dev dependencies** without explicit instruction (see documented exceptions in `.devin/rules/conventions.md`).
- **Stay green:** never weaken, skip, or delete tests to make a phase pass. Surface real failures instead.
- **Persistence is per-run:** treat `.devin/workflows/runs/<name>/` as working artifacts (see "Persistence").

### Escalate to the user when

Pause and ask before continuing if:

- The plan implies a **breaking change** that ripples into dependent packages (check the dependency graph in `.devin/rules/conventions.md`).
- The **baseline is already red** (failing tests or lint before you start) — confirm whether to fix it first or proceed.
- Requirements or scope are **ambiguous**, or two reasonable interpretations diverge materially.
- A propagation (`/pkg-implement` step 6) would touch **many packages** or carries non-trivial risk.
- You'd need to add a **dependency**, change public API contracts broadly, or delete tests.

Surface the decision concisely with a recommendation; do not silently choose a large or irreversible path.

## 2. Resuming an interrupted run

If `runs/<name>/progress.md` shows any phase as 🔄 (in progress), the previous session was interrupted. Resume as follows:

1. **Read `runs/<name>/progress.md`** — identify which phase is 🔄 and any notes in the Notes column.
2. **Read `runs/<name>/plan.md`** — identify which plan items are marked done and which remain.
3. **Re-check the baseline** before touching any code (use the correct test command for the package — standard: `pnpm vitest run packages/<name>/src/__tests__/`; co-located e.g. `refine`: `pnpm --filter @vielzeug/<name> test`):
   ```bash
   pnpm --filter @vielzeug/<name> lint
   ```
   If the baseline is red, fix it before resuming — do not assume the previous session left things green.
4. **Continue from the next uncompleted plan item** in the interrupted phase. Do not re-run completed items.
5. Update the progress table to 🔄 → ✅ once the phase is fully done.

> If `progress.md` or `plan.md` are missing (e.g. the run was from a much earlier session), treat it as a fresh start: capture a new baseline and re-run from Phase 1.

## 3. Before you begin

Ask the user for:

1. **Mode** — `improve` (default) / `feature` / `new-package`
2. **Package name** — for `improve`/`feature`: an existing package (e.g. `spell`, `ripple`); for `new-package`: the new package name + one-line description
3. **Scope** — full workflow, or start from a specific phase?
4. **Feature spec or goals** — for `feature`/`new-package`: describe what to build; for `improve`: any known issues or areas to focus on?

If the user chooses to start from a later phase (e.g. Docs), do not retroactively run earlier phases unless explicitly requested. Treat the chosen phase as a focused, standalone run.

### Capture the baseline first

Before Phase 1, record the starting state so progress is measurable at closeout.

> **`new-package` mode:** skip the commands below. Record `Tests: 0, Files: 0, Exports: 0, Lint: N/A, Build: N/A` in `progress.md`. The scaffold in Phase 2 Round 0 produces the first buildable state.

For `improve` and `feature` modes (safe to auto-run):

// turbo

```bash
pnpm vitest run packages/<name>/src/__tests__/
pnpm --filter @vielzeug/<name> lint
```

For co-located packages (e.g. `refine`), replace the first command with `pnpm --filter @vielzeug/<name> test`.

Record in the run's `progress.md` (see "Persistence" below): passing test count, test file count, lint status (clean/errors), and exported-symbol count from `src/index.ts`. For `refine`, also record the component count from `list-components` — that is the more meaningful API surface metric for a web-component library.

## 4. Phase execution guide

**Carry context across passes.** This workflow runs ~12 multi-pass phases. Do not re-read the whole package on every pass — load it once, then on each subsequent pass re-read only what changed or what the previous pass flagged. Persist findings to `runs/<name>/` (plan/review/security/progress) and build on them rather than re-deriving. Prefer the `@vielzeug` MCP for stable API context: use `get-docs` and `get-source` for most packages; for `refine` prefer `list-components` / `get-component` since its primary API surface is web components, not plain exports.

### Phase 1 — Plan/Spec × 3

Emit `[PHASE 1]` before starting. Choose the planning workflow based on mode:

#### `improve` mode — run `/pkg-plan` three times

- **Pass 1** `[PASS 1/3]`: Greenfield architecture & API review — treat the package as if designing from scratch; promote any still-valid future improvements from a prior `plan.md` if one exists.
- **Pass 2** `[PASS 2/3]`: DX, simplification, and maintainability deep-dive — reduce complexity, improve ergonomics, refine coupling.
- **Pass 3** `[PASS 3/3]`: Synthesize both passes into a single ranked improvement plan; spot-check that all referenced files and function names actually exist on disk before writing `plan.md`.

Consolidate the output into a single ranked list before moving to Phase 2.

#### `feature` or `new-package` mode — run `/pkg-spec` three times

- **Pass 1** `[PASS 1/3]`: Requirements & scope — define the problem, use cases, constraints, and explicit out-of-scope items. For `feature` mode: read the existing package via MCP first.
- **Pass 2** `[PASS 2/3]`: API design & types — propose all `[API]`, `[TYPE]`, and `[ERROR]` items; apply the Vielzeug design checks (naming, disposal pattern, options objects). Escalate any `[BREAKING]` changes before proceeding.
- **Pass 3** `[PASS 3/3]`: Acceptance criteria — convert requirements and API items into `/pkg-implement`-compatible plan items with Done-when conditions; spot-check referenced paths (feature mode); write `plan.md`.

**Phase checkpoint:**

```
✅ PHASE 1: Plan complete (3/3 passes)
- Mode: improve / feature / new-package
- Items: N (X 🔴 Bug, Y 🟠 Design, Z 🟡 Coverage, W 🟢 Enhancement/Feature)
- Future improvements: N
- plan.md: written
- Proceeding to Phase 2
```

---

### Phase 2 — Implement × 3

Emit `[PHASE 2]` before starting.

> **`new-package` mode only — Round 0 — Scaffold** `[PASS 0/3]`:
> Before the three implementation rounds, create the package skeleton:
>
> 1. Create `packages/<name>/` with all standard files (follow the scaffolding reference in `/pkg-spec` §5).
> 2. Register the package in `rush.json` (add to `projects` array).
> 3. Add a `resolve.alias` entry in `docs/.vitepress/config.ts` following the existing pattern.
> 4. Run `pnpm --filter @vielzeug/<name> build` — must pass before Round 1.
> 5. Record the scaffolded baseline in `runs/<name>/progress.md` (0 tests, 0 exports, build clean).

Execute the instructions from `/pkg-implement` in three iterative rounds:

- **Round 1** `[PASS 1/3]`: Implement high-priority (🔴 Bug + 🟠 Design) items from the plan.
- **Round 2** `[PASS 2/3]`: Implement medium-priority (🟡 Coverage + 🟢 Enhancement) items; re-verify all tests pass.
- **Round 3** `[PASS 3/3]`: Final polish — check all new code for TypeScript quality, run `pnpm --filter @vielzeug/<name> fix`, confirm zero lint errors.

**Before starting each round**, re-read `runs/<name>/plan.md` (reload only items remaining) and verify the baseline is still green (use the correct test command — standard: `pnpm vitest run packages/<name>/src/__tests__/`; co-located e.g. `refine`: `pnpm --filter @vielzeug/<name> test`):

```bash
pnpm --filter @vielzeug/<name> lint
```

If tests or lint are red at the start of any round, fix them **before** implementing new items — never carry forward a broken baseline. After each round, run the test suite (safe to auto-run):

// turbo

```bash
pnpm vitest run packages/<name>/src/__tests__/
```

For co-located packages (e.g. `refine`), use `pnpm --filter @vielzeug/<name> test` instead.

Fix any failures before proceeding.

**Phase checkpoint:**

```
✅ PHASE 2: Implement complete (3/3 rounds)
- Items completed: N/N
- Tests: N passing, F files
- Lint: clean
- Propagations: [list or "none"]
- Proceeding to Propagation Checkpoint
```

---

### Propagation checkpoint (after Phase 2)

Before moving to Phase 3, review the full list of completed plan items and ask:

> **Which fixes or patterns from Phase 2 were propagated to other packages?**

For each propagated fix, confirm:

- The fix was applied to all affected sibling packages (as identified during `/pkg-implement` step 6).
- Tests passed for every package touched.
- No regressions were introduced.

Record propagated fixes in the progress table notes column (e.g. `"type fix propagated to ripple, courier"`).

If any high-value propagations were deferred (too large to apply inline), capture them as follow-up tasks before proceeding.

---

### Phase 3 — Review × 3

Emit `[PHASE 3]` before starting. Execute the instructions from `/pkg-review` three times, rotating lenses:

- **Pass 1** `[PASS 1/3]`: Lens A — Correctness, Edge Cases, and Tests.
- **Pass 2** `[PASS 2/3]`: Lens B — Architecture, Design, and DX.
- **Pass 3** `[PASS 3/3]`: Lens C — TypeScript Quality and Type Safety.

For each CRITICAL or MAJOR finding, fix it before proceeding to the next pass.
Collect MINOR and NIT issues into a fix list and apply them after Pass 3 (using `/pkg-implement` where appropriate) before moving on to Phase 4. **Before applying the fixes**, write the consolidated MINOR/NIT list as a dedicated section in `runs/<name>/review.md` — this ensures the list survives a session interruption and is traceable alongside the findings that generated it.

**Phase checkpoint:**

```
✅ PHASE 3: Review complete (3/3 lenses)
- Findings: C CRITICAL, M MAJOR, Mi MINOR, N NIT
- All CRITICAL/MAJOR fixed: YES / NO (list any open)
- review.md: written
- Proceeding to Phase 4
```

---

### Phase 4 — Security × 3

Emit `[PHASE 4]` before starting. Execute the instructions from `/pkg-security` three times, each focusing on a different surface:

- **Pass 1** `[PASS 1/3]`: Input validation, injection vectors, and dependency risks.
- **Pass 2** `[PASS 2/3]`: Prototype pollution and type safety at runtime.
- **Pass 3** `[PASS 3/3]`: Browser-specific risks and information leakage (plus any server/API/auth concerns if present).

Fix all ❌ vulnerability findings immediately — **except** where the fix requires a breaking API change, in which case use `[ESCALATE]` and wait for the user rather than applying it silently (per the security mindset guidelines in `/pkg-security`). Document ⚠️ concerns with a code comment and/or issue if they cannot be fixed immediately.

**Phase checkpoint:**

```
✅ PHASE 4: Security complete (3/3 surfaces)
- Findings: X ❌, Y ⚠️
- All ❌ fixed: YES / [ESCALATE] (list breaking items)
- Risk rating: 🟢 Low / 🟡 Medium / 🔴 High / 🔵 N/A
- security.md: written
- Proceeding to Phase 5
```

---

### Phase 5 — Tests × 1

Emit `[PHASE 5]` before starting. Execute the instructions from `/pkg-tests` once.

After restructuring and adding tests, verify (safe to auto-run):

// turbo

```bash
pnpm vitest run packages/<name>/src/__tests__/
```

For co-located packages (e.g. `refine`), use `pnpm --filter @vielzeug/<name> test` instead. All tests must pass before proceeding.

**Phase checkpoint:**

```
✅ PHASE 5: Tests complete
- Tests before: N, after: M (delta: +X)
- Test files: F
- All tests pass: YES
- Proceeding to Phase 6
```

---

### Phase 6 — Docs × 1

Emit `[PHASE 6]` before starting. Execute the instructions from `/pkg-docs` once.

Verify that:

- All API signatures in the docs match `src/index.ts`.
- All examples compile conceptually and reflect the current recommended usage patterns.

Then rebuild codex so the MCP bundle reflects the updated docs:

```bash
pnpm --filter @vielzeug/codex build
```

**Phase checkpoint:**

```
✅ PHASE 6: Docs complete
- Files updated: [list]
- docs:build: PASS
- codex rebuilt: YES
- Proceeding to Phase 7
```

---

### Phase 7 — REPL × 1

Emit `[PHASE 7]` before starting (or `[SKIP]` with reason for DOM-output packages). Execute the instructions from `/pkg-repl` once.

> **Skip this phase for DOM-producing packages** (e.g. `ore`, `refine`, `prism`). The REPL has no preview container, so these packages have no examples or Monaco types. Mark Phase 7 as N/A in the progress table.

Verify that:

- No stale API usage remains in any REPL example file.
- Examples align with the patterns documented in `usage.md` and `examples/*.md`.

**Phase checkpoint:**

```
✅ PHASE 7: REPL complete / [SKIP] (DOM-output package)
- Examples: N modules, K categories
- validate:repl: PASS
- docs:build: PASS
- Proceeding to Final checklist
```

## 5. Final checklist

Before declaring the workflow complete:

- [ ] All tests pass — use `pnpm vitest run packages/<name>/src/__tests__/` for standard packages or `pnpm --filter @vielzeug/<name> test` for co-located packages (e.g. `refine`)
- [ ] `pnpm --filter @vielzeug/<name> lint` — zero lint errors
- [ ] `pnpm --filter @vielzeug/<name> build` — build succeeds, no TypeScript errors
- [ ] Docs in `docs/<name>/` are in sync with `src/index.ts`
- [ ] `pnpm --filter @vielzeug/codex build` — MCP bundle updated with latest docs
- [ ] REPL examples for `<name>` all use the current API and recommended patterns
- [ ] No `TODO`, `FIXME`, or `HACK` comments left without a tracking issue
- [ ] Rush change file generated for every touched package (`rush change`; non-interactive: `rush change --bulk --message "<summary>" --bump-type <patch|minor|major>`). Use `patch` for fixes, `minor` for new features, `major` for breaking changes.
- [ ] Commit message follows conventional format: `feat(<name>): <summary>`

Output the final report using **exactly this format**:

```
## Workflow Complete — <name>

### Baseline → Final

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Tests | N | M | +X |
| Test files | N | M | +X |
| Exports | N | M | +X |
| Lint errors | N | 0 | -N |

### Phase Summary

| Phase | Status | Key Outcome |
|-------|--------|-------------|
| 1. Plan | ✅ | N items |
| 2. Implement | ✅ | N items done |
| 3. Review | ✅ | 0 CRITICAL/MAJOR |
| 4. Security | ✅ | 🟢 Low |
| 5. Tests | ✅ | +N tests |
| 6. Docs | ✅ | N files updated |
| 7. REPL | ✅ / N/A | N examples |

### Propagations
<list of sibling packages touched, or "None">

### Rush Change
<generated / pending user approval>
```

## 6. Persistence

Run artifacts persist under `.devin/workflows/runs/<name>/`, governed by the DOX framework. Before reading or writing them, follow the DOX chain: read the root `AGENTS.md`, then `.devin/workflows/runs/AGENTS.md`, and honour their contracts.

- `plan.md` — written by Phase 1 (`/pkg-plan`); consumed by Phase 2 (`/pkg-implement`).
- `progress.md` — baseline metrics (from "Capture the baseline first") plus the phase status table below and propagation notes.
- `review.md` / `security.md` — optional consolidated findings from Phases 3–4.

Treat these as live working artifacts for the current run — overwrite stale content rather than appending.

## 7. Progress tracking

Maintain the status table in `.devin/workflows/runs/<name>/progress.md` (and mirror it in chat):

| Phase            | Status | Notes |
| ---------------- | ------ | ----- |
| 1. Plan × 3      | ⏳     |       |
| 2. Implement × 3 | ⏳     |       |
| 3. Review × 3    | ⏳     |       |
| 4. Security × 3  | ⏳     |       |
| 5. Tests         | ⏳     |       |
| 6. Docs          | ⏳     |       |
| 7. REPL          | ⏳     |       |

Status legend: ⏳ not started · 🔄 in progress (session interrupted) · ✅ complete · N/A not applicable (any phase).

Update this table after each phase completes. (Phase 7 is `N/A` for DOM-output packages — see Phase 7.) **Use the Notes column to record which pass you are on within multi-pass phases** (e.g. `"Lens B"`, `"Round 2"`, `"Pass 3 — security surface: browser"`) — this makes resumption unambiguous if a session is interrupted mid-phase.

## 8. Quick Reference — Execution Flow

```
Baseline capture (improve/feature)    OR    skip (new-package: 0/0/N/A)
    ↓
[PHASE 1] Plan/Spec × 3
  improve    → /pkg-plan  (arch review → DX deep-dive → synthesis)  → plan.md
  feature    → /pkg-spec  (requirements → API design → spec plan)    → plan.md
  new-pkg    → /pkg-spec  (same, greenfield scope)                   → plan.md
                                                           → Checkpoint
    ↓
[PHASE 2] Implement × 3
  new-pkg only: Round 0 — Scaffold (create pkg, rush.json, alias)
  Round 1–3: /pkg-implement items by priority        → Checkpoint → Propagation
    ↓
[PHASE 3] Review × 3    → review.md → Checkpoint
    ↓
[PHASE 4] Security × 3  → security.md → Checkpoint
    ↓
[PHASE 5] Tests × 1     → Checkpoint
    ↓
[PHASE 6] Docs × 1      → codex rebuild → Checkpoint
    ↓
[PHASE 7] REPL × 1      → Checkpoint (or [SKIP])
    ↓
Final checklist         → Structured report
```
