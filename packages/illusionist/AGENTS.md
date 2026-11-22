# AGENTS.md: illusionist

> Read when: working on `@vielzeug/illusionist` fake-data generation, locales, or seeds.

Typed, deterministic, locale-aware fake data generator with a seeded PRNG. Sub-paths: root, `./locales`, `./locales/de`, `./locales/en`.

## Local contracts

- **Locale data stays out of the root entry.** `src/index.ts` deliberately excludes locale catalogs for tree-shaking; consumers opt in through `./locales*`. The only exception is `src/iife-entry.ts`, the REPL-only IIFE entry that re-exports root plus locales — it is not a public sub-path and must not gain consumers.
- **Seeding is part of the public contract.** `createSeed`: a number seeds a mulberry32 state directly; a string is folded to 32 bits (JSON-hash fold); no seed draws from `crypto.getRandomValues`. mulberry32 is not cryptographically secure — never present it as such, and never swap the PRNG without treating it as a breaking change (existing seeds stop reproducing).
- New generators follow the existing provider shape and must be deterministic under a fixed seed; cover determinism in tests, not just output shape.

## Verification

Locale additions need catalog entries for every shipped locale and a test that generates from each.
