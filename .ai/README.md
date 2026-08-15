# Vielzeug AI Architecture

This folder is the canonical source for how AI agents should work in the Vielzeug monorepo.

The design is intentionally small:

- `core/` — stable repo-wide policy and coding rules
- `tasks/` — task playbooks for the common kinds of work
- `data/` — machine-readable metadata that scripts and adapters can consume
- `reference/` — human-readable reference material: generated from `data/` (`packages.md`) or hand-curated and shared by multiple tasks (`docs-template.md`, `security-checklist.md`)

## Start here

Pick the smallest task that fits the job:

| Need                                           | Read                    |
| ---------------------------------------------- | ----------------------- |
| Change code, tests, tooling, or CI             | `.ai/tasks/build.md`    |
| Investigate, audit, plan, or redesign          | `.ai/tasks/review.md`   |
| Update docs, README, recipes, or REPL examples | `.ai/tasks/document.md` |
| Prepare releases, commits, or pull requests    | `.ai/tasks/release.md`  |

Load references declared for that task in `.ai/data/tasks.json` and the task's `Load first` section. Generated local adapters render same list for one-hop task startup.

Load `.ai/core/conventions.md` before editing package source. Follow relevant `AGENTS.md` chain before entering a subtree.

`policy.md` defines cross-task conventions task docs build on instead of restating: **rigor** (`full`/`quick` depth, orthogonal to scope), **structured markers** (`[FINDING]`, `[FIXED]`, `[DEFERRED]`, `[BLOCKED]`, `[VERIFY]`), and **progress checkpoints** for multi-step work.

## Design principles

- Prefer the smallest task that solves the problem.
- Use structured data from `.ai/data/` instead of copying facts into prose.
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
