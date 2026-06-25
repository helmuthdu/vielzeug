# AGENTS.md — docs

## Purpose

VitePress documentation site. Per-package docs live in `docs/<name>/` and follow the Diátaxis framework. Also hosts the interactive REPL (`docs/repl.md`) and the custom theme under `docs/.vitepress/`.

## Ownership

- **Documentation template, tone, and per-page structure rules** — `.devin/workflows/pkg-docs.md` (authoritative; do not duplicate here).
- **REPL example and Monaco-type rules** — `.devin/workflows/pkg-repl.md`.
- Package facts referenced by docs — `.devin/rules/conventions.md`.

## Local Contracts

- Each `docs/<name>/` has the four standard pages: `index.md` (Explanation), `usage.md` (How-to), `api.md` (Reference), `examples.md` + `examples/*.md` (How-to). Follow `pkg-docs.md` for required frontmatter and section order.
- REPL wiring lives in `docs/.vitepress/theme/components/repl/`: `examples/<name>/` (example modules) and `types/<name>.ts` (Monaco types), each registered in the matching `index.ts`.
- **DOM-output packages (`ore`, `refine`, `prism`) have no REPL examples or types** — the REPL has no preview container. Do not add them.
- Keep docs in sync with `packages/<name>/src/index.ts`; the `codex` package bundles these docs, so changes here feed the MCP server.

## Work Guidance

- Run docs work through the `/pkg-docs` and `/pkg-repl` workflows rather than ad-hoc edits.
- Editing docs invalidates the `codex` bundle — **always** rebuild codex after a docs pass (`pnpm --filter @vielzeug/codex build`). It is fast and idempotent; skipping it leaves the MCP bundle stale for future sessions.

## Verification

- Build: `pnpm docs:build` (catches broken markdown, dead links, invalid frontmatter).
- Local preview: `pnpm docs:dev`.

## Child DOX Index

- None.
