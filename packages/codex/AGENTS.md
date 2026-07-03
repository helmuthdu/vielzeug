# AGENTS.md — codex

## Purpose

MCP (Model Context Protocol) server and CLI that exposes all Vielzeug docs to AI clients. Unlike the other packages, this is an executable tool, not a consumed library.

## Ownership

- Parent contract: `packages/AGENTS.md` and `.ai/rules/code/conventions.md`.
- Source docs it bundles live in `docs/` (owned by `docs/AGENTS.md`).

## Local Contracts

- **Build bundles the docs.** `prepare:data` (`scripts/generate-bundled-data.ts`) reads `docs/` and generates `packages/codex/data/` before compilation. It runs automatically via the `prebuild` and `pretest` hooks — do not call `tsc` directly when you need fresh data.
- `packages/codex/data/` is **generated and gitignored** — never hand-edit or commit it.
- Entry points: `src/cli.ts` (CLI, run as `node dist/cli.js`), `src/index.ts` (public barrel), `src/server.ts` (server factory), `src/http.ts` (HTTP transport via `--port`).
- **MCP tools live in `src/tools/`, one file per domain**: `packages.ts` (generic — works for every bundled package), `refine.ts` (refine-only, prefixed `refine-*`), `index.ts` (registry `ALL_TOOLS` + `registerTools()`), `schema.ts` (`ToolSchema` + `parseArgs()` — the single declaration each tool's `inputSchema` and runtime validation both read from), `shared.ts` (`ToolContext`, `ToolDefinition`, `requirePackage()`, result helpers).
- **README tool tables are generated, not hand-written.** `pnpm gen:tool-docs` (`scripts/generate-tool-docs.ts`, wired as `postbuild`) renders the `<!-- TOOLS:GENERIC -->` / `<!-- TOOLS:REFINE -->` tables in `README.md` straight from `ALL_TOOLS` — never edit those tables by hand, edit the tool's `description`/`inputSchema` and rebuild. This script reads compiled `dist/tools/index.js` (not `src/`) because `src/tools/*.ts` import each other with `.js` specifiers for the real NodeNext build, which `node --experimental-strip-types` does not rewrite at run time — run `pnpm build` first if you need fresh tables.
- **Tool errors: throw `ToolError(code, message)`, never `return` a hand-built error result.** `code` is `'INVALID_ARG' | 'NOT_FOUND' | 'UNAVAILABLE'` (`src/errors.ts`). `registerTools()`'s central `catch (err instanceof ToolError)` is the only place that converts one into an MCP `{isError: true}` result (as JSON `{code, message}` text) — this is the one error-handling mechanism in the tool layer, not two. Use `requirePackage()` (`shared.ts`) / `requireComponent()`, `requireAnyComponent()` (`refine.ts`) to resolve a slug/tag instead of a manual `if (!x) throw ...` — every existing tool does.
- **No hand-duplicated package internals.** Don't hand-author reference data that mirrors another package's real exports (e.g. a curated list of another package's functions/types) — it drifts silently. If a tool needs that information, derive it from the already-bundled `apiSource`/`docs`/`typeSignatures` (see `get-type-signature`, `get-docs`) or from real generated build output (see refine's Custom Elements Manifest in `readRefineDeclarations` / REPL examples in `scripts/repl-examples.ts` / exported-symbol text in `scripts/type-signatures.ts`), not from a second, hand-maintained copy.
- Scripts stderr output must go through `scripts/_log.ts` (`log()`). Never use bare `process.stderr.write` in scripts.
- After changing docs in `docs/`, rebuild to refresh the bundle: `pnpm --filter @vielzeug/codex build`.

## Testing

- Tests are split into two vitest projects (`vitest.config.ts`): `*.test.ts` (unit — fast, no dependency on real monorepo content) and `*.integration.test.ts` (loads real bundled data / runs the full generator against real `docs/`+sibling packages — slower, and will fail if run outside a full monorepo checkout).
- `pnpm test:unit` — fast loop while iterating, no `prepare:data` needed beforehand.
- `pnpm test:integration` / `pnpm test` — full coverage; `pretest` regenerates bundled data first.
- `generator.integration.test.ts` and `server.integration.test.ts` are the two integration files today. New tests that load real bundled data or run `generateBundledData()` against the real repo belong in a `*.integration.test.ts` file, not a plain `*.test.ts` one.

## Work Guidance

- No `@vielzeug/*` runtime deps — codex is standalone.
- When adding an MCP tool: add it to `src/tools/packages.ts` (generic) or `src/tools/refine.ts` (refine-specific — use a `refine-` name prefix; don't add a new single-package special case without strong justification, see the note above), define its `ToolSchema` once with `satisfies ToolSchema` (not `: ToolSchema` — the literal keys are what let `parseArgs()` infer its return type with no manual type argument), throw `ToolError` for failure paths, cover it in `src/__tests__/`, then run `pnpm build` to refresh the generated README tables.

## Verification

- Tests (auto-runs `prepare:data` via `pretest`): `pnpm --filter @vielzeug/codex test`
- Fast unit-only loop: `pnpm --filter @vielzeug/codex test:unit`
- Lint: `pnpm --filter @vielzeug/codex lint`
- Build (also refreshes README tool tables via `postbuild`): `pnpm --filter @vielzeug/codex build`

## Child DOX Index

- None.
