# AGENTS.md — Packages

## Purpose

DOX contract for all source work under `packages/`. Each `packages/<name>/` is an independent, publishable `@vielzeug/*` library.

## Ownership

- **Engineering conventions** (logging standard, dispose convention, error classes, file layout) — `.ai/rules/code/conventions.md` (single source of truth). Read it before editing any package.
- **Package catalogue and dependency graph** — `.ai/rules/data/catalogue.md`.
- **Per-package usage docs** live in `docs/<name>/`; per-package overview in `packages/<name>/README.md`.

## Local Contracts

Standard package shape: `src/index.ts` (the only public surface), `src/__tests__/` (Vitest), `vite.config.ts` (ESM+CJS), strict `tsconfig.json`.

- All public exports go through `src/index.ts`, sorted (ESLint Perfectionist).
- Zero external runtime dependencies; inter-package `@vielzeug/*` deps use `workspace:*`. **Exception: `refine` bundles `lucide`** — see its local contract. `refine` and `prism` also use `axe-core` as a devDependency for accessibility testing; it is not bundled. See `.ai/rules/code/conventions.md` for the full documented exceptions list.
- Internal dev warnings go through `src/_dev.ts` (`warn()` / `error()`), never bare `console.*`. See the logging standard in `.ai/rules/code/conventions.md`.
- Owned-resource teardown is `dispose()` + `[Symbol.dispose]`. Never `destroy()`/`close()`/`cleanup()`.

## Work Guidance

- Most packages have no local AGENTS.md and need none — the rules above plus `.ai/rules/code/conventions.md` are their full contract.
- Only the packages in the Child DOX Index below carry extra local rules.

## Verification

- Tests: `pnpm vitest run packages/<name>/src/__tests__/`
- Lint: `pnpm --filter @vielzeug/<name> lint`
- Build: `pnpm --filter @vielzeug/<name> build`

## Child DOX Index

- `packages/ore/AGENTS.md` — web-component authoring primitives; multiple sub-path exports.
- `packages/prism/AGENTS.md` — reactive SVG charting library; DOM-output package; accessibility hard requirement.
- `packages/refine/AGENTS.md` — component library; manifest-driven exports; bundles `lucide`.
- `packages/codex/AGENTS.md` — MCP server + CLI; bundles docs at build time.
