---
description: Master orchestrator for the full Vielzeug package improvement workflow. Runs plan → implement → review → security → tests → docs → repl with the correct repetition cadence (3×/3×/3×/3×/1×/1×/1×).
---

# pkg-workflow — Full Package Improvement Workflow

You are orchestrating the complete improvement cycle for a **Vielzeug** package.

The workflow has **7 phases** with specific repetition counts:

```
Phase 1: Plan          × 3   (/pkg-plan)
Phase 2: Implement     × 3   (/pkg-implement)
Phase 3: Review        × 3   (/pkg-review)
Phase 4: Security      × 3   (/pkg-security)
Phase 5: Tests         × 1   (/pkg-tests)
Phase 6: Docs          × 1   (/pkg-docs)
Phase 7: REPL          × 1   (/pkg-repl)
```

## Guardrails

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

## Resuming an interrupted run

If `runs/<name>/progress.md` shows any phase as 🔄 (in progress), the previous session was interrupted. Resume as follows:

1. **Read `runs/<name>/progress.md`** — identify which phase is 🔄 and any notes in the Notes column.
2. **Read `runs/<name>/plan.md`** — identify which plan items are marked done and which remain.
3. **Re-check the baseline** before touching any code (use the correct test command for the package — standard: `pnpm vitest run packages/<name>/src/__tests__/`; co-located e.g. `sigil`: `pnpm --filter @vielzeug/<name> test`):
   ```bash
   pnpm --filter @vielzeug/<name> lint
   ```
   If the baseline is red, fix it before resuming — do not assume the previous session left things green.
4. **Continue from the next uncompleted plan item** in the interrupted phase. Do not re-run completed items.
5. Update the progress table to 🔄 → ✅ once the phase is fully done.

> If `progress.md` or `plan.md` are missing (e.g. the run was from a much earlier session), treat it as a fresh start: capture a new baseline and re-run from Phase 1.

## Before you begin

Ask the user for:

1. **Package name** (e.g. `spell`, `ripple`, `courier`)
2. **Scope** — full workflow, or start from a specific phase?
3. **Any known issues or goals** to focus on?

If the user chooses to start from a later phase (e.g. Docs), do not retroactively run earlier phases unless explicitly requested. Treat the chosen phase as a focused, standalone run.

### Capture the baseline first

Before Phase 1, record the starting state so progress is measurable at closeout (safe to auto-run):

// turbo
```bash
pnpm vitest run packages/<name>/src/__tests__/
pnpm --filter @vielzeug/<name> lint
```

For co-located packages (e.g. `sigil`), replace the first command with `pnpm --filter @vielzeug/<name> test`.

Record in the run's `progress.md` (see "Persistence" below): passing test count, test file count, lint status (clean/errors), and exported-symbol count from `src/index.ts`. For `sigil`, also record the component count from `list-components` — that is the more meaningful API surface metric for a web-component library.

## Phase execution guide

**Carry context across passes.** This workflow runs ~12 multi-pass phases. Do not re-read the whole package on every pass — load it once, then on each subsequent pass re-read only what changed or what the previous pass flagged. Persist findings to `runs/<name>/` (plan/review/security/progress) and build on them rather than re-deriving. Prefer the `@vielzeug` MCP for stable API context: use `get-docs` and `get-source` for most packages; for `sigil` prefer `list-components` / `get-component` since its primary API surface is web components, not plain exports.

### Phase 1 — Plan × 3

Execute the instructions from `/pkg-plan` three times. Each pass deepens the analysis (follow the pass structure defined in `/pkg-plan`):

- **Pass 1**: Greenfield architecture & API review — treat the package as if designing from scratch; promote any still-valid future improvements from a prior `plan.md` if one exists.
- **Pass 2**: DX, simplification, and maintainability deep-dive — reduce complexity, improve ergonomics, refine coupling.
- **Pass 3**: Synthesize both passes into a single ranked improvement plan; spot-check that all referenced files and function names actually exist on disk before writing `plan.md`.

Consolidate the output into a single ranked list before moving to Phase 2.

---

### Phase 2 — Implement × 3

Execute the instructions from `/pkg-implement` in three iterative rounds:

- **Round 1**: Implement high-priority (🔴 Bug + 🟠 Design) items from the plan.
- **Round 2**: Implement medium-priority (🟡 Coverage + 🟢 Enhancement) items; re-verify all tests pass.
- **Round 3**: Final polish — check all new code for TypeScript quality, run `pnpm --filter @vielzeug/<name> fix`, confirm zero lint errors.

**Before starting each round**, re-read `runs/<name>/plan.md` (reload only items remaining) and verify the baseline is still green (use the correct test command — standard: `pnpm vitest run packages/<name>/src/__tests__/`; co-located e.g. `sigil`: `pnpm --filter @vielzeug/<name> test`):

