# CLAUDE.md — Vielzeug

Claude entry rail. Canonical agent system lives in `.ai/`; avoid copying package facts or engineering rules here.

## Start

1. Read `.ai/README.md`.
2. Select smallest matching `.ai/tasks/*.md` playbook.
3. Load references from the task's `Load` section.
4. Follow relevant `AGENTS.md` chain before editing.

## Canonical ownership

- Repo-wide policy — `.ai/core/policy.md`
- Workspace commands, versioning, worktrees — `.ai/core/workspace.md`
- Engineering conventions — `.ai/core/conventions.md`
- Package catalogue and dependency graph — `.ai/data/packages.json`, `.ai/reference/packages.md`
- Package docs structure — `.ai/reference/docs-template.md`
- Tasks — `.ai/tasks/*.md`
- Root/subtree contracts — `AGENTS.md`

## Commands

```bash
pnpm setup
pnpm build
pnpm test
pnpm lint
pnpm fix
pnpm docs:build
pnpm validate:docs -- --package=<name>
pnpm validate:repl -- --package=<name>
pnpm check:ai-data
```

Focused validation commands live in `.ai/core/workspace.md`; package-specific behavior belongs in package scripts.

## Client-specific rule

Use canonical sources above instead of repeating package counts, dependency graphs, conventions, or release guidance. Generated local task adapters live in `.claude/commands/`; regenerate with `pnpm gen:ai-data` after changing the task registry.
