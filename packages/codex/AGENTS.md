# AGENTS.md — codex

MCP (Model Context Protocol) server and CLI that exposes all Vielzeug docs to AI clients. An executable tool, not a consumed library; standalone — no `@vielzeug/*` runtime dependencies. The docs it bundles live in `docs/` (see `docs/AGENTS.md`).

## Local contracts

- **Build bundles the docs.** `prepare:data` (`scripts/generate-bundled-data.ts`) reads `docs/` and generates `packages/codex/data/` before compilation. It runs as the first step of `build` and `test:integration` (explicit, not an npm `pre*` hook — Rush does not run lifecycle hooks) — do not call `tsc` directly when you need fresh data.
- `packages/codex/data/` is **generated and gitignored** — never hand-edit or commit it. `prepare:data` requires `packages/refine/dist/custom-elements.json` and fails without it; `@vielzeug/refine` is a workspace devDependency purely so `rush build` builds it first.
- Entry points: `src/cli.ts` (CLI, run as `node dist/cli.js`), `src/index.ts` (generic catalog, snapshot loader, stdio transport, errors, and server hosts), `src/advanced.ts` (`./advanced` subpath — snapshot parser internals), `src/refine.ts` (`./refine` subpath — opt-in Refine catalog and tools), `src/catalog.ts` (pure data operations), `src/server.ts` (MCP adapter), `src/http.ts` (loopback Streamable HTTP host), and `src/snapshot.ts` (validated snapshot loader).
- **MCP tools live in `src/tools/`, one file per domain**: `packages.ts` (generic catalog operations), `refine.ts` (refine-only, prefixed `refine-*`, registered via the `./refine` subpath's `registerRefineTools()` — not part of the main entry), `index.ts` (registry plus MCP adapter), `schema.ts` (local `ToolSchema` declarations — the single source for both wire `inputSchema` and runtime validation via `parseArgs()`), and `shared.ts` (MCP manifest shape). Tools return domain values; only `index.ts` serializes MCP results.
- **README tool tables are generated, not hand-written.** `pnpm gen:tool-docs` (`scripts/generate-tool-docs.ts`, run explicitly after `build` — deliberately not part of `build`, which must not write outside the package) renders the `<!-- TOOLS:GENERIC -->` / `<!-- TOOLS:REFINE -->` tables in `docs/codex/tools.md` straight from `packageTools` and `refineTools` — never edit those tables by hand, edit the tool's `description`/`inputSchema` and rebuild. This script reads compiled `dist/tools/index.js` and `dist/tools/refine.js` (not `src/`) because `src/tools/*.ts` import each other with `.js` specifiers for the real NodeNext build, which `node --experimental-strip-types` does not rewrite at run time — run `pnpm build` first if you need fresh tables.
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

## Adding an MCP tool

Add it to `src/tools/packages.ts` (generic) or `src/tools/refine.ts` (refine-specific — use a `refine-` name prefix), define its local `ToolSchema` once with `satisfies ToolSchema`, return a domain value from `execute()`, use `Catalog` methods for expected failures, cover it in `src/__tests__/`, then run `pnpm build` to refresh generated README tables.

## Verification

- Tests (`test:integration` runs `prepare:data` first): `pnpm --filter @vielzeug/codex test`
- Fast unit-only loop: `pnpm --filter @vielzeug/codex test:unit`
- Lint: `pnpm --filter @vielzeug/codex lint`
- Build: `pnpm --filter @vielzeug/codex build`; then `pnpm --filter @vielzeug/codex gen:tool-docs` when tool descriptions or schemas changed
