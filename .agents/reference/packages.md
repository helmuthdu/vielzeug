# Vielzeug Package Reference

Generated from `packages/*/package.json` by `pnpm gen:ai-data`. Edit manifests, not this table.

<!-- GENERATED:packages-table:BEGIN -->

| Package | Description | Dependencies | Required peers | Optional peers |
| --- | --- | --- | --- | --- |
| `@vielzeug/arsenal` | Non-trivial TypeScript utilities: retry, cancellation, cache, safe-path, serialization, prototype-pollution-guarded collections | N/A | N/A | N/A |
| `@vielzeug/assay` | Framework-agnostic DOM testing primitives: scoped queries, event dispatch, async waiting | `arsenal` | N/A | N/A |
| `@vielzeug/clockwork` | Framework-neutral finite state machines with pure transitions and actors | `arsenal` | N/A | N/A |
| `@vielzeug/codex` | MCP server exposing all Vielzeug docs to AI clients | N/A | N/A | N/A |
| `@vielzeug/coins` | Currency formatting and exchange utilities for monetary arithmetic | N/A | N/A | N/A |
| `@vielzeug/conduit` | Typed dependency injection container | N/A | N/A | N/A |
| `@vielzeug/courier` | Typed HTTP client with bounded structured-key caching, prefetching, immutable middleware, and structured errors | `arsenal` | N/A | N/A |
| `@vielzeug/dnd` | Drag-and-drop: drop zones and sortable lists | `gesture`, `keymap` | N/A | N/A |
| `@vielzeug/familiar` | Web Worker pool with tasks, timeouts, cancellation | `arsenal` | N/A | N/A |
| `@vielzeug/flux` | Minimal push streams with explicit ownership, bounded buffering, and structural bridges | `arsenal` | N/A | N/A |
| `@vielzeug/focus` | Framework-neutral list navigation and focus restoration primitives | `keymap` | N/A | N/A |
| `@vielzeug/forge` | Typed form state, validation, submission | `arsenal` | N/A | N/A |
| `@vielzeug/gesture` | Framework-neutral two-dimensional pointer drag and one-axis pan recognition with lifecycle-owned handles | N/A | N/A | N/A |
| `@vielzeug/herald` | Typed synchronous event bus with wildcard subscriptions, one-shot waits, and lifecycle tracing | N/A | N/A | N/A |
| `@vielzeug/illusionist` | Typed, deterministic, locale-aware fake data generator with seeded PRNG | `arsenal`, `coins`, `tempo` | N/A | N/A |
| `@vielzeug/keymap` | Headless keyboard shortcut manager with chord sequences | N/A | N/A | N/A |
| `@vielzeug/ledger` | Serialized reversible command history with atomic framework-neutral state and cancellation ownership | N/A | N/A | N/A |
| `@vielzeug/lingua` | Typed i18n with pluralization and lazy locale loading | N/A | N/A | `ripple` |
| `@vielzeug/mesh` | Backendless peer-to-peer session transport over WebRTC data channels with manual pairing and host-authoritative star topology | `arsenal` | N/A | N/A |
| `@vielzeug/necromancer` | Lifecycle-owned Web Animations API primitives with native access, per-handle groups, and additive FLIP | N/A | N/A | N/A |
| `@vielzeug/orbit` | Floating UI positioning with lifecycle-owned geometry and middleware | `arsenal` | N/A | `ripple` |
| `@vielzeug/ore` | Functional web-component authoring on top of ripple | N/A | `ripple` | `assay` |
| `@vielzeug/postmaster` | Typed durable job outbox with leased processing, retries, and dead-letter recovery | `arsenal`, `vault` | N/A | N/A |
| `@vielzeug/prism` | Responsive SVG charts with explicit updates: line, bar, area, pie, radar, sparkline | `orbit` | N/A | N/A |
| `@vielzeug/pulse` | Typed WebSocket client with channels, rooms, presence, reconnect | `arsenal` | N/A | N/A |
| `@vielzeug/refine` | Accessible, themeable web components built on ore | `arsenal`, `dnd`, `focus`, `gesture`, `keymap`, `orbit`, `ore`, `ripple`, `sentinel`, `sigil`, `tempo` | N/A | N/A |
| `@vielzeug/ripple` | Reactive runtime primitives: signals, derived values, effects, scopes, watchers, and async resources | N/A | N/A | N/A |
| `@vielzeug/rune` | Structured scoped logger with remote transport | N/A | N/A | N/A |
| `@vielzeug/sandbox` | Sandboxed iframe runtime with typed postMessage state bridge | N/A | N/A | N/A |
| `@vielzeug/scout` | Trigram fuzzy-search index with highlighting and reactive layer | `arsenal` | N/A | N/A |
| `@vielzeug/scroll` | Virtual list engine for large datasets | N/A | N/A | N/A |
| `@vielzeug/sentinel` | Subscribable snapshots for external browser environment state | `arsenal` | N/A | N/A |
| `@vielzeug/sigil` | QR code generation and scanning: pure matrix encoder, SVG and canvas renderers, native BarcodeDetector scanning | N/A | N/A | N/A |
| `@vielzeug/sourcerer` | Reactive collection sources with local, page, cursor, and infinite pagination | `arsenal` | N/A | N/A |
| `@vielzeug/spell` | Zero-dependency schema validation with Standard Schema interoperability | `arsenal` | N/A | N/A |
| `@vielzeug/tandem` | Offline-first sync engine with rev baselines, tombstoned deletions, and idle-batched pushes | N/A | N/A | N/A |
| `@vielzeug/tavern` | Table sessions over mesh: host-owned state replication with guest command forwarding | `mesh` | N/A | N/A |
| `@vielzeug/tempo` | Temporal-powered date utilities | N/A | N/A | N/A |
| `@vielzeug/vault` | Adapter-free typed storage core with focused browser and SQLite subpaths | N/A | N/A | N/A |
| `@vielzeug/ward` | Ordered authorization rules with immutable policies and typed decisions | `arsenal` | N/A | N/A |
| `@vielzeug/wayfinder` | Client-side router with middleware and guards | `ripple` | N/A | N/A |

<!-- GENERATED:packages-table:END -->

## Notes

- Dependencies, required peers, and optional peers are the live inter-package graph. Required peers remain distinct from hard dependencies for impact analysis.
- REPL exclusions are defined by `REPL_EXCLUDED_PACKAGES` in `scripts/vielzeug-packages.ts`.
