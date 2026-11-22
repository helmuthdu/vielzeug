# AGENTS.md: demos

> Read when: editing anything under `demos/`, or validating a package change through a demo app.

Integration demos (`crm`, `eshop`, `voyage`, `studio`) prove the packages compose into real apps. They are first-party integration harnesses, not throwaway samples: a demo that exposes a library gap means the owning package is missing something.

## Local contracts

- **Private, never published.** Demos carry `"private": true` and are linked by the root `workspaces` glob alongside `packages/*`. They never need a change file, never get a version, and never publish. `bun run build` builds only `packages/*`; `bun run validate:demos` builds and tests the demos.
- **A demo gap is a package gap.** When a demo needs behavior an installed `@vielzeug/*` package lacks, fix the owning package (with tests and docs) and consume the fix from the demo. Do not add a demo-only workaround, shim, or reimplementation.
- **Refine-first UI.** Prefer existing Refine components over custom composite controls. If a needed primitive or behavior is missing, improve Refine rather than adding a demo-only control. Use Refine tokens for visual values; use hardcoded values only for intrinsic technical constraints or when no token exists. For demos consuming `@vielzeug/*`, use the consumer guidance at `.agents/skills/vielzeug/SKILL.md`.
- **Local source loop.** `bun run --filter vielzeug-crm-demo dev` resolves `@vielzeug/*` from installed `dist/`. `bun run --filter vielzeug-crm-demo dev:local` (and `build:local`) set `VIELZEUG_LOCAL_DEV=1`, and each demo's `demos/<name>/scripts/local-packages.ts` rewrites every `@vielzeug/*` export to the sibling `packages/<name>/src` file, so package edits show up without a rebuild. Use `dev:local` when validating a package change through a demo; use plain `dev` when validating the shipped artifact.
- **Keep mocks honest.** Courier/Pulse run against in-repo mock transports that simulate latency and offline failure on purpose (they exercise Postmaster retry and Sentinel connectivity for real). Preserve that behavior rather than replacing it with instant resolves.

## Verification

- One demo: `bun run --filter <demo-package-name> build && bun run --filter <demo-package-name> test` (names differ from folder names; read `demos/<name>/package.json`). `crm`, `eshop`, and `studio` also carry `test:e2e` (Playwright).
- For shared demo changes, use the `validate:demos` gate in root `AGENTS.md`. For a library change exposed by a demo, validate the owning package too.
