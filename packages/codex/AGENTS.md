# AGENTS.md — codex

## Purpose

MCP (Model Context Protocol) server and CLI that exposes all Vielzeug docs to AI clients. Unlike the other packages, this is an executable tool, not a consumed library.

## Ownership

- Parent contract: `packages/AGENTS.md` and `.devin/rules/conventions.md`.
- Source docs it bundles live in `docs/` (owned by `docs/AGENTS.md`).

## Local Contracts

- **Build bundles the docs.** `prepare:data` (`scripts/generate-bundled-data.ts`) reads `docs/` and generates `packages/codex/data/` before compilation. It runs automatically via the `prebuild` and `pretest` hooks — do not call `tsc` directly when you need fresh data.
- `packages/codex/data/` is **generated and gitignored** — never hand-edit or commit it.
- Entry points: `src/cli.ts` (CLI, run as `node dist/cli.js`), `src/index.ts` (public barrel), `src/server.ts` (server factory), `src/http.ts` (HTTP transport via `--port`).
- MCP tools are defined in `src/tools.ts`. Keep the tool list in sync with `README.md` and `.devin/rules/conventions.md` ("AI integration") when tools change.
- Scripts stderr output must go through `scripts/_log.ts` (`log()`). Never use bare `process.stderr.write` in scripts.
- After changing docs in `docs/`, rebuild to refresh the bundle: `pnpm --filter @vielzeug/codex build`.

## Work Guidance

- No `@vielzeug/*` runtime deps — codex is standalone.
- When adding an MCP tool: implement in `src/tools.ts`, cover it in `src/__tests__/`, and update the tool list in `README.md` and `.devin/rules/conventions.md`.

## Verification

- Tests (auto-runs `prepare:data` via `pretest`): `pnpm --filter @vielzeug/codex test`
- Lint: `pnpm --filter @vielzeug/codex lint`
- Build: `pnpm --filter @vielzeug/codex build`

## Child DOX Index

- None.
