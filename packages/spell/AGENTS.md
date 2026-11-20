# AGENTS.md: spell

> Read when: working on `@vielzeug/spell` schemas, validation, or its JSON Schema / predicate sub-paths.

Zero-dependency schema validation with Standard Schema V1 interoperability. Sub-paths: root (the `s` builder and schema types), `./json` (JSON Schema 2020-12: the `JsonSchema` type and `JSON_FORMATS` mapping, e.g. `isoDate` → `date`), `./predicates` (pure string-format predicates like `isEmail` that back `s.string()` formats).

## Local contracts

- **Format logic has one home.** `./predicates` holds the pure predicates; `s.string()` formats delegate to them, and `./json` maps the same format names to JSON Schema representations. Adding a format means touching all three in one change — predicate, builder, JSON Schema mapping — with tests for each.
- **Schemas live in `src/schemas/`** (one file per schema); the root barrel composes them. Keep validation pure: no I/O, no clock, no environment reads.
- **Types are part of the contract**: `bun run --filter @vielzeug/spell test:types` (`tsconfig.types.json`) checks inferred output types, not just runtime behaviour.

## Verification

Default gates: root `AGENTS.md` → **Project profile** (Package source), plus `test:types`. Breaking changes here cascade to `archive` and `tabula` — check those call sites before changing inference or error shapes.
