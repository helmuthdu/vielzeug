# AGENTS.md — Workflow Run Artifacts (DOX)

## Purpose

Durable hand-off artifacts for package-improvement workflow runs (`/pkg-workflow` and its phases). These let later phases — and later sessions — resume from a known state instead of re-deriving context.

## Ownership

- Owned by the package-improvement workflows in `.devin/workflows/`.
- One subfolder per package under analysis: `runs/<name>/` (e.g. `runs/courier/`).

## Local Contracts

Each `runs/<name>/` folder may contain:

- `plan.md` — output of `/pkg-plan` (current state, gaps, prioritized plan, future ideas, risks). **Authoritative input for `/pkg-implement`.**
- `progress.md` — baseline metrics plus the `/pkg-workflow` phase status table and propagation notes.
- `review.md` — consolidated `/pkg-review` findings (optional).
- `security.md` — consolidated `/pkg-security` findings (optional).

Rules:

- `/pkg-plan` writes/overwrites `plan.md`; `/pkg-implement` reads it as the source of truth.
- These are **working artifacts for the active run, not historical diaries** — start fresh each cycle. Delete a package's `runs/<name>/` folder once its cycle is merged (i.e. the user has reviewed and approved the changes). The right trigger is explicit user confirmation, not the end of `/pkg-workflow` itself — ask if unclear. Within a single run, `review.md` / `security.md` may accumulate each pass under its own heading; do not carry stale passes across cycles.
- One concern per file. Never duplicate `.devin/rules/conventions.md`; reference it.

## Work Guidance

- Markdown only. Reference package paths explicitly (e.g. `packages/<name>/src/index.ts`).
- Use the `/pkg-plan` category icons in plan/progress items: 🔴 Bug / 🟠 Design / 🟡 Coverage / 🟢 Enhancement.

### Starter template for `progress.md`

When creating a new `runs/<name>/progress.md`, use this structure:

```markdown
# <name> — Workflow Progress

## Baseline

- Tests: <N> passing, <F> files
- Exports: <N> symbols in src/index.ts
- Lint: clean / <N> errors
- refine only: <N> components (from list-components)

## Phase Status

| Phase            | Status | Notes |
| ---------------- | ------ | ----- |
| 1. Plan × 3      | ⏳     |       |
| 2. Implement × 3 | ⏳     |       |
| 3. Review × 3    | ⏳     |       |
| 4. Security × 3  | ⏳     |       |
| 5. Tests         | ⏳     |       |
| 6. Docs          | ⏳     |       |
| 7. REPL          | ⏳     |       |
```

Update status to 🔄 when a phase starts, ✅ when complete, N/A for inapplicable phases. Use the Notes column to record the current pass within multi-pass phases (e.g. `"Lens B"`, `"Round 2"`).

## Verification

- Cross-check `plan.md` items against the real `packages/<name>/src/` before acting on them.

## Child DOX Index

- None.
