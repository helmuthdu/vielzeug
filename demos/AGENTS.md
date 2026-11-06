# AGENTS.md: demos

Integration demos (`crm`, `eshop`, `voyage`) prove the packages compose into real apps. They are first-party integration harnesses, not throwaway samples: a demo that exposes a library gap means the owning package is missing something.

## Local contracts

- **Private, never published.** Demos carry `"private": true` and are linked by the root `workspaces` glob alongside `packages/*`. They never need a change file, never get a version, and never publish. `bun run build` builds only `packages/*`; `bun run validate:demos` builds and tests the demos.
- **A demo gap is a package gap.** When a demo needs behavior an installed `@vielzeug/*` package lacks, fix the owning package (with tests and docs) and consume the fix from the demo. Do not add a demo-only workaround, shim, or reimplementation.
- **Refine-first UI.** Follow the root `AGENTS.md` rules: prefer existing `ore-*` components and Refine design tokens over custom composite controls or hardcoded spacing, color, radius, or type values. Loading `@vielzeug/refine` also loads the `vielzeug` skill (`.agents/skills/vielzeug/SKILL.md`): use it instead of recalling component or token names.
- **Local source loop.** `bun run dev` resolves `@vielzeug/*` from installed `dist/`. `bun run dev:local` (and `build:local`) set `VIELZEUG_LOCAL_DEV=1`, and each demo's `scripts/local-packages.ts` rewrites every `@vielzeug/*` export to the sibling `packages/<name>/src` file, so package edits show up without a rebuild. Use `dev:local` when validating a package change through a demo; use plain `dev` when validating the shipped artifact.
- **Keep mocks honest.** Courier/Pulse run against in-repo mock transports that simulate latency and offline failure on purpose (they exercise Postmaster retry and Sentinel connectivity for real). Preserve that behavior rather than replacing it with instant resolves.

## Verification

- Build + unit tests for every demo: `bun run validate:demos`.
- One demo: `bun run --filter <demo-package-name> build && bun run --filter <demo-package-name> test` (names differ from folder names: read `demos/<name>/package.json`). `crm` and `eshop` also carry `test:e2e` (Playwright).
- Shared or broad demo impact: `bun run validate:demos`. Library behavior change: also run the owning package's validation row (`.agents/skills/build/SKILL.md`).
