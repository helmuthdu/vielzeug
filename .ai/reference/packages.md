# Vielzeug Package Reference

Human-readable package catalogue derived from `.ai/data/packages.json`.

<!-- GENERATED:packages-table:BEGIN -->

| Package | Category | Description | Dependencies | Required peers | Optional peers |
| --- | --- | --- | --- | --- | --- |
| `@vielzeug/arsenal` | Utilities | Non-trivial TypeScript utilities — retry, cancellation, cache, safe-path, serialization, prototype-pollution-guarded collections | — | — | — |
| `@vielzeug/assay` | Testing | Framework-agnostic DOM testing primitives — scoped queries, event dispatch, async waiting | `arsenal` | — | — |
| `@vielzeug/clockwork` | State | Framework-neutral finite state machines with pure transitions and actors | — | — | — |
| `@vielzeug/codex` | AI | MCP server exposing all Vielzeug docs to AI clients | — | — | — |
| `@vielzeug/coins` | Finance | Currency formatting and exchange utilities for monetary arithmetic | — | — | — |
| `@vielzeug/conduit` | DI | Typed dependency injection container | — | — | — |
| `@vielzeug/courier` | HTTP | Typed HTTP client with bounded structured-key caching, prefetching, immutable middleware, and structured errors | `arsenal` | — | — |
| `@vielzeug/dnd` | UI | Drag-and-drop — drop zones and sortable lists | `gesture` | — | — |
| `@vielzeug/familiar` | Workers | Web Worker pool with tasks, timeouts, cancellation | `arsenal` | — | — |
| `@vielzeug/flux` | Streams | Minimal push streams with explicit ownership, bounded buffering, and structural bridges | `arsenal` | — | — |
| `@vielzeug/focus` | Input | Framework-neutral list navigation and focus restoration primitives | — | — | — |
| `@vielzeug/forge` | Forms | Typed form state, validation, submission | `arsenal` | — | — |
| `@vielzeug/gesture` | Input | Framework-neutral two-dimensional pointer drag and one-axis pan recognition with lifecycle-owned handles | — | — | — |
| `@vielzeug/herald` | Events | Typed synchronous event bus with wildcard subscriptions, one-shot waits, and lifecycle tracing | — | — | — |
| `@vielzeug/illusionist` | Data | Typed, deterministic, locale-aware fake data generator with seeded PRNG | `arsenal`, `coins`, `tempo` | — | — |
| `@vielzeug/keymap` | Input | Headless keyboard shortcut manager with chord sequences | — | — | — |
| `@vielzeug/ledger` | State | Serialized reversible command history with atomic framework-neutral state and cancellation ownership | — | — | — |
| `@vielzeug/lingua` | i18n | Typed i18n with pluralization and lazy locale loading | — | — | — |
| `@vielzeug/necromancer` | Animation | Lifecycle-owned Web Animations API primitives with native access, per-handle groups, and additive FLIP | — | — | — |
| `@vielzeug/orbit` | UI | Floating UI positioning with lifecycle-owned geometry and middleware | `arsenal` | — | `ripple` |
| `@vielzeug/ore` | UI | Functional web-component authoring on top of ripple | — | `ripple` | `assay` |
| `@vielzeug/postmaster` | Async | Typed durable job outbox with leased processing, retries, and dead-letter recovery | `arsenal`, `vault` | — | — |
| `@vielzeug/prism` | Charts | Responsive SVG charts with explicit updates — line, bar, area, pie, sparkline | `orbit` | — | — |
| `@vielzeug/pulse` | WebSockets | Typed WebSocket client with channels, rooms, presence, reconnect | — | — | — |
| `@vielzeug/refine` | UI | Accessible, themeable web components built on ore | `arsenal`, `dnd`, `focus`, `gesture`, `keymap`, `orbit`, `ore`, `ripple`, `sentinel`, `tempo` | — | — |
| `@vielzeug/ripple` | State | Reactive runtime primitives: signals, derived values, effects, scopes, watchers, and async resources | — | — | — |
| `@vielzeug/rune` | Logging | Structured scoped logger with remote transport | — | — | — |
| `@vielzeug/sandbox` | AI | Sandboxed iframe runtime with typed postMessage state bridge | — | — | — |
| `@vielzeug/scout` | Utilities | Trigram fuzzy-search index with highlighting and reactive layer | — | — | — |
| `@vielzeug/scroll` | UI | Virtual list engine for large datasets | — | — | — |
| `@vielzeug/sentinel` | Environment | Subscribable snapshots for external browser environment state | — | — | — |
| `@vielzeug/sourcerer` | Data | Reactive collection sources with local, page, cursor, and infinite pagination | `arsenal` | — | — |
| `@vielzeug/spell` | Validation | Zero-dependency schema validation with Standard Schema interoperability | `arsenal` | — | — |
| `@vielzeug/tempo` | Date/Time | Temporal-powered date utilities | — | — | — |
| `@vielzeug/vault` | Storage | Adapter-free typed storage core with focused browser and SQLite subpaths | — | — | — |
| `@vielzeug/ward` | Auth | Ordered authorization rules with immutable policies and typed decisions | — | — | — |
| `@vielzeug/wayfinder` | Routing | Client-side router with middleware and guards | — | — | — |

<!-- GENERATED:packages-table:END -->

## Notes

- `dependencies`, `peerDependencies`, and `optionalPeers` are live inter-package graph categories. Required peers remain distinct from hard dependencies for impact analysis.
- REPL exclusions are defined by `REPL_EXCLUDED_PACKAGES` in `scripts/vielzeug-packages.ts`.
