# Vielzeug AI Architecture

This folder is the canonical source for how AI agents should work in the Vielzeug monorepo.

The design is intentionally small:

- `core/` — stable repo-wide policy and coding rules
- `tasks/` — task playbooks for the common kinds of work
- `data/` — machine-readable metadata that scripts and adapters can consume
- `reference/` — human-readable reference material: generated from `data/` (`packages.md`) or hand-curated and shared by multiple tasks (`docs-template.md`, `security-checklist.md`)
- `state/` — gitignored scratch state for an active run

## Start here

Pick the smallest task that fits the job:

| Need | Read |
| --- | --- |
| Review or redesign a package | `.ai/tasks/analyze.md` |
| Implement a package change | `.ai/tasks/change.md` |
| Run focused review / security / coverage checks | `.ai/tasks/validate.md` |
| Sync package docs | `.ai/tasks/docs.md` |
| Update REPL examples | `.ai/tasks/repl.md` |

Then load the two shared references every task depends on:

- `.ai/core/policy.md`
- `.ai/core/workspace.md`

Load `.ai/core/conventions.md` before editing package source.

`policy.md` also defines the cross-task conventions every task doc builds on instead of restating: **rigor** (`full`/`quick` depth, orthogonal to scope), **structured markers** (`[FINDING]`, `[FIXED]`, `[DEFERRED]`, `[BLOCKED]`, `[VERIFY]`), and **progress checkpoints** for multi-step work.

## Design principles

- Prefer the smallest task that solves the problem.
- Use structured data from `.ai/data/` instead of copying facts into prose.
- Keep state machine logic out of markdown. Persistent scratch state belongs in `.ai/state/`.
- Keep adapter- or client-specific files outside the canonical task docs.
- When a task needs a checklist or template, keep it with the task or in `reference/`.
- Keep every `.ai/...` cross-reference real — `pnpm check:ai-data` fails on a dangling one (see `scripts/sync-ai-data.mjs`).

## Canonical data

- Package metadata and dependency graph — `.ai/data/packages.json`
- Task metadata for local adapters — `.ai/data/tasks.json`

Shared reference material:

- Human-readable package reference (generated) — `.ai/reference/packages.md`
- Documentation page template — `.ai/reference/docs-template.md`
- Security review checklist — `.ai/reference/security-checklist.md`

## State

Active run state is ephemeral and gitignored. See `.ai/state/AGENTS.md`.

