# Vielzeug Package Reference

Human-readable package catalogue derived from `.ai/data/packages.json`.

<!-- GENERATED:packages-table:BEGIN -->

| Package | Category | Description | Dependencies | Required peers | Optional peers |
| --- | --- | --- | --- | --- | --- |
| `@vielzeug/arsenal` | Utilities | 75+ tree-shakeable array/object/string/async helpers | — | — | — |
| `@vielzeug/assay` | Testing | Framework-agnostic DOM testing primitives — scoped queries, event dispatch, async waiting | — | — | — |
| `@vielzeug/clockwork` | State | Framework-neutral finite state machines with pure transitions and actors | — | — | — |
| `@vielzeug/codex` | AI | MCP server exposing all Vielzeug docs to AI clients | — | — | — |
| `@vielzeug/coins` | Finance | Currency formatting and exchange utilities for monetary arithmetic | — | — | — |
| `@vielzeug/conduit` | DI | Typed dependency injection container | — | — | — |
| `@vielzeug/courier` | HTTP | Typed HTTP client with caching and mutations | `arsenal` | — | — |
| `@vielzeug/dnd` | UI | Drag-and-drop — drop zones and sortable lists | — | — | — |
| `@vielzeug/familiar` | Workers | Web Worker pool with tasks, timeouts, cancellation | `arsenal` | — | — |
| `@vielzeug/flux` | Streams | Minimal push streams with explicit ownership, buffering, and ecosystem adapters | — | — | `courier`, `herald`, `pulse`, `ripple` |
| `@vielzeug/focus` | Input | Framework-neutral list navigation and focus restoration primitives | — | — | — |
| `@vielzeug/forge` | Forms | Typed form state, validation, submission | — | — | `spell`, `vault` |
| `@vielzeug/gesture` | Input | Framework-neutral one-axis pointer pan recognition with lifecycle-owned handles | — | — | — |
| `@vielzeug/herald` | Events | Typed event bus, pub/sub, async streams | — | — | — |
| `@vielzeug/illusionist` | Data | Typed, deterministic, locale-aware fake data generator with seeded PRNG | `arsenal`, `coins`, `tempo` | — | — |
| `@vielzeug/keymap` | Input | Headless keyboard shortcut manager with chord sequences | — | — | — |
| `@vielzeug/ledger` | State | Serialized reversible command history with atomic reactive state and cancellation ownership | `ripple` | — | — |
| `@vielzeug/lingua` | i18n | Typed i18n with pluralization and async loading | — | — | — |
| `@vielzeug/necromancer` | Animation | Lifecycle-owned Web Animations API primitives with native access, per-handle groups, and additive FLIP | — | — | — |
| `@vielzeug/orbit` | UI | Dependency-free floating UI positioning with lifecycle-owned geometry | — | — | `ripple` |
| `@vielzeug/ore` | UI | Functional web-component authoring on top of ripple | — | `ripple` | `assay` |
| `@vielzeug/prism` | Charts | Reactive SVG charting library — line, bar, area, pie, sparkline | `orbit`, `ripple` | — | — |
| `@vielzeug/pulse` | WebSockets | Typed WebSocket client with channels, rooms, presence, reconnect | `ripple` | — | — |
| `@vielzeug/refine` | UI | Accessible, themeable web components built on ore | `arsenal`, `assay`, `dnd`, `focus`, `gesture`, `keymap`, `orbit`, `ore`, `ripple`, `sentinel`, `tempo` | — | — |
| `@vielzeug/ripple` | State | Reactive runtime primitives: signals, derived values, effects, scopes, watchers, and async resources | — | — | — |
| `@vielzeug/rune` | Logging | Structured scoped logger with remote transport | — | — | — |
| `@vielzeug/sandbox` | AI | Sandboxed iframe runtime with typed postMessage state bridge | — | — | — |
| `@vielzeug/scout` | Utilities | Trigram fuzzy-search index with highlighting and reactive layer | `ripple` | — | — |
| `@vielzeug/scroll` | UI | Virtual list engine for large datasets | `ripple` | — | — |
| `@vielzeug/sentinel` | Environment | Reactive observables for external browser environment state | — | `ripple` | — |
| `@vielzeug/sourcerer` | Data | Reactive data sources with pagination and search | — | — | — |
| `@vielzeug/spell` | Validation | Zero-dep schema validation (Zod-like) | `arsenal` | — | — |
| `@vielzeug/tempo` | Date/Time | Temporal-powered date utilities | — | — | — |
| `@vielzeug/vault` | Storage | Adapter-free typed storage core with focused browser and SQLite subpaths | — | — | — |
| `@vielzeug/ward` | Auth | RBAC engine with wildcards and predicates | — | — | — |
| `@vielzeug/wayfinder` | Routing | Client-side router with middleware and guards | — | — | — |

<!-- GENERATED:packages-table:END -->

## Notes

- `dependencies`, `peerDependencies`, and `optionalPeers` are live inter-package graph categories. Required peers remain distinct from hard dependencies for impact analysis.
- REPL exclusions are defined by `REPL_EXCLUDED_PACKAGES` in `scripts/vielzeug-packages.ts`.
