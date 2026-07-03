# Vielzeug — Package Catalogue

> ⚠️ **Live data** — update the catalogue table and metadata table below when adding, removing, or renaming packages (the dependency graph regenerates itself via `pnpm gen:catalogue`, see § below). Run `pnpm --filter @vielzeug/codex build` after updating to refresh the MCP bundle.

## Package catalogue

| Package               | Category   | What it does                                                       |
| --------------------- | ---------- | ------------------------------------------------------------------ |
| `@vielzeug/arsenal`   | Utilities  | 75+ tree-shakeable array/object/string/async helpers               |
| `@vielzeug/clockwork` | State      | Finite state machine interpreter with typed events                 |
| `@vielzeug/codex`     | AI         | MCP server exposing all Vielzeug docs to AI clients                |
| `@vielzeug/coins`     | Finance    | Currency formatting and exchange utilities for monetary arithmetic |
| `@vielzeug/conduit`   | DI         | Typed dependency injection container                               |
| `@vielzeug/courier`   | HTTP       | Typed HTTP client with caching and mutations                       |
| `@vielzeug/dnd`       | UI         | Drag-and-drop — drop zones and sortable lists                      |
| `@vielzeug/familiar`  | Workers    | Web Worker pool with tasks, timeouts, cancellation                 |
| `@vielzeug/flux`      | Streams    | Composable stream primitives with hot/cold semantics and operators |
| `@vielzeug/forge`     | Forms      | Typed form state, validation, submission                           |
| `@vielzeug/herald`    | Events     | Typed event bus, pub/sub, async streams                            |
| `@vielzeug/keymap`    | Input      | Headless keyboard shortcut manager with chord sequences            |
| `@vielzeug/ledger`    | State      | Async undo/redo command history with Ripple reactive state         |
| `@vielzeug/lingua`    | i18n       | Typed i18n with pluralization and async loading                    |
| `@vielzeug/orbit`     | UI         | Floating element positioning (tooltip, popover)                    |
| `@vielzeug/ore`       | UI         | Functional web-component authoring on top of ripple                |
| `@vielzeug/prism`     | Charts     | Reactive SVG charting library — line, bar, area, pie, sparkline    |
| `@vielzeug/pulse`     | WebSockets | Typed WebSocket client with channels, rooms, presence, reconnect   |
| `@vielzeug/refine`    | UI         | Accessible, themeable web components built on ore                  |
| `@vielzeug/ripple`    | State      | Reactive signals, computed, effects, stores                        |
| `@vielzeug/rune`      | Logging    | Structured scoped logger with remote transport                     |
| `@vielzeug/sandbox`   | AI         | Sandboxed iframe runtime with typed postMessage state bridge       |
| `@vielzeug/scout`     | Utilities  | Trigram fuzzy-search index with highlighting and reactive layer    |
| `@vielzeug/scroll`    | UI         | Virtual list engine for large datasets                             |
| `@vielzeug/sourcerer` | Data       | Reactive data sources with pagination and search                   |
| `@vielzeug/spell`     | Validation | Zero-dep schema validation (Zod-like)                              |
| `@vielzeug/tempo`     | Date/Time  | Temporal-powered date utilities                                    |
| `@vielzeug/vault`     | Storage    | IndexedDB + LocalStorage unified typed API                         |
| `@vielzeug/ward`      | Auth       | RBAC engine with wildcards and predicates                          |
| `@vielzeug/wayfinder` | Routing    | Client-side router with middleware and guards                      |

## Package dependency graph

Inter-package `@vielzeug/*` runtime dependencies — generated from each package's `package.json` by `scripts/sync-catalogue.mjs`. Edit `packages/<name>/package.json`, not this section (`pnpm gen:catalogue` to regenerate; `pnpm check:catalogue` fails CI if it drifts).

<!-- GENERATED:dep-graph:BEGIN -->

```text
clockwork → ripple
coins     → arsenal
courier   → arsenal
familiar  → arsenal
flux      → ripple
forge     → arsenal, ripple
ledger    → ripple
orbit     → arsenal, ripple
ore       → ripple
prism     → orbit, ripple
pulse     → ripple
refine    → arsenal, dnd, orbit, ore, ripple, tempo
scout     → ripple
scroll    → ripple
sourcerer → arsenal
spell     → arsenal
```

Fully independent (no `@vielzeug/*` deps): `arsenal`, `codex`, `conduit`, `dnd`, `herald`, `keymap`, `lingua`, `ripple`, `rune`, `sandbox`, `tempo`, `vault`, `ward`, `wayfinder`.

> **Note:** `flux` also declares optional peer dependencies on `courier`, `herald`, and `pulse`.

<!-- GENERATED:dep-graph:END -->

## Package metadata

Structured flags consumed by workflows and tooling.

Package names in this table are bare slugs (for example, `ore`) rather than `@vielzeug/<name>`.

| Package  | DOM-output | Notes                                                              |
| -------- | ---------- | ------------------------------------------------------------------ |
| `ore`    | ✅ yes     | Renders DOM directly; no REPL examples or Monaco types             |
| `prism`  | ✅ yes     | Renders SVG/DOM directly; no REPL examples or Monaco types         |
| `refine` | ✅ yes     | Web components; no REPL examples or Monaco types; co-located tests |

**DOM-output packages** skip Phase 7 (REPL) of `/pkg-workflow`. Update this table when adding a package that renders DOM directly.
