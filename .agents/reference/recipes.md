# Task recipes

Task → files to touch → gate. Each recipe assumes the rules in the linked `AGENTS.md` files; it lists touchpoints, not policy. The named gate is what catches a skipped step.

## New package

Never hand-create the scaffold: `bun run new:package <name> "<description>"` creates `packages/<name>/` and `docs/<name>/` and prints the follow-ups. Then: implement `src/index.ts` + tests, add the sidebar entry in `docs/.vitepress/config.ts`, add the card to `docs/.vitepress/theme/components/packageGroups.ts`, add REPL examples under `docs/.vitepress/theme/components/repl/examples/<name>/` and register them in `repl/examples/index.ts`. Gate: `bun run --filter @vielzeug/<name> lint && bun run --filter @vielzeug/<name> build && bun x vitest run packages/<name>/src/__tests__/` plus `bun run validate:sidebar`; `replExamples.test.ts` fails until REPL-eligible packages have examples.

## New or renamed Refine component

Follow "Adding a component" in `packages/refine/AGENTS.md`. The category folder must match the single category map `docs/.vitepress/theme/components/refineCategories.ts` (the component sidebar and docs pages generate from it). Docs page per component, co-located `*.test.ts` and `*.e2e.ts`. Gate: refine's gates in `packages/refine/AGENTS.md` plus `bun run validate:sidebar -- --package=refine`.

## Public API change (including breaking)

Update `src/index.ts` (or the subpath entry), its tests, the package's `docs/<name>/` reference pages, and any REPL example that shows the old shape. Breaking changes ride the next train: describe them in the changelog entry and `docs/<name>/migration.md`. Change file: `bun scripts/change.mjs <name> minor "<message>"` (type selects the changelog section only). Gate: `bun run validate:docs -- --package=<name>`, `validate:readme`, `validate:repl`, `validate:sidebar` with the same `-- --package=`.

## New codex MCP tool

Follow "Adding an MCP tool" in `packages/codex/AGENTS.md`: `src/tools/packages.ts` or `src/tools/refine.ts`, tests in `src/__tests__/`, then `bun run --filter @vielzeug/codex gen:tool-docs` to regenerate the tables in `docs/codex/tools.md` (never hand-edit them). Gate: `bun run --filter @vielzeug/codex test`.

## New REPL example

Add the file under `docs/.vitepress/theme/components/repl/examples/<package>/`, register it in that folder's `index.ts` **and** in the top-level `repl/examples/index.ts` map; the registry regenerates via `bun run gen:repl-registry` (also runs inside `docs:dev`/`docs:build`). Gate: `bun run validate:repl -- --package=<name>` and `replExamples.test.ts`.

## New docs page

Follow the Diátaxis layout in `.agents/reference/docs-template.md`; rules in `docs/AGENTS.md`. Add a sidebar entry in `docs/.vitepress/config.ts` when the page must be navigable. Gate: `bun run validate:docs` and `bun run validate:sidebar` (sidebar links vs. pages on disk); the full build is `bun run --filter @vielzeug/codex build && bun run docs:build`.

## New script under `scripts/`

Add a header comment stating why the script exists (the header is the contract; `scripts/AGENTS.md`'s layout table stays one line per file). Cover it in `scripts/__tests__/`. Gate: `bun x vitest run scripts/` and a direct smoke run of the script.

## Demo exposes a library gap

Fix the owning package (tests and docs there first), then consume the fix from the demo; never add a demo-only shim (`demos/AGENTS.md`). Gate: the owning package's gates plus `bun run validate:demos`.

## New `.agents/` file

List it in `.agents/README.md` so it is discoverable, and reference it from the `AGENTS.md` that routes to it. Gate: `bun run check:ai-data` (every `.agents/...` reference in the repo must resolve).
