# pkg-workflow — Full Package Workflow

> **Canonical source:** This file is the single source of truth for all AI tools. Tool-specific stubs in `.claude/commands/`, `.devin/workflows/`, and `.junie/workflows/` delegate here.
>
> **Automated orchestration:** `.claude/workflows/pkg-workflow.js` runs these same phases via the Workflow tool. Changes to phase structure, scope selection, or mode names here must be reflected there.

## Contract

- **Inputs:** package name, mode, optional scope/goals from user
- **Outputs:** `runs/<name>/progress.md`, `runs/<name>/plan.md`, `runs/<name>/review.md`, `runs/<name>/security.md`
- **Universal rules:** `.ai/rules/agent-execution.md` — principles, markers, breaking-change definition, run artifact persistence.

## Modes

| Mode          | Use when                                                                          |
| ------------- | --------------------------------------------------------------------------------- |
| `analyse`     | Analysing an existing package for bugs, design issues, and enhancements (default) |
| `feature`     | Adding a specific new feature to an existing package                              |
| `new-package` | Creating a new package from scratch                                               |

Mode determines the pass structure in Phase 1. **Phases 2–7 are identical across all modes.**

## Scope selection

Before defaulting to the full 7-phase pipeline, confirm whether a lighter scope fits:

| Change type                 | Scope key     | Recommended phases                                |
| --------------------------- | ------------- | ------------------------------------------------- |
| Bug fix (no API change)     | `bug`         | 1 (1 pass) → 2 (1 round) → 3 (Lens A) → Checklist |
| New public API              | `new-api`     | 1 → 2 → 3 → 4 → 5 → Checklist                     |
| Docs-only update            | `docs`        | Baseline → 6                                      |
| Test coverage gap           | `tests`       | Baseline → 3 (Lens A) → 5 → Checklist             |
| Security hardening          | `security`    | Baseline → 2 → 4 → Checklist *(requires existing `runs/<name>/plan.md`)* |
| Full feature or new package | `full`        | All 7 phases (default)                            |

The full workflow is the default for `analyse` mode with no known scope constraints.

Accepted scope keys: `full`, `bug`, `new-api`, `docs`, `tests`, `security`.

`security` scope runs Implement without running Plan. Use it only when `.ai/workflows/runs/<name>/plan.md` already exists from a prior planning cycle.

## When to escalate

Pause and ask the user before continuing if:

- The plan implies a **breaking change** rippling into dependent packages (check `.ai/rules/catalogue.md`).
- The **baseline is already red** — confirm whether to fix it first or proceed.
- Requirements or scope are **ambiguous** and two reasonable interpretations diverge materially.
- A propagation would touch **many packages** or carries non-trivial risk.
- Implementation would require adding a **dependency**, broadly changing public API contracts, or deleting tests.

Surface the decision with a recommendation. Do not silently choose a large or irreversible path.

## 1. Before you begin

Ask the user for:

1. **Mode** — `analyse` (default) / `feature` / `new-package`
2. **Package name** — existing package for `analyse`/`feature`; new name + one-line description for `new-package`
3. **Scope** — full workflow, or start from a specific phase?
4. **Goals** — for `feature`/`new-package`: describe what to build; for `analyse`: any known issues or focus areas?

If the user chooses to start from a later phase (e.g. Docs), treat it as a focused standalone run — do not retroactively run earlier phases unless explicitly requested.

### Capture the baseline first

> **`new-package` mode:** skip the commands below. Record `Tests: 0, Files: 0, Exports: 0, Lint: N/A, Build: N/A` in `progress.md`. The scaffold in Phase 2 Round 0 produces the first buildable state.

For `analyse` and `feature` modes (safe to auto-run):

```bash
pnpm vitest run packages/<name>/src/__tests__/
pnpm --filter @vielzeug/<name> lint
```

See `.ai/rules/workspace.md § Per-package test command overrides` for packages with a different test command (e.g. `refine`).

Record in `runs/<name>/progress.md`: passing test count, test file count, lint status (clean/errors), exported-symbol count from `src/index.ts`.

## 2. Guardrails

These apply to every phase:

