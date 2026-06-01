---
agent: agent
description: >
  Master orchestrator for the full Vielzeug package improvement workflow.
  Runs plan → implement → review → security → tests → docs → repl
  with the correct repetition cadence (3×/3×/1×).
tools:
  - search/codebase
  - read/terminalLastCommand
  - execute/runInTerminal
---

# pkg-workflow — Full Package Improvement Workflow

You are orchestrating the complete improvement cycle for a **Vielzeug** package.

The workflow has **7 phases** with specific repetition counts:

```
Phase 1: Plan          × 3   (#pkg-plan)
Phase 2: Implement     × 3   (#pkg-implement)
Phase 3: Review        × 3   (#pkg-review)
Phase 4: Security      × 3   (#pkg-security)
Phase 5: Tests         × 1   (#pkg-tests)
Phase 6: Docs          × 1   (#pkg-docs)
Phase 7: REPL          × 1   (#pkg-repl)
```

## Before you begin

Ask the user for:

1. **Package name** (e.g. `spell`, `ripple`, `courier`)
2. **Scope** — full workflow, or start from a specific phase?
3. **Any known issues or goals** to focus on?

If the user chooses to start from a later phase (e.g. Docs), do not retroactively run earlier phases unless explicitly requested. Treat the chosen phase as a focused, standalone run.

---

## Phase execution guide

### Phase 1 — Plan × 3

Execute the instructions from `#pkg-plan` three times. Each pass deepens the analysis:

- **Pass 1**: Broad sweep — current state, obvious gaps, quick wins.
- **Pass 2**: Focused deep-dive on the highest-priority area from Pass 1.
- **Pass 3**: Synthesize both passes into a final prioritized improvement plan.

Consolidate the output into a single ranked list before moving to Phase 2.

---

### Phase 2 — Implement × 3

Execute the instructions from `#pkg-implement` in three iterative rounds:

- **Round 1**: Implement high-priority (🔴 Bug + 🟠 Design) items from the plan.
- **Round 2**: Implement medium-priority (🟡 Coverage + 🟢 Enhancement) items; re-verify all tests pass.
- **Round 3**: Final polish — check all new code for TypeScript quality, run `pnpm --filter /<name> fix`, confirm zero lint errors.

Between each round, run:

```bash
pnpm vitest run packages/<name>/src/__tests__/
```

Fix any failures before proceeding.

---

### Phase 3 — Review × 3

Execute the instructions from `#pkg-review` three times, rotating lenses:

- **Pass 1**: Lens A — Correctness, Edge Cases, and Tests.
- **Pass 2**: Lens B — Architecture, Design, and DX.
- **Pass 3**: Lens C — TypeScript Quality and Type Safety.

For each CRITICAL or MAJOR finding, fix it before proceeding to the next pass.
Collect MINOR and NIT issues into a fix list and apply them after Pass 3 (using `#pkg-implement` where appropriate) before moving on to Phase 4.

---

### Phase 4 — Security × 3

Execute the instructions from `#pkg-security` three times, each focusing on a different surface:

- **Pass 1**: Input validation, injection vectors, and dependency risks.
- **Pass 2**: Prototype pollution and type safety at runtime.
- **Pass 3**: Browser-specific risks and information leakage (plus any server/API/auth concerns if present).

Fix all ❌ vulnerability findings immediately. Document ⚠️ concerns with a code comment and/or issue if they cannot be fixed without an unacceptable breaking change.

---

### Phase 5 — Tests × 1

Execute the instructions from `#pkg-tests` once.

After restructuring and adding tests, verify:

```bash
pnpm vitest run packages/<name>/src/__tests__/
```

All tests must pass before proceeding.

---

### Phase 6 — Docs × 1

Execute the instructions from `#pkg-docs` once.

Verify that:

- All API signatures in the docs match `src/index.ts`.
- All examples compile conceptually and reflect the current recommended usage patterns.

---

### Phase 7 — REPL × 1

Execute the instructions from `#pkg-repl` once.

Verify that:

- No stale API usage remains in any REPL example file.
- Examples align with the patterns documented in `usage.md` and `examples/*.md`.

---

## Final checklist

Before declaring the workflow complete:

- [ ] `pnpm vitest run packages/<name>/src/__tests__/` — all tests pass
- [ ] `pnpm --filter /<name> lint` — zero lint errors
- [ ] `pnpm --filter /<name> build` — build succeeds, no TypeScript errors
- [ ] Docs in `docs/<name>/` are in sync with `src/index.ts`
- [ ] REPL examples for `<name>` all use the current API and recommended patterns
- [ ] No `TODO`, `FIXME`, or `HACK` comments left without a tracking issue
- [ ] Show the Future Improvements and give suggestions for next steps

---

## Progress tracking

Maintain a running status table as you work:

| Phase           | Status | Notes |
|-----------------|--------|-------|
| 1. Plan × 3     | ⏳ / ✅ |       |
| 2. Implement × 3 | ⏳ / ✅ |       |
| 3. Review × 3   | ⏳ / ✅ |       |
| 4. Security × 3 | ⏳ / ✅ |       |
| 5. Tests        | ⏳ / ✅ |       |
| 6. Docs         | ⏳ / ✅ |       |
| 7. REPL         | ⏳ / ✅ |       |

Update this table after each phase completes.
