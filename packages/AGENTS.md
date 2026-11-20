# AGENTS.md: Packages

> Read when: editing source under any `packages/<name>/` directory.

Every `packages/<name>/` is an independent, publishable `@vielzeug/*` library. `.agents/conventions.md` is the full engineering contract for package source: read it before editing any package. Package facts come from `packages/<name>/package.json`; the generated [`.agents/reference/packages.md`](../.agents/reference/packages.md) indexes every package's sub-paths, docs directory, and local `AGENTS.md`; usage docs live in `docs/<name>/`.

## Standard shape

`src/index.ts` (root public surface; approved subpaths are declared in the manifest), `src/__tests__/` (Vitest), `vite.config.ts` + `vite.bundle.config.ts` (ESM + CJS + IIFE), `tsconfig.json` / `tsconfig.declarations.json` (strict), `README.md`. New packages come from `bun run new:package` (owner: `.agents/conventions.md` → New packages).

## Verification

Default gates live in root `AGENTS.md` → **Project profile** (Commands and Validation gates). A package's own `AGENTS.md` lists only what differs from them.

## Packages with local rules

Most packages need no `AGENTS.md`. The authoritative list of packages that carry rules beyond the conventions is the generated **Subtree AGENTS.md index** in root `AGENTS.md` — read a package's file when its `Read when:` condition matches your task.
