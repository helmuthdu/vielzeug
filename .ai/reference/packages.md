# Vielzeug Package Reference

Human-readable package catalogue derived from `.ai/data/packages.json`.

<!-- GENERATED:packages-table:BEGIN -->

| Package | Category | DOM | Description | Dependencies | Optional peers | Test command |
| --- | --- | --- | --- | --- | --- | --- |
| `@vielzeug/arsenal` | Utilities | no | 75+ tree-shakeable array/object/string/async helpers | — | — | — |
| `@vielzeug/clockwork` | State | no | Finite state machine interpreter with typed events | `ripple` | — | — |
| `@vielzeug/codex` | AI | no | MCP server exposing all Vielzeug docs to AI clients | — | — | — |
| `@vielzeug/coins` | Finance | no | Currency formatting and exchange utilities for monetary arithmetic | — | — | — |
| `@vielzeug/conduit` | DI | no | Typed dependency injection container | — | — | — |
| `@vielzeug/courier` | HTTP | no | Typed HTTP client with caching and mutations | `arsenal` | — | — |
| `@vielzeug/dnd` | UI | no | Drag-and-drop — drop zones and sortable lists | — | — | — |
| `@vielzeug/familiar` | Workers | no | Web Worker pool with tasks, timeouts, cancellation | `arsenal` | — | — |
| `@vielzeug/flux` | Streams | no | Composable stream primitives with hot/cold semantics and operators | `ripple` | `courier`, `herald`, `pulse` | — |
| `@vielzeug/forge` | Forms | no | Typed form state, validation, submission | `arsenal`, `ripple` | — | — |
| `@vielzeug/herald` | Events | no | Typed event bus, pub/sub, async streams | — | — | — |
| `@vielzeug/keymap` | Input | no | Headless keyboard shortcut manager with chord sequences | — | — | — |
| `@vielzeug/ledger` | State | no | Async undo/redo command history with Ripple reactive state | `ripple` | — | — |
| `@vielzeug/lingua` | i18n | no | Typed i18n with pluralization and async loading | — | — | — |
| `@vielzeug/orbit` | UI | no | Floating element positioning (tooltip, popover) | `arsenal`, `ripple` | — | — |
| `@vielzeug/ore` | UI | yes | Functional web-component authoring on top of ripple | `ripple` | — | — |
| `@vielzeug/prism` | Charts | yes | Reactive SVG charting library — line, bar, area, pie, sparkline | `orbit`, `ripple` | — | — |
| `@vielzeug/pulse` | WebSockets | no | Typed WebSocket client with channels, rooms, presence, reconnect | `ripple` | — | — |
| `@vielzeug/refine` | UI | yes | Accessible, themeable web components built on ore | `arsenal`, `dnd`, `keymap`, `orbit`, `ore`, `ripple`, `tempo` | — | `pnpm --filter @vielzeug/refine test` |
| `@vielzeug/ripple` | State | no | Reactive signals, computed, effects, stores | — | — | — |
| `@vielzeug/rune` | Logging | no | Structured scoped logger with remote transport | — | — | — |
| `@vielzeug/sandbox` | AI | no | Sandboxed iframe runtime with typed postMessage state bridge | — | — | — |
| `@vielzeug/scout` | Utilities | no | Trigram fuzzy-search index with highlighting and reactive layer | `ripple` | — | — |
| `@vielzeug/scroll` | UI | no | Virtual list engine for large datasets | `ripple` | — | — |
| `@vielzeug/sourcerer` | Data | no | Reactive data sources with pagination and search | `arsenal` | — | — |
| `@vielzeug/spell` | Validation | no | Zero-dep schema validation (Zod-like) | `arsenal` | — | — |
| `@vielzeug/tempo` | Date/Time | no | Temporal-powered date utilities | — | — | — |
| `@vielzeug/vault` | Storage | no | IndexedDB + LocalStorage unified typed API | — | — | — |
| `@vielzeug/ward` | Auth | no | RBAC engine with wildcards and predicates | — | — | — |
| `@vielzeug/wayfinder` | Routing | no | Client-side router with middleware and guards | — | — | — |

<!-- GENERATED:packages-table:END -->

## Notes

- `domOutput: true` packages do not get REPL examples.
- `testCommand` is present only when a package needs a non-standard test invocation.
- `dependencies` and `optionalPeers` are the live inter-package graph used by local tooling.

