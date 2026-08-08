# Vielzeug Package Reference

Human-readable package catalogue derived from `.ai/data/packages.json`.

<!-- GENERATED:packages-table:BEGIN -->

| Package | Category | DOM | Description | Dependencies | Required peers | Optional peers | Test command |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `@vielzeug/arsenal` | Utilities | no | 75+ tree-shakeable array/object/string/async helpers | — | — | — | — |
| `@vielzeug/assay` | Testing | no | Framework-agnostic DOM testing primitives — scoped queries, event dispatch, async waiting | — | — | — | — |
| `@vielzeug/clockwork` | State | no | Framework-neutral finite state machines with pure transitions and actors | — | — | — | — |
| `@vielzeug/codex` | AI | no | MCP server exposing all Vielzeug docs to AI clients | — | — | — | — |
| `@vielzeug/coins` | Finance | no | Currency formatting and exchange utilities for monetary arithmetic | — | — | — | — |
| `@vielzeug/conduit` | DI | no | Typed dependency injection container | — | — | — | — |
| `@vielzeug/courier` | HTTP | no | Typed HTTP client with caching and mutations | `arsenal` | — | — | — |
| `@vielzeug/dnd` | UI | no | Drag-and-drop — drop zones and sortable lists | — | — | — | — |
| `@vielzeug/familiar` | Workers | no | Web Worker pool with tasks, timeouts, cancellation | `arsenal` | — | — | — |
| `@vielzeug/flux` | Streams | no | Minimal push streams with explicit ownership, buffering, and ecosystem adapters | — | — | `courier`, `herald`, `pulse`, `ripple` | — |
| `@vielzeug/forge` | Forms | no | Typed form state, validation, submission | `arsenal` | — | `spell`, `vault` | — |
| `@vielzeug/herald` | Events | no | Typed event bus, pub/sub, async streams | — | — | — | — |
| `@vielzeug/keymap` | Input | no | Headless keyboard shortcut manager with chord sequences | — | — | — | — |
| `@vielzeug/ledger` | State | no | Serialized reversible command history with atomic reactive state and cancellation ownership | `ripple` | — | — | — |
| `@vielzeug/lingua` | i18n | no | Typed i18n with pluralization and async loading | — | — | — | — |
| `@vielzeug/orbit` | UI | no | Dependency-free floating UI positioning with lifecycle-owned geometry | — | — | `ripple` | — |
| `@vielzeug/ore` | UI | yes | Functional web-component authoring on top of ripple | — | `ripple` | `assay` | — |
| `@vielzeug/prism` | Charts | yes | Reactive SVG charting library — line, bar, area, pie, sparkline | `orbit`, `ripple` | — | — | — |
| `@vielzeug/pulse` | WebSockets | no | Typed WebSocket client with channels, rooms, presence, reconnect | `ripple` | — | — | — |
| `@vielzeug/refine` | UI | yes | Accessible, themeable web components built on ore | `arsenal`, `assay`, `dnd`, `keymap`, `orbit`, `ore`, `ripple`, `tempo` | — | — | `pnpm --filter @vielzeug/refine test` |
| `@vielzeug/ripple` | State | no | Reactive runtime primitives: signals, derived values, effects, and scopes | — | — | — | — |
| `@vielzeug/rune` | Logging | no | Structured scoped logger with remote transport | — | — | — | — |
| `@vielzeug/sandbox` | AI | no | Sandboxed iframe runtime with typed postMessage state bridge | — | — | — | — |
| `@vielzeug/scout` | Utilities | no | Trigram fuzzy-search index with highlighting and reactive layer | `ripple` | — | — | — |
| `@vielzeug/scroll` | UI | no | Virtual list engine for large datasets | `ripple` | — | — | — |
| `@vielzeug/sourcerer` | Data | no | Reactive data sources with pagination and search | — | — | — | — |
| `@vielzeug/spell` | Validation | no | Zero-dep schema validation (Zod-like) | `arsenal` | — | — | — |
| `@vielzeug/tempo` | Date/Time | no | Temporal-powered date utilities | — | — | — | — |
| `@vielzeug/vault` | Storage | no | IndexedDB + LocalStorage unified typed API | — | — | — | — |
| `@vielzeug/ward` | Auth | no | RBAC engine with wildcards and predicates | — | — | — | — |
| `@vielzeug/wayfinder` | Routing | no | Client-side router with middleware and guards | — | — | — | — |

<!-- GENERATED:packages-table:END -->

## Notes

- `domOutput: true` packages do not get REPL examples.
- `testCommand` is present only when a package needs a non-standard test invocation.
- `dependencies`, `peerDependencies`, and `optionalPeers` are live inter-package graph categories. Required peers remain distinct from hard dependencies for impact analysis.