- **Do not commit, push, or publish** without explicit user approval. Generating `rush change` files is fine; committing or pushing is not unless asked.
- **Do not modify other packages** beyond the scoped propagations defined in `/pkg-implement` step 6, and never without noting them.
- **Do not add runtime or dev dependencies** without explicit instruction (see `.ai/rules/conventions.md` for documented exceptions).
- **Stay green:** never weaken, skip, or delete tests to make a phase pass. Surface real failures instead.

## 3. Resuming an interrupted run

If `runs/<name>/progress.md` shows any phase as 🔄 (in progress), the previous session was interrupted:

1. Read `runs/<name>/progress.md` — identify which phase is 🔄 and any notes in the Notes column.
2. Read `runs/<name>/plan.md` — identify which plan items are done and which remain.
3. Re-check the baseline before touching any code. If red, fix before resuming.
4. Continue from the next uncompleted item in the interrupted phase. Do not re-run completed items.
5. Update the progress table: 🔄 → ✅ once the phase is fully done.

> If `progress.md` or `plan.md` are missing, treat as a fresh start: capture a new baseline and run from Phase 1.

## 4. Phase execution guide

**Carry context across passes.** Load prior phase artifacts from `runs/<name>/` rather than re-reading the whole package on every pass. Prefer the `@vielzeug` MCP: `get-docs` and `get-source` for most packages; `list-components` / `get-component` for `refine`.

Phase repetition counts are floors, not fixed targets — see `.ai/rules/agent-execution.md § Multi-pass convergence`.

```
Phase 1: Plan      × 3   (/pkg-plan — mode: analyse / feature / new-package)
Phase 2: Implement × 3   (/pkg-implement)
Phase 3: Review    × 3   (/pkg-review)
Phase 4: Security  × 3   (/pkg-security)
Phase 5: Tests     × 1   (/pkg-tests)
Phase 6: Docs      × 1   (/pkg-docs)
Phase 7: REPL      × 1   (/pkg-repl)
```

---

### Phase 1 — Plan × 3

Emit `[PHASE 1]`. Run `/pkg-plan` three times. Pass the mode so the correct pass structure is used:

- **`analyse`** → arch review → DX deep-dive → synthesis → `plan.md`
- **`feature`** → requirements → API design → acceptance criteria → `plan.md`
- **`new-package`** → requirements → API design → acceptance criteria → `plan.md`

**Phase checkpoint:**

```
✅ PHASE 1: Plan complete (3/3 passes)
- Mode: analyse / feature / new-package
- Items: N (X 🔴 Bug, Y 🟠 Design, Z 🟡 Coverage, W 🟢 Enhancement/Feature)
- Future improvements: N
- plan.md: written
- Proceeding to Phase 2
```

---

### Phase 2 — Implement × 3

Emit `[PHASE 2]`. Execute `/pkg-implement` in three iterative rounds.

> **`new-package` mode only — Round 0 — Scaffold** `[PASS 0/3]`: create the package skeleton before Round 1. Follow `.ai/rules/workspace.md § New-package scaffolding`. Run `pnpm --filter @vielzeug/<name> build` — must pass before Round 1. Record scaffolded baseline in `progress.md`.

- **Round 1** `[PASS 1/3]`: high-priority items (🔴 Bug + 🟠 Design).
- **Round 2** `[PASS 2/3]`: medium-priority items (🟡 Coverage + 🟢 Enhancement); re-verify all tests pass.
- **Round 3** `[PASS 3/3]`: final polish — TypeScript quality, `pnpm --filter @vielzeug/<name> fix`, zero lint errors.

Before each round, verify the baseline is green. After each round, run the test suite and fix any failures before proceeding. See `.ai/rules/workspace.md` for per-package test commands.

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

Before Phase 3, confirm for each propagated fix:

- Applied to all affected sibling packages.
- Tests pass for every package touched.
- No regressions introduced.

Record propagated fixes in the progress table Notes column.

---

### Phase 3 — Review × 3

Emit `[PHASE 3]`. Execute `/pkg-review` three times, rotating Lens A (Correctness) → Lens B (Architecture/DX) → Lens C (TypeScript Quality). Follow `/pkg-review` fix-gate and persistence rules exactly — including MINOR/NIT handling after Lens C.

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

