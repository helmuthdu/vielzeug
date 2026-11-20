# AGENTS.md: arsenal

> Read when: working on `@vielzeug/arsenal` utilities, or adding a helper that belongs in a category sub-path.

Non-trivial TypeScript utilities across ten category sub-paths (`./array`, `./async`, `./cache`, `./encoding`, `./function`, `./guards`, `./math`, `./object`, `./random`, `./string`) plus a root barrel that re-exports them. `sideEffects: false`: everything must stay tree-shakeable.

## Local contracts

- **Exports are manifest-driven.** The sub-path map is generated from `scripts/exports.manifest.mjs` by `scripts/sync-exports.mjs` (shared primitives in `scripts/lib/package-manifest.mjs`). Never hand-edit `package.json#exports` or the generated entry files: change the manifest, run `bun run --filter @vielzeug/arsenal sync:exports`. `verify:exports` runs inside `build` and `test` and fails on drift.
- **`src/_common/` is private** (`_lruMap.ts`, `_selectorSet.ts`, `unsafePaths.ts`): internal helpers shared across categories, never exported from any sub-path.
- A new utility lands in exactly one category sub-path and is re-exported from the root barrel; a helper used by two categories goes to `src/_common/` instead of being duplicated.

## Verification

Default gates: root `AGENTS.md` → **Project profile** (Package source). The build runs `verify:exports`, so a manifest/exports mismatch fails there; run `sync:exports` before committing manifest changes. Downstream: breaking changes here cascade to most of the family — check call sites with a workspace-wide grep before changing a signature.