```bash
pnpm --filter @vielzeug/<name> lint
```

If tests or lint are red at the start of any round, fix them **before** implementing new items — never carry forward a broken baseline. After each round, run the test suite (safe to auto-run):

// turbo
```bash
pnpm vitest run packages/<name>/src/__tests__/
```

For co-located packages (e.g. `sigil`), use `pnpm --filter @vielzeug/<name> test` instead.

Fix any failures before proceeding.

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

Execute the instructions from `/pkg-review` three times, rotating lenses:

- **Pass 1**: Lens A — Correctness, Edge Cases, and Tests.
- **Pass 2**: Lens B — Architecture, Design, and DX.
- **Pass 3**: Lens C — TypeScript Quality and Type Safety.

For each CRITICAL or MAJOR finding, fix it before proceeding to the next pass.
Collect MINOR and NIT issues into a fix list and apply them after Pass 3 (using `/pkg-implement` where appropriate) before moving on to Phase 4. **Before applying the fixes**, write the consolidated MINOR/NIT list as a dedicated section in `runs/<name>/review.md` — this ensures the list survives a session interruption and is traceable alongside the findings that generated it.

---

### Phase 4 — Security × 3

Execute the instructions from `/pkg-security` three times, each focusing on a different surface:

- **Pass 1**: Input validation, injection vectors, and dependency risks.
- **Pass 2**: Prototype pollution and type safety at runtime.
- **Pass 3**: Browser-specific risks and information leakage (plus any server/API/auth concerns if present).

Fix all ❌ vulnerability findings immediately — **except** where the fix requires a breaking API change, in which case escalate to the user rather than applying it silently (per the security mindset guidelines in `/pkg-security`). Document ⚠️ concerns with a code comment and/or issue if they cannot be fixed immediately.

---

### Phase 5 — Tests × 1

Execute the instructions from `/pkg-tests` once.

After restructuring and adding tests, verify (safe to auto-run):

// turbo
```bash
pnpm vitest run packages/<name>/src/__tests__/
```

For co-located packages (e.g. `sigil`), use `pnpm --filter @vielzeug/<name> test` instead. All tests must pass before proceeding.

---

### Phase 6 — Docs × 1

Execute the instructions from `/pkg-docs` once.

Verify that:

- All API signatures in the docs match `src/index.ts`.
- All examples compile conceptually and reflect the current recommended usage patterns.

Then rebuild codex so the MCP bundle reflects the updated docs:

```bash
pnpm --filter @vielzeug/codex build
```

---

### Phase 7 — REPL × 1

Execute the instructions from `/pkg-repl` once.

> **Skip this phase for DOM-producing packages** (e.g. `craft`, `sigil`, `prism`). The REPL has no preview container, so these packages have no examples or Monaco types. Mark Phase 7 as N/A in the progress table.

Verify that:

- No stale API usage remains in any REPL example file.
- Examples align with the patterns documented in `usage.md` and `examples/*.md`.

## Final checklist

Before declaring the workflow complete:

- [ ] All tests pass — use `pnpm vitest run packages/<name>/src/__tests__/` for standard packages or `pnpm --filter @vielzeug/<name> test` for co-located packages (e.g. `sigil`)
- [ ] `pnpm --filter @vielzeug/<name> lint` — zero lint errors
- [ ] `pnpm --filter @vielzeug/<name> build` — build succeeds, no TypeScript errors
- [ ] Docs in `docs/<name>/` are in sync with `src/index.ts`
- [ ] `pnpm --filter @vielzeug/codex build` — MCP bundle updated with latest docs
- [ ] REPL examples for `<name>` all use the current API and recommended patterns
- [ ] No `TODO`, `FIXME`, or `HACK` comments left without a tracking issue
- [ ] Rush change file generated for every touched package (`rush change`; non-interactive: `rush change --bulk --message "<summary>" --bump-type <patch|minor|major>`). Use `patch` for fixes, `minor` for new features, `major` for breaking changes.
- [ ] Commit message follows conventional format: `feat(<name>): <summary>`

## Persistence

Run artifacts persist under `.devin/workflows/runs/<name>/`, governed by the DOX framework. Before reading or writing them, follow the DOX chain: read the root `AGENTS.md`, then `.devin/workflows/runs/AGENTS.md`, and honour their contracts.

- `plan.md` — written by Phase 1 (`/pkg-plan`); consumed by Phase 2 (`/pkg-implement`).
- `progress.md` — baseline metrics (from "Capture the baseline first") plus the phase status table below and propagation notes.
- `review.md` / `security.md` — optional consolidated findings from Phases 3–4.

Treat these as live working artifacts for the current run — overwrite stale content rather than appending.

## Progress tracking

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
