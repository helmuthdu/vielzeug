# AGENTS.md — Vielzeug (DOX root rail)

## Purpose

Root [DOX](https://github.com/agent0ai/dox) rail for the Vielzeug monorepo. It anchors the AGENTS.md chain.

DOX is adopted in a **tiered** fashion: a child `AGENTS.md` exists only where a subtree has local rules not already covered by the canonical files in `.ai/core/`, `.ai/data/`, `.ai/reference/`, and `.ai/tasks/`. Leaf packages that follow the standard conventions intentionally have **no** `AGENTS.md` — that absence is expected, not "unindexed".

## Ownership

- **AI system entrypoint** — `.ai/README.md`.
- **Engineering conventions** (disposal, logging, errors, file layout) — `.ai/core/conventions.md`.
- **Package catalogue and dependency graph** — `.ai/data/packages.json` and `.ai/reference/packages.md`.
- **Workspace toolchain, commands, versioning** — `.ai/core/workspace.md`.
- **Task playbooks** (analyze / change / validate / docs / repl) — `.ai/tasks/*.md`, with structured task metadata in `.ai/data/tasks.json`.
- **Contributor workflow** — `.github/contributing.md`.
- **Additional contributor/tooling context** — `CLAUDE.md`.

## Task Index

Reach for the smallest task that matches the job:

| Situation | Read |
| --- | --- |
| Review or redesign a package | `.ai/tasks/analyze.md` |
| Implement a package or repo change | `.ai/tasks/change.md` |
| Run focused correctness / security / coverage checks | `.ai/tasks/validate.md` |
| Sync package docs | `.ai/tasks/docs.md` |
| Update REPL examples | `.ai/tasks/repl.md` |

Default guidance: prefer one focused task plus the smallest useful validation instead of a fixed multi-phase pipeline.

## Local Contracts

- `.ai/state/` (AI scratch state) is gitignored, not part of the DOX chain — see `.ai/state/AGENTS.md`.
- Do not duplicate canonical context; link to the relevant `.ai/core/**/*.md`, `.ai/tasks/**/*.md`, `.ai/data/**/*.json`, or `.ai/reference/**/*.md` file.

## Work Guidance

Defer to `.ai/core/conventions.md` for engineering conventions, `.ai/data/packages.json` / `.ai/reference/packages.md` for package facts, `.ai/core/workspace.md` for toolchain and commands, and the relevant `.ai/tasks/*.md` file for task procedure.

## Verification

- Tests: `pnpm vitest run packages/<name>/src/__tests__/`
- Lint: `pnpm --filter @vielzeug/<name> lint`
- Build: `pnpm --filter @vielzeug/<name> build`
- Docs: `pnpm docs:build`
- REPL examples: `pnpm validate:repl` (`-- --package <name>` for a focused package run)
- AI metadata: `pnpm check:ai-data` (`pnpm gen:ai-data` to refresh `.ai/data/` and generated references)

## Child DOX Index

- `packages/AGENTS.md` — source work for all `@vielzeug/*` libraries; indexes packages with extra local rules.
- `docs/AGENTS.md` — VitePress documentation site and REPL.
- `scripts/AGENTS.md` — repo tooling: release automation, worktree helper, generated-doc sync, REPL codegen/validation, and the shared `scripts/lib/` primitives they're all built on. No top-level router/CLI entrypoint exists on purpose — run `pnpm run` (no args) to see every available command; see `scripts/AGENTS.md`'s Layout section for why a hand-maintained routing table was rejected.
- `.github/AGENTS.md` — CI/CD workflow YAML and the `scripts/release/` automation it calls into; the npm Trusted Publishing constraints that shape `publish.yml`'s design.
- `.ai/state/AGENTS.md` — lifecycle contract for gitignored AI scratch state. Not itself committed history — describes ephemeral state, not a package.
