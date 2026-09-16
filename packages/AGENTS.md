# AGENTS.md — Packages

Every `packages/<name>/` is an independent, publishable `@vielzeug/*` library. `.agents/conventions.md` is the full engineering contract for package source — read it before editing any package. Package facts come from `packages/<name>/package.json` (summarized in the generated `.agents/reference/packages.md`); usage docs live in `docs/<name>/`.

## Standard shape

`src/index.ts` (the only public surface), `src/__tests__/` (Vitest), `vite.config.ts` + `vite.bundle.config.ts` (ESM + CJS + IIFE), `tsconfig.json` / `tsconfig.declarations.json` (strict), `README.md`. Create new packages with `pnpm new:package`.

## Verification

- Tests: `pnpm vitest run packages/<name>/src/__tests__/`
- Lint: `pnpm --filter @vielzeug/<name> lint`
- Build: `pnpm --filter @vielzeug/<name> build`

## Packages with local rules

Most packages need no `AGENTS.md`; only these carry rules beyond the conventions.

- `packages/ore/AGENTS.md` — web-component authoring primitives; `./testing` sub-path; narrow a11y contract.
- `packages/prism/AGENTS.md` — reactive SVG charting; DOM-output; a11y hard requirement.
- `packages/refine/AGENTS.md` — component library; manifest-driven exports; bundles `lucide`; design modes.
- `packages/codex/AGENTS.md` — MCP server + CLI; bundles docs at build time.
