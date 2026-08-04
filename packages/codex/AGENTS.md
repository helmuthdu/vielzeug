# AGENTS.md — codex

## Purpose

MCP (Model Context Protocol) server and CLI that exposes all Vielzeug docs to AI clients. Unlike the other packages, this is an executable tool, not a consumed library.

## Ownership

- Parent contract: `packages/AGENTS.md` and `.ai/core/conventions.md`.
- Source docs it bundles live in `docs/` (owned by `docs/AGENTS.md`).

## Local Contracts

- **Build bundles the docs.** `prepare:data` (`scripts/generate-bundled-data.ts`) reads `docs/` and generates `packages/codex/data/` before compilation. It runs automatically via the `prebuild` and `pretest` hooks — do not call `tsc` directly when you need fresh data.
- `packages/codex/data/` is **generated and gitignored** — never hand-edit or commit it.
- Entry points: `src/cli.ts` (CLI, run as `node dist/cli.js`), `src/index.ts` (public barrel), `src/catalog.ts` (pure data operations), `src/server.ts` (MCP adapter), `src/http.ts` (loopback Streamable HTTP host), and `src/snapshot.ts` (validated snapshot loader).
- **MCP tools live in `src/tools/`, one file per domain**: `packages.ts` (generic catalog operations), `refine.ts` (refine-only, prefixed `refine-*`), `index.ts` (registry plus MCP adapter), `schema.ts` (single input-schema/runtime-validation declaration), and `shared.ts` (MCP manifest shape). Tools return domain values; only `index.ts` serializes MCP results.
- **README tool tables are generated, not hand-written.** `pnpm gen:tool-docs` (`scripts/generate-tool-docs.ts`, wired as `postbuild`) renders the `<!-- TOOLS:GENERIC -->` / `<!-- TOOLS:REFINE -->` tables in `README.md` straight from `ALL_TOOLS` — never edit those tables by hand, edit the tool's `description`/`inputSchema` and rebuild. This script reads compiled `dist/tools/index.js` (not `src/`) because `src/tools/*.ts` import each other with `.js` specifiers for the real NodeNext build, which `node --experimental-strip-types` does not rewrite at run time — run `pnpm build` first if you need fresh tables.
- **Expected catalog failures throw `CatalogError(code, message)`, never hand-built MCP error results.** `code` is `'INVALID_ARG' | 'NOT_FOUND' | 'UNAVAILABLE'`; `registerTools()` centrally maps it to MCP `{isError: true}` JSON. Resolve package, content, and Refine data through `Catalog` methods instead of duplicate lookups in tools.
- **No hand-duplicated package internals.** Don't hand-author reference data that mirrors another package's real exports (e.g. a curated list of another package's functions/types) — it drifts silently. If a tool needs that information, derive it from the already-bundled `apiSource`/`docs`/`typeSignatures` (see `get-type-signature`, `get-docs`) or from real generated build output (see refine's Custom Elements Manifest in `readRefineDeclarations` / REPL examples in `scripts/repl-examples.ts` / exported-symbol text in `scripts/type-signatures.ts`), not from a second, hand-maintained copy.
- Scripts stderr output must go through `scripts/_log.ts` (`log()`). Never use bare `process.stderr.write` in scripts.
- After changing docs in `docs/`, rebuild to refresh the bundle: `pnpm --filter @vielzeug/codex build`.
- **codex has no `@vielzeug/*` dependency edge, so it never rides along on another package's release** — but it bundles all of `docs/` into its published `data/` dir at build time, so a docs-only change still changes codex's shipped npm content and needs its own release. A pre-commit hook (`scripts/auto-change-codex.mjs`, wired in `lefthook.yml` as `change:codex`, glob `docs/**`) auto-writes a patch change file for codex whenever docs change and none is already pending — don't hand-write a duplicate one.

## Testing

- Tests are split into two Vitest projects (`vitest.config.ts`): `*.test.ts` uses temporary fixture snapshots only; `*.integration.test.ts` regenerates a current snapshot from real `docs/` and sibling packages, requiring a full monorepo checkout.
- `pnpm test:unit` — fast loop while iterating, no `prepare:data` needed beforehand.
- `pnpm test:integration` / `pnpm test` — integration coverage; `test:integration` regenerates snapshot data first.
- `generator.integration.test.ts` validates real monorepo snapshot generation. New tests that load real package/docs inputs belong in `*.integration.test.ts`; all other tests must construct temporary snapshots.

## Work Guidance

- No `@vielzeug/*` runtime deps — codex is standalone.
- When adding an MCP tool: add it to `src/tools/packages.ts` (generic) or `src/tools/refine.ts` (refine-specific — use a `refine-` name prefix), define its `ToolSchema` once with `satisfies ToolSchema`, return a domain value from `execute()`, use `Catalog` methods for expected failures, cover it in `src/__tests__/`, then run `pnpm build` to refresh generated README tables.

## Verification

- Tests (auto-runs `prepare:data` via `pretest`): `pnpm --filter @vielzeug/codex test`
- Fast unit-only loop: `pnpm --filter @vielzeug/codex test:unit`
- Lint: `pnpm --filter @vielzeug/codex lint`
- Build (also refreshes README tool tables via `postbuild`): `pnpm --filter @vielzeug/codex build`

## Child DOX Index

- None.