Emit `[PHASE 4]`. Execute `/pkg-security` three times: Pass 1 (Input/Injection/Prototype Pollution) → Pass 2 (Leakage/Types/Deps) → Pass 3 (Browser/Server + re-scan all [VULN] from Passes 1–2). Fix all [VULN] findings immediately — except where the fix requires a breaking API change, in which case use `[ESCALATE]` and wait.

**Phase checkpoint:**

```
✅ PHASE 4: Security complete (3/3 surfaces)
- Findings: X [VULN], Y [CONCERN]
- All [VULN] fixed: YES / [ESCALATE] (list breaking items)
- Risk rating: 🟢 Low / 🟡 Medium / 🔴 High / 🔵 N/A
- security.md: written
- Proceeding to Phase 5
```

---

### Phase 5 — Tests × 1

Emit `[PHASE 5]`. Execute `/pkg-tests` once. Run the full test suite after restructuring — all tests must pass before proceeding.

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

Emit `[PHASE 6]`. Execute `/pkg-docs` once. Verify all API signatures match `src/index.ts`. Rebuild codex so the MCP bundle reflects the updated docs:

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

Emit `[PHASE 7]` — or `[SKIP]` with reason for DOM-output packages (`ore`, `refine`, `prism`). Execute `/pkg-repl` once. Verify no stale API usage remains in any REPL example.

**Phase checkpoint:**

```
✅ PHASE 7: REPL complete / [SKIP] (DOM-output package)
- Examples: N modules, K categories
- validate:repl: PASS
- docs:build: PASS
- Proceeding to Final checklist
```

## 5. Final checklist

- [ ] All tests pass — see `.ai/rules/workspace.md` for per-package test commands
- [ ] `pnpm --filter @vielzeug/<name> lint` — zero lint errors
- [ ] `pnpm --filter @vielzeug/<name> build` — build succeeds, no TypeScript errors
- [ ] Docs in `docs/<name>/` are in sync with `src/index.ts`
- [ ] `pnpm --filter @vielzeug/codex build` — MCP bundle updated with latest docs
- [ ] REPL examples for `<name>` all use the current API and recommended patterns
- [ ] No `TODO`, `FIXME`, or `HACK` comments left without a tracking issue
- [ ] Rush change file generated for every touched package (`rush change --bulk --message "<summary>" --bump-type <patch|minor|major>`)
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

Run artifacts persist under `runs/<name>/`. Follow the persistence semantics in `.ai/rules/agent-execution.md § Run artifacts`.

- `plan.md` — written by Phase 1 (`/pkg-plan`); consumed by Phase 2 (`/pkg-implement`).
- `progress.md` — baseline metrics + phase status table + propagation notes.
- `review.md` — consolidated findings from Phase 3.
- `security.md` — findings from Phase 4.

## 7. Progress tracking

Maintain in `runs/<name>/progress.md`:

| Phase            | Status | Notes |
| ---------------- | ------ | ----- |
| 1. Plan × 3      | ⏳     |       |
| 2. Implement × 3 | ⏳     |       |
| 3. Review × 3    | ⏳     |       |
| 4. Security × 3  | ⏳     |       |
| 5. Tests         | ⏳     |       |
| 6. Docs          | ⏳     |       |
| 7. REPL          | ⏳     |       |

Status legend: ⏳ not started · 🔄 in progress (session interrupted) · ✅ complete · N/A not applicable.

Use the Notes column to record which pass you are on within multi-pass phases (e.g. `"Lens B"`, `"Round 2"`, `"Pass 3 — surface: browser"`) — this makes resumption unambiguous.

## 8. Quick reference — execution flow

```
Baseline capture (analyse/feature)    OR    skip (new-package)
    ↓
[PHASE 1] Plan × 3
  analyse    → /pkg-plan  (arch → DX → synthesis)        → plan.md
  feature    → /pkg-plan  (req → API → criteria)          → plan.md
  new-pkg    → /pkg-plan  (req → API → criteria)          → plan.md → Checkpoint
    ↓
[PHASE 2] Implement × 3
  new-pkg only: Round 0 — Scaffold (see workspace.md)
  Round 1–3: /pkg-implement items by priority → Checkpoint → Propagation
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
Final checklist          → Structured report
```
