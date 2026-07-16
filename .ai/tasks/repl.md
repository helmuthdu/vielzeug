# REPL Task

Use this when examples in the docs REPL need to be added, corrected, or removed.

## Load first

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- `docs/AGENTS.md`
- `.ai/data/packages.json`

## Goal

Keep REPL examples current, small, runnable, and aligned with package docs.

## Rules

- REPL snippets should stay plain JavaScript by convention — not a hard technical requirement (Monaco transpiles real TypeScript before running), but it keeps shipped examples maximally copy-pasteable outside the REPL too. Write `code` as a real multi-line template literal, never a single-line string with escaped `\n`.
- One concept per snippet, 10–40 lines, with a one-line intent comment at the top. Prefer real-world-flavored demos over contrived toys; align with patterns in `docs/<name>/usage.md` and `examples/*.md`.
- Use only top-level `@vielzeug/<name>` imports — no external dependencies, no non-browser APIs.
- Each example should produce visible console output or a final returned value.
- DOM-output packages do not get REPL examples — check the `domOutput` flag in `.ai/data/packages.json` before adding any.
- Generated registry data (Monaco types, `apiExports`, sandbox IIFE bundle, dependency load order) is not hand-edited — it's derived from build output via `pnpm gen:repl-registry`. If it looks stale, rebuild the package first (`pnpm --filter @vielzeug/<name> build`), then regenerate.

## Net-new package (no `examples/<name>/` folder yet)

1. Create `docs/.vitepress/theme/components/repl/examples/<name>/` with at least one example module and an `index.ts` exporting a `Record<string, ExampleModule>` — copy the structure of an existing package's folder.
2. Register the package in the root `examples/index.ts`.
3. Add a one-line description to the `DESCRIPTIONS` map in `scripts/repl-metadata.ts` — the only hand-curated metadata; everything else derives from `vite.bundle.config.ts` and build output.
4. Build the package first (`pnpm --filter @vielzeug/<name> build` — needs `dist/index.d.ts` and `dist/<name>.iife.js`).
5. Run `pnpm gen:repl-registry`. Never hand-edit `registry.generated.ts` — it's overwritten on every `docs:dev`/`docs:build`/`docs:preview`.

## Default flow

1. Audit `docs/.vitepress/theme/components/repl/examples/<name>/`.
2. Compare examples against `packages/<name>/src/index.ts`.
3. Update or remove stale examples.
4. Add new examples only when they clarify real usage.
5. Run validation.

## Output shape

Report per example using `[ADDED]`, `[UPDATED]`, `[REMOVED]`, or `[SKIP] <reason>` — see `.ai/core/policy.md`'s Structured markers.

## Required validation

```bash
pnpm validate:repl -- --package <name>
pnpm docs:build
```

