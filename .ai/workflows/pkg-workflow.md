# pkg-workflow — Full Package Workflow

> **Canonical source:** This file is the single source of truth for all AI tools. Generated, gitignored stubs in `.claude/commands/` and `.devin/workflows/` delegate here (see `.ai/workflows/manifest.json` + `pnpm gen:workflow-docs`); `.junie/guidelines.md` links here directly with no stub file.
>
> **Automated orchestration:** `.claude/workflows/pkg-workflow.js` runs these same phases via the Workflow tool. Its phase/scope data is generated from `.ai/workflows/manifest.json` — do not hand-edit the code between the `GENERATED:data` markers; edit the manifest and run `pnpm gen:workflow-docs`.

## Contract

- **Inputs:** package name, mode, optional scope/goals from user
- **Outputs:** `runs/<name>/progress.md`, `runs/<name>/plan.md`, `runs/<name>/review.md`, `runs/<name>/security.md`, `runs/<name>/tests-report.md`, `runs/<name>/repl-report.md`
- **Universal rules:** `.ai/rules/process/agent-execution.md` — principles, markers, breaking-change definition, run artifact lifecycle (ephemeral, gitignored — see `.ai/workflows/runs/AGENTS.md`).

## Modes

<!-- GENERATED:mode-table:BEGIN -->

| Mode | Use when | Pass structure |
| --- | --- | --- |
| `analyse` (default) | Existing package improvement | arch review → DX deep-dive → synthesis |
| `feature` | Adding a specific new feature to an existing package | requirements → API design → acceptance criteria |
| `new-package` | Creating a new package from scratch | requirements → API design → acceptance criteria |

<!-- GENERATED:mode-table:END -->

Generated from `.ai/workflows/manifest.json` § `pkgWorkflow.modes` by `scripts/sync-workflow-docs.mjs` — edit the manifest and run `pnpm gen:workflow-docs`, don't hand-edit this table (`pnpm check:workflow-docs` fails CI if it drifts; same source `/pkg-plan` uses, so the two can no longer drift apart). Mode determines the pass structure in Phase 1. **Phases 2–7 are identical across all modes.**

## Scope selection

Don't default to the full pipeline. Classify the request, propose a scope, let the user confirm or override:

1. Read the user's request (and, for `analyse` mode, any issue/diff the user explicitly links — don't go hunting `git log`/`git diff` yourself to construct one).
2. Match it against the change types below and state your pick: `"This looks like a <type> — proposing scope: <key>. Proceed, or run the full pipeline instead?"`
3. **No table row fits?** Don't force it into the nearest bucket. Propose a custom phase subset directly — `"This needs <phase> → <phase> → <phase>, which isn't one of the named scopes. Proceed with this subset, or run the full pipeline instead?"` — same confirm-before-proceeding rule as any other scope. The 8 phases are already independent (§ Phase execution guide); named scopes below are common cases, not the only valid combinations.
4. Proceed on confirmation. If the user just says "go", use your best-match scope (named or custom) rather than silently defaulting to `full`.

<!-- GENERATED:scope-table:BEGIN -->

| Change type | Scope key | Phases (converge within each) |
| --- | --- | --- |
| Full feature or new package | `full` | baseline → plan → implement → review → security → tests → docs → repl |
| Bug fix (no API change) | `bug` | baseline → plan → implement → review-a |
| New public API | `new-api` | baseline → plan → implement → review → security → tests |
| Docs-only update | `docs` | baseline → docs |
| Test coverage gap | `tests` | baseline → review-a → tests |
| Security hardening | `security` | baseline → implement → security |

<!-- GENERATED:scope-table:END -->

Generated from `.ai/workflows/manifest.json` § `pkgWorkflow.scopes` by `scripts/sync-workflow-docs.mjs` — edit the manifest and run `pnpm gen:workflow-docs`, don't hand-edit this table (`pnpm check:workflow-docs` fails CI if it drifts).

