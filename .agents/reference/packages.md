# Vielzeug Package Reference

Generated from `packages/*/package.json` by `pnpm gen:ai-data`. Edit manifests, not this table.

<!-- GENERATED:packages-table:BEGIN -->

| Package | Description | Dependencies | Required peers | Optional peers |
| --- | --- | --- | --- | --- |
| `@vielzeug/arsenal` | Non-trivial TypeScript utilities — retry, cancellation, cache, safe-path, serialization, prototype-pollution-guarded collections | — | — | — |
| `@vielzeug/assay` | Framework-agnostic DOM testing primitives — scoped queries, event dispatch, async waiting | `arsenal` | — | — |
| `@vielzeug/clockwork` | Framework-neutral finite state machines with pure transitions and actors | — | — | — |
| `@vielzeug/codex` | MCP server exposing all Vielzeug docs to AI clients | — | — | — |
| `@vielzeug/coins` | Currency formatting and exchange utilities for monetary arithmetic | — | — | — |
| `@vielzeug/conduit` | Typed dependency injection container | — | — | — |
| `@vielzeug/courier` | Typed HTTP client with bounded structured-key caching, prefetching, immutable middleware, and structured errors | `arsenal` | — | — |
| `@vielzeug/dnd` | Drag-and-drop — drop zones and sortable lists | `gesture` | — | — |
| `@vielzeug/familiar` | Web Worker pool with tasks, timeouts, cancellation | `arsenal` | — | — |
| `@vielzeug/flux` | Minimal push streams with explicit ownership, bounded buffering, and structural bridges | `arsenal` | — | — |
| `@vielzeug/focus` | Framework-neutral list navigation and focus restoration primitives | — | — | — |
| `@vielzeug/forge` | Typed form state, validation, submission | `arsenal` | — | — |
| `@vielzeug/gesture` | Framework-neutral two-dimensional pointer drag and one-axis pan recognition with lifecycle-owned handles | — | — | — |
| `@vielzeug/herald` | Typed synchronous event bus with wildcard subscriptions, one-shot waits, and lifecycle tracing | — | — | — |
| `@vielzeug/illusionist` | Typed, deterministic, locale-aware fake data generator with seeded PRNG | `arsenal`, `coins`, `tempo` | — | — |
| `@vielzeug/keymap` | Headless keyboard shortcut manager with chord sequences | — | — | — |
| `@vielzeug/ledger` | Serialized reversible command history with atomic framework-neutral state and cancellation ownership | — | — | — |
| `@vielzeug/lingua` | Typed i18n with pluralization and lazy locale loading | — | — | — |
| `@vielzeug/necromancer` | Lifecycle-owned Web Animations API primitives with native access, per-handle groups, and additive FLIP | — | — | — |
| `@vielzeug/orbit` | Floating UI positioning with lifecycle-owned geometry and middleware | `arsenal` | — | `ripple` |
| `@vielzeug/ore` | Functional web-component authoring on top of ripple | — | `ripple` | `assay` |
| `@vielzeug/postmaster` | Typed durable job outbox with leased processing, retries, and dead-letter recovery | `arsenal`, `vault` | — | — |
| `@vielzeug/prism` | Responsive SVG charts with explicit updates — line, bar, area, pie, sparkline | `orbit` | — | — |
| `@vielzeug/pulse` | Typed WebSocket client with channels, rooms, presence, reconnect | — | — | — |
| `@vielzeug/refine` | Accessible, themeable web components built on ore | `arsenal`, `dnd`, `focus`, `gesture`, `keymap`, `orbit`, `ore`, `ripple`, `sentinel`, `tempo` | — | — |
| `@vielzeug/ripple` | Reactive runtime primitives: signals, derived values, effects, scopes, watchers, and async resources | — | — | — |
| `@vielzeug/rune` | Structured scoped logger with remote transport | — | — | — |
| `@vielzeug/sandbox` | Sandboxed iframe runtime with typed postMessage state bridge | — | — | — |
| `@vielzeug/scout` | Trigram fuzzy-search index with highlighting and reactive layer | — | — | — |
| `@vielzeug/scroll` | Virtual list engine for large datasets | — | — | — |
| `@vielzeug/sentinel` | Subscribable snapshots for external browser environment state | — | — | — |
| `@vielzeug/sourcerer` | Reactive collection sources with local, page, cursor, and infinite pagination | `arsenal` | — | — |
| `@vielzeug/spell` | Zero-dependency schema validation with Standard Schema interoperability | `arsenal` | — | — |
| `@vielzeug/tempo` | Temporal-powered date utilities | — | — | — |
| `@vielzeug/vault` | Adapter-free typed storage core with focused browser and SQLite subpaths | — | — | — |
| `@vielzeug/ward` | Ordered authorization rules with immutable policies and typed decisions | — | — | — |
| `@vielzeug/wayfinder` | Client-side router with middleware and guards | — | — | — |

<!-- GENERATED:packages-table:END -->

## Notes

- Dependencies, required peers, and optional peers are the live inter-package graph. Required peers remain distinct from hard dependencies for impact analysis.
- REPL exclusions are defined by `REPL_EXCLUDED_PACKAGES` in `scripts/vielzeug-packages.ts`.