**Scope preconditions** (generated from `pkgWorkflow.scopeRequirements` — add a new scope's precondition there, not as a one-off sentence here):

<!-- GENERATED:scope-notes:BEGIN -->

- **`security`** — Runs Implement without running Plan — use only when `runs/<name>/plan.md` already exists from a prior planning cycle.

<!-- GENERATED:scope-notes:END -->

## When to escalate

Pause and ask the user before continuing if:

- The plan implies a **breaking change** rippling into dependent packages (check `.ai/rules/data/catalogue.md`).
- The **baseline is already red** — confirm whether to fix it first or proceed.
- Requirements or scope are **ambiguous** and two reasonable interpretations diverge materially.
- A propagation would touch **many packages** or carries non-trivial risk.
- Implementation would require adding a **dependency**, broadly changing public API contracts, or deleting tests.

Surface the decision with a recommendation. Do not silently choose a large or irreversible path.

## 1. Before you begin

Ask the user for:

1. **Mode** — `analyse` (default) / `feature` / `new-package`
2. **Package name** — existing package for `analyse`/`feature`; new name + one-line description for `new-package`
3. **Goals** — for `feature`/`new-package`: describe what to build; for `analyse`: any known issues or focus areas?

Then classify and propose a **scope** yourself per `§ Scope selection` above — don't ask the user to pick a scope key cold.

If the user chooses to start from a later phase (e.g. Docs), treat it as a focused standalone run — do not retroactively run earlier phases unless explicitly requested.

### Capture the baseline first

> **`new-package` mode:** skip the commands below. Record `Tests: 0, Files: 0, Exports: 0, Lint: N/A, Build: N/A` in `progress.md`. The scaffold in Phase 2 Round 0 produces the first buildable state.

For `analyse` and `feature` modes (safe to auto-run):

```bash
pnpm vitest run packages/<name>/src/__tests__/
pnpm --filter @vielzeug/<name> lint
```

See `.ai/rules/process/workspace.md § Per-package test command overrides` for packages with a different test command (e.g. `refine`).

Record in `runs/<name>/progress.md`: passing test count, test file count, lint status (clean/errors), exported-symbol count from `src/index.ts`.

## 2. Guardrails

Applies to every phase, on top of `.ai/rules/process/agent-execution.md § Scope and safety` / `§ Tests`: **do not modify other packages** beyond the scoped propagations defined in `/pkg-implement` step 6, and never without noting them.

## 3. Resuming an interrupted run

If `runs/<name>/progress.md` shows any phase as 🔄 (in progress), the previous session was interrupted:

1. Read `runs/<name>/progress.md` — identify which phase is 🔄 and any notes in the Notes column.
2. Read `runs/<name>/plan.md` — identify which plan items are done and which remain.
3. Re-check the baseline before touching any code. If red, fix before resuming.
4. Continue from the next uncompleted item in the interrupted phase. Do not re-run completed items.
5. Update the progress table: 🔄 → ✅ once the phase is fully done.

> If `progress.md` or `plan.md` are missing, treat as a fresh start: capture a new baseline and run from Phase 1.

## 4. Phase execution guide

**Carry context across passes.** Load prior phase artifacts from `runs/<name>/` rather than re-reading the whole package on every pass. Prefer the `@vielzeug` MCP's source/docs lookup tools for most packages; its component-listing tools for `refine` (resolve exact tool names via your MCP tool list — do not assume a fixed name/prefix).

Plan and Implement **converge on evidence** — no fixed pass count. Review and Security run a **fixed 3-pass enumeration** (each pass is a distinct, mandatory concern, not a repetition of the same activity) — see `.ai/rules/process/agent-execution.md § Multi-pass convergence` for the exact distinction. ~3 passes is typical for Plan/Implement on a full-size package; a small package may converge in 1, a large one may need more. Tests, Docs, and REPL are inherently single-pass phases. Cadence per phase (converge / fixed / × 1) is exactly what each `### Phase N` heading below says — not repeated here as a separate diagram that could drift from it.

---

### Phase 1 — Plan (converge)

Emit `[PHASE 1]`. Run `/pkg-plan`, applying its convergence rule (stop when a pass adds 0 new findings, minimum 1 pass). Pass the mode so the correct pass structure is used:

- **`analyse`** → arch review → DX deep-dive → synthesis → `plan.md`
- **`feature`** → requirements → API design → acceptance criteria → `plan.md`
- **`new-package`** → requirements → API design → acceptance criteria → `plan.md`

**Phase checkpoint:**

```text
✅ PHASE 1: Plan complete (N passes, converged)
- Mode: analyse / feature / new-package
- Items: N (X 🔴 Bug, Y 🟠 Design, Z 🟡 Coverage, W 🟢 Enhancement/Feature)
- Future improvements: N
- plan.md: written
- Proceeding to Phase 2
```

---

### Phase 2 — Implement (converge)

Emit `[PHASE 2]`. Execute `/pkg-implement`, working through `plan.md` items by priority in as many rounds as needed to finish all items and reach green (typically 3: high-priority → medium-priority → polish).

> **`new-package` mode only — Round 0 — Scaffold**: create the package skeleton before Round 1. Follow `.ai/rules/code/conventions.md § New-package scaffold`, then `.ai/rules/process/workspace.md § New-package registration`. Run `pnpm --filter @vielzeug/<name> build` — must pass before Round 1. Record scaffolded baseline in `progress.md`.

- **Round 1**: high-priority items (🔴 Bug + 🟠 Design).
- **Round 2**: medium-priority items (🟡 Coverage + 🟢 Enhancement); re-verify all tests pass.
- **Round 3+**: final polish — TypeScript quality, `pnpm --filter @vielzeug/<name> fix`, zero lint errors. Repeat until all plan items are done and the suite is green.

Before each round, verify the baseline is green. After each round, run the test suite and fix any failures before proceeding. See `.ai/rules/process/workspace.md` for per-package test commands.

**Phase checkpoint:**

```text
✅ PHASE 2: Implement complete (N rounds)
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

### Phase 3 — Review (3 lenses)

Emit `[PHASE 3]`. Execute `/pkg-review` for all three lenses — A (Correctness) → B (Architecture/DX) → C (TypeScript Quality). These are distinct defect classes, not repeats — run all three regardless of package size. Follow `/pkg-review` fix-gate and persistence rules exactly — including MINOR/NIT handling after Lens C. Add a targeted re-check pass only if a later lens's fix plausibly reintroduced an earlier lens's issue.

**Phase checkpoint:**

```text
✅ PHASE 3: Review complete (3/3 lenses)
- Findings: C CRITICAL, M MAJOR, Mi MINOR, N NIT
- All CRITICAL/MAJOR fixed: YES / NO (list any open)
- review.md: written
- Proceeding to Phase 4
```

---

### Phase 4 — Security (3 surfaces)

Emit `[PHASE 4]`. Execute `/pkg-security` for all three surfaces — Pass 1 (Input/Injection/Prototype Pollution) → Pass 2 (Leakage/Types/Deps) → Pass 3 (Browser/Server + re-scan all [VULN] from Passes 1–2). These are distinct attack surfaces, not repeats — run all three regardless of package size. Fix all [VULN] findings immediately — except where the fix requires a breaking API change, in which case use `[ESCALATE]` and wait.

**Phase checkpoint:**

```text
✅ PHASE 4: Security complete (3/3 surfaces)
- Findings: X [VULN], Y [CONCERN]
- All [VULN] fixed: YES / [ESCALATE] (list breaking items)
- Risk rating: 🔴 Red / 🟡 Yellow / 🟢 Green / 🔵 N/A
- security.md: written
- Proceeding to Phase 5
```

---

### Phase 5 — Tests × 1

Emit `[PHASE 5]`. Execute `/pkg-tests` once. Run the full test suite after restructuring — all tests must pass before proceeding.

**Phase checkpoint:**

```text
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

```text
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

```text
✅ PHASE 7: REPL complete / [SKIP] (DOM-output package)
- Examples: N modules, K categories
- validate:repl: PASS
- docs:build: PASS
- Proceeding to Final checklist
```

## 5. Final checklist

- [ ] All tests pass — see `.ai/rules/process/workspace.md` for per-package test commands
- [ ] `pnpm --filter @vielzeug/<name> lint` — zero lint errors
- [ ] `pnpm --filter @vielzeug/<name> build` — build succeeds, no TypeScript errors
- [ ] Docs in `docs/<name>/` are in sync with `src/index.ts`
- [ ] `pnpm --filter @vielzeug/codex build` — MCP bundle updated with latest docs
- [ ] REPL examples for `<name>` all use the current API and recommended patterns
- [ ] No `TODO`, `FIXME`, or `HACK` comments left without a tracking issue
- [ ] Rush change file generated for every touched package (`rush change --bulk --message "<summary>" --bump-type <patch|minor|major>`)
- [ ] Commit message follows conventional format: `feat(<name>): <summary>`

Output the final report using **exactly this format**:

```text
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
| 4. Security | ✅ | 🟢 Green |
| 5. Tests | ✅ | +N tests |
| 6. Docs | ✅ | N files updated |
| 7. REPL | ✅ / N/A | N examples |

### Propagations
<list of sibling packages touched, or "None">

### Rush Change
<generated / pending user approval>
```

## 6. Persistence

Full artifact list and persistence rules: `.ai/rules/process/agent-execution.md § Run artifacts`.

## 7. Progress tracking

Maintain in `runs/<name>/progress.md`:

| Phase                    | Status | Notes |
| ------------------------ | ------ | ----- |
| 1. Plan (converge)       | ⏳     |       |
| 2. Implement (converge)  | ⏳     |       |
| 3. Review (3 lenses)     | ⏳     |       |
| 4. Security (3 surfaces) | ⏳     |       |
| 5. Tests                 | ⏳     |       |
| 6. Docs                  | ⏳     |       |
| 7. REPL                  | ⏳     |       |

Status legend: ⏳ not started · 🔄 in progress (session interrupted) · ✅ complete · N/A not applicable.

**Notes column: max ~15 words, one line, no prose.** It's a resumption pointer, not a changelog — e.g. `"Lens B"`, `"Round 2/2"`, `"Pass 3 — surface: browser"`, `"converged after 2 passes"`. Numbers and one-line outcomes only (e.g. `"11/11 items, 199→221 tests"`); never a paragraph. If there's a real narrative worth keeping (what changed and why, notable deviations), append it as a dated subsection at the bottom of `plan.md` instead — that file is versioned per cycle and meant to carry detail; `progress.md` exists to be scanned in five seconds.

## 8. Quick reference — execution flow

```text
Baseline capture (analyse/feature)    OR    skip (new-package)
    ↓
[PHASE 1] Plan — converge (typically ~3 passes)
  analyse    → /pkg-plan  (arch → DX → synthesis)        → plan.md
  feature    → /pkg-plan  (req → API → criteria)          → plan.md
  new-pkg    → /pkg-plan  (req → API → criteria)          → plan.md → Checkpoint
    ↓
[PHASE 2] Implement — converge (typically ~3 rounds)
  new-pkg only: Round 0 — Scaffold (see conventions.md + workspace.md)
  Round N: /pkg-implement items by priority → Checkpoint → Propagation
    ↓
[PHASE 3] Review — 3 lenses (A, B, C; all mandatory)    → review.md → Checkpoint
    ↓
[PHASE 4] Security — 3 surfaces (all mandatory)         → security.md → Checkpoint
    ↓
[PHASE 5] Tests × 1     → Checkpoint
    ↓
[PHASE 6] Docs × 1      → codex rebuild → Checkpoint
    ↓
[PHASE 7] REPL × 1      → Checkpoint (or [SKIP])
    ↓
Final checklist          → Structured report
```
