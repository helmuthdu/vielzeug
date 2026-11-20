# Vielzeug Package Reference

Generated from `packages/*/package.json` by `bun run gen:ai-data`. Edit manifests, not this table.

<!-- GENERATED:packages-table:BEGIN -->

| Package | Description | Dependencies | Required peers | Optional peers |
| --- | --- | --- | --- | --- |
| `@vielzeug/archive` | Community content publishing for Cloudflare Workers + D1: a hardened Worker core over per-collection payload schemas | `spell` | N/A | N/A |
| `@vielzeug/arsenal` | Non-trivial TypeScript utilities: retry, cancellation, cache, safe-path, serialization, prototype-pollution-guarded collections | N/A | N/A | N/A |
| `@vielzeug/assay` | Framework-agnostic DOM testing primitives: scoped queries, event dispatch, async waiting | `arsenal` | N/A | N/A |
| `@vielzeug/atlas` | Spatial math, camera, and indexing primitives for 2D canvases | N/A | N/A | N/A |
| `@vielzeug/bard` | Lifecycle-owned Web Audio mixing: buses with ducking, buffered SFX and sprites, procedural synth, streamed tracks, and crossfading music decks | N/A | N/A | N/A |
| `@vielzeug/beacon` | Guided onboarding and contextual product tours for web applications | `ripple` | N/A | N/A |
| `@vielzeug/clockwork` | Framework-neutral finite state machines with pure transitions and actors | `arsenal` | N/A | N/A |
| `@vielzeug/codex` | MCP server exposing all Vielzeug docs to AI clients | N/A | N/A | N/A |
| `@vielzeug/coins` | Currency formatting and exchange utilities for monetary arithmetic | N/A | N/A | N/A |
| `@vielzeug/conduit` | Typed dependency injection container | N/A | N/A | N/A |
| `@vielzeug/courier` | Typed HTTP client with bounded structured-key caching, prefetching, immutable middleware, and structured errors | `arsenal` | N/A | N/A |
| `@vielzeug/dnd` | Drag-and-drop: drop zones and sortable lists | `gesture`, `keymap` | N/A | N/A |
| `@vielzeug/familiar` | Web Worker pool with tasks, timeouts, cancellation | `arsenal` | N/A | N/A |
| `@vielzeug/flux` | Minimal push streams with explicit ownership, bounded buffering, and structural bridges | `arsenal` | N/A | N/A |
| `@vielzeug/focus` | Framework-neutral dismissal, live-region announcements, list navigation and focus restoration primitives | `keymap` | N/A | N/A |
| `@vielzeug/forge` | Typed form state, validation, submission | `arsenal` | N/A | N/A |
| `@vielzeug/gesture` | Framework-neutral pointer drag, pan, pinch, and wheel recognition with lifecycle-owned handles | N/A | N/A | N/A |
| `@vielzeug/herald` | Typed synchronous event bus with wildcard subscriptions, one-shot waits, and lifecycle tracing | N/A | N/A | N/A |
| `@vielzeug/illusionist` | Typed, deterministic, locale-aware fake data generator with seeded PRNG | `arsenal`, `coins`, `tempo` | N/A | N/A |
| `@vielzeug/ink` | Causal stroke stabilization, smoothing, speed-based width profiling, and SVG path output | N/A | N/A | N/A |
| `@vielzeug/keymap` | Headless keyboard shortcut manager with chord sequences | N/A | N/A | N/A |
| `@vielzeug/ledger` | Serialized reversible command history with atomic framework-neutral state and cancellation ownership | N/A | N/A | N/A |
| `@vielzeug/lingua` | Typed i18n with pluralization and lazy locale loading | N/A | N/A | `ripple` |
| `@vielzeug/mesh` | Backendless peer-to-peer session transport over WebRTC data channels with manual pairing and host-authoritative star topology | `arsenal` | N/A | N/A |
| `@vielzeug/necromancer` | Lifecycle-owned Web Animations API primitives with native access, per-handle groups, and additive FLIP | N/A | N/A | N/A |
| `@vielzeug/orbit` | Floating UI positioning with lifecycle-owned geometry and middleware | `arsenal` | N/A | `ripple` |
| `@vielzeug/ore` | Functional web-component authoring on top of ripple | N/A | `ripple` | `assay` |
| `@vielzeug/palette` | Color parsing, conversion, mixing, and contrast for design tools | N/A | N/A | N/A |
| `@vielzeug/patchwork` | RFC 6902 JSON Patch: structural diff, immutable apply, and guarded tryApply for sync protocols. | N/A | N/A | N/A |
| `@vielzeug/postmaster` | Typed durable job outbox with leased processing, retries, and dead-letter recovery | `arsenal`, `vault` | N/A | N/A |
| `@vielzeug/prism` | Responsive SVG charts with explicit updates: line, bar, area, scatter, pie, radar, heatmap, sparkline | `orbit`, `palette` | N/A | N/A |
| `@vielzeug/pulse` | Typed WebSocket client with channels, rooms, presence, reconnect | `arsenal` | N/A | N/A |
| `@vielzeug/refine` | Accessible, themeable web components built on ore | `arsenal`, `dnd`, `focus`, `gesture`, `keymap`, `necromancer`, `orbit`, `ore`, `ripple`, `scribe`, `sentinel`, `sigil`, `tempo` | N/A | N/A |
| `@vielzeug/ripple` | Reactive runtime primitives: signals, derived values, effects, scopes, watchers, and async resources | N/A | N/A | N/A |
| `@vielzeug/rune` | Structured scoped logger with remote transport | N/A | N/A | N/A |
| `@vielzeug/sandbox` | Sandboxed iframe runtime with typed postMessage state bridge | N/A | N/A | N/A |
| `@vielzeug/scout` | Trigram fuzzy-search index with highlighting and reactive layer | `arsenal` | N/A | N/A |
| `@vielzeug/scribe` | Safe Markdown prose: deterministic parser, XSS-safe DOM and HTML renderers, outline and plain-text extraction. | N/A | N/A | N/A |
| `@vielzeug/scroll` | Virtual list engine for large datasets | N/A | N/A | N/A |
| `@vielzeug/sentinel` | Subscribable snapshots for external browser environment state | `arsenal` | N/A | N/A |
| `@vielzeug/sigil` | QR code generation and scanning: pure matrix encoder, SVG and canvas renderers, native BarcodeDetector scanning | N/A | N/A | N/A |
| `@vielzeug/sourcerer` | Reactive collection sources with local, page, cursor, and infinite pagination | `arsenal` | N/A | N/A |
| `@vielzeug/spell` | Zero-dependency schema validation with Standard Schema interoperability | `arsenal` | N/A | N/A |
| `@vielzeug/stage` | Retained-mode 2D canvas stage engine with DPR-aware layers, dirty repaints, and PNG export | `atlas` | N/A | N/A |
| `@vielzeug/tabula` | Typed CSV and TSV: RFC 4180 parser with schema-validated rows, streaming reader, and safe serializer. | `spell` | N/A | N/A |
| `@vielzeug/tandem` | Offline-first sync engine with rev baselines, tombstoned deletions, and idle-batched pushes | `arsenal` | N/A | N/A |
| `@vielzeug/tavern` | Table sessions over mesh: host-owned state replication with guest command forwarding | `mesh` | N/A | N/A |
| `@vielzeug/tempo` | Temporal-powered date utilities | N/A | N/A | N/A |
| `@vielzeug/vault` | Adapter-free typed storage core with focused browser and SQLite subpaths | N/A | N/A | N/A |
| `@vielzeug/ward` | Ordered authorization rules with immutable policies and typed decisions | `arsenal` | N/A | N/A |
| `@vielzeug/wayfinder` | Client-side router with middleware and guards | `ripple` | N/A | N/A |
| `@vielzeug/wire` | Edge routing and graph ordering for node editors | N/A | N/A | N/A |

<!-- GENERATED:packages-table:END -->

## Navigation

Where to look for a package: public subpaths beyond the root, its docs directory, its local `AGENTS.md` (if any), and non-default test scripts. Generated from `packages/*/package.json` by `bun run gen:ai-data`.

<!-- GENERATED:packages-navigation:BEGIN -->

| Package | Subpaths | Docs | Local AGENTS.md | Extra scripts |
| --- | --- | --- | --- | --- |
| `@vielzeug/archive` | `@vielzeug/archive/auth`, `@vielzeug/archive/worker` | [`docs/archive/`](../../docs/archive/) | [`packages/archive/AGENTS.md`](../../packages/archive/AGENTS.md) | `test:integration`, `test:types` |
| `@vielzeug/arsenal` | `@vielzeug/arsenal/array`, `@vielzeug/arsenal/async`, `@vielzeug/arsenal/cache`, `@vielzeug/arsenal/encoding`, `@vielzeug/arsenal/function`, `@vielzeug/arsenal/guards`, `@vielzeug/arsenal/math`, `@vielzeug/arsenal/object`, `@vielzeug/arsenal/random`, `@vielzeug/arsenal/string` | [`docs/arsenal/`](../../docs/arsenal/) | [`packages/arsenal/AGENTS.md`](../../packages/arsenal/AGENTS.md) | `test:types` |
| `@vielzeug/assay` | root only | [`docs/assay/`](../../docs/assay/) | N/A | N/A |
| `@vielzeug/atlas` | `@vielzeug/atlas/grid` | [`docs/atlas/`](../../docs/atlas/) | N/A | `test:types` |
| `@vielzeug/bard` | `@vielzeug/bard/testing` | [`docs/bard/`](../../docs/bard/) | N/A | N/A |
| `@vielzeug/beacon` | root only | [`docs/beacon/`](../../docs/beacon/) | N/A | N/A |
| `@vielzeug/clockwork` | root only | [`docs/clockwork/`](../../docs/clockwork/) | N/A | N/A |
| `@vielzeug/codex` | root only | [`docs/codex/`](../../docs/codex/) | [`packages/codex/AGENTS.md`](../../packages/codex/AGENTS.md) | `test:integration` |
| `@vielzeug/coins` | root only | [`docs/coins/`](../../docs/coins/) | N/A | N/A |
| `@vielzeug/conduit` | root only | [`docs/conduit/`](../../docs/conduit/) | N/A | `test:types` |
| `@vielzeug/courier` | root only | [`docs/courier/`](../../docs/courier/) | N/A | `test:types` |
| `@vielzeug/dnd` | `@vielzeug/dnd/drop`, `@vielzeug/dnd/sortable` | [`docs/dnd/`](../../docs/dnd/) | N/A | `test:types` |
| `@vielzeug/familiar` | `@vielzeug/familiar/protocol`, `@vielzeug/familiar/testing` | [`docs/familiar/`](../../docs/familiar/) | N/A | `test:types` |
| `@vielzeug/flux` | root only | [`docs/flux/`](../../docs/flux/) | N/A | `test:types` |
| `@vielzeug/focus` | root only | [`docs/focus/`](../../docs/focus/) | N/A | `test:types` |
| `@vielzeug/forge` | `@vielzeug/forge/dom`, `@vielzeug/forge/form-data`, `@vielzeug/forge/persist`, `@vielzeug/forge/schema` | [`docs/forge/`](../../docs/forge/) | N/A | `test:types` |
| `@vielzeug/gesture` | root only | [`docs/gesture/`](../../docs/gesture/) | N/A | `test:e2e`, `test:types` |
| `@vielzeug/herald` | `@vielzeug/herald/testing` | [`docs/herald/`](../../docs/herald/) | N/A | N/A |
| `@vielzeug/illusionist` | `@vielzeug/illusionist/locales`, `@vielzeug/illusionist/locales/de`, `@vielzeug/illusionist/locales/en` | [`docs/illusionist/`](../../docs/illusionist/) | [`packages/illusionist/AGENTS.md`](../../packages/illusionist/AGENTS.md) | N/A |
| `@vielzeug/ink` | root only | [`docs/ink/`](../../docs/ink/) | N/A | `test:types` |
| `@vielzeug/keymap` | `@vielzeug/keymap/parse` | [`docs/keymap/`](../../docs/keymap/) | N/A | N/A |
| `@vielzeug/ledger` | root only | [`docs/ledger/`](../../docs/ledger/) | N/A | N/A |
| `@vielzeug/lingua` | `@vielzeug/lingua/format`, `@vielzeug/lingua/ripple`, `@vielzeug/lingua/validate` | [`docs/lingua/`](../../docs/lingua/) | N/A | `typecheck` |
| `@vielzeug/mesh` | `@vielzeug/mesh/testing` | [`docs/mesh/`](../../docs/mesh/) | N/A | N/A |
| `@vielzeug/necromancer` | `@vielzeug/necromancer/testing` | [`docs/necromancer/`](../../docs/necromancer/) | N/A | `test:e2e`, `test:types` |
| `@vielzeug/orbit` | `@vielzeug/orbit/devtools`, `@vielzeug/orbit/presets`, `@vielzeug/orbit/reactive` | [`docs/orbit/`](../../docs/orbit/) | N/A | N/A |
| `@vielzeug/ore` | `@vielzeug/ore/testing` | [`docs/ore/`](../../docs/ore/) | [`packages/ore/AGENTS.md`](../../packages/ore/AGENTS.md) | `test:types` |
| `@vielzeug/palette` | root only | [`docs/palette/`](../../docs/palette/) | N/A | `test:types` |
| `@vielzeug/patchwork` | `@vielzeug/patchwork/merge` | [`docs/patchwork/`](../../docs/patchwork/) | N/A | N/A |
| `@vielzeug/postmaster` | `@vielzeug/postmaster/indexeddb`, `@vielzeug/postmaster/store`, `@vielzeug/postmaster/testing` | [`docs/postmaster/`](../../docs/postmaster/) | N/A | `test:types` |
| `@vielzeug/prism` | `@vielzeug/prism/theme.css` | [`docs/prism/`](../../docs/prism/) | [`packages/prism/AGENTS.md`](../../packages/prism/AGENTS.md) | N/A |
| `@vielzeug/pulse` | `@vielzeug/pulse/testing` | [`docs/pulse/`](../../docs/pulse/) | N/A | N/A |
| `@vielzeug/refine` | `@vielzeug/refine/accordion`, `@vielzeug/refine/accordion-item`, `@vielzeug/refine/alert`, `@vielzeug/refine/app-store-button`, `@vielzeug/refine/avatar`, `@vielzeug/refine/avatar-group`, `@vielzeug/refine/badge`, `@vielzeug/refine/blueprint`, `@vielzeug/refine/blueprint/render`, `@vielzeug/refine/box`, `@vielzeug/refine/breadcrumb`, `@vielzeug/refine/button`, `@vielzeug/refine/button-group`, `@vielzeug/refine/calendar`, `@vielzeug/refine/card`, `@vielzeug/refine/card-picker`, `@vielzeug/refine/carousel`, `@vielzeug/refine/chat-message`, `@vielzeug/refine/chat-panel`, `@vielzeug/refine/checkbox`, `@vielzeug/refine/checkbox-group`, `@vielzeug/refine/chip`, `@vielzeug/refine/code-window`, `@vielzeug/refine/color-picker`, `@vielzeug/refine/combobox`, `@vielzeug/refine/command-palette`, `@vielzeug/refine/cookie-banner`, `@vielzeug/refine/copy-command`, `@vielzeug/refine/counter`, `@vielzeug/refine/datagrid`, `@vielzeug/refine/date-picker`, `@vielzeug/refine/dialog`, `@vielzeug/refine/dock`, `@vielzeug/refine/drawer`, `@vielzeug/refine/file-input`, `@vielzeug/refine/fouc.css`, `@vielzeug/refine/frameworks/elements`, `@vielzeug/refine/frameworks/react`, `@vielzeug/refine/frameworks/vue`, `@vielzeug/refine/grid`, `@vielzeug/refine/grid-item`, `@vielzeug/refine/icon`, `@vielzeug/refine/icons`, `@vielzeug/refine/icons/heroicons`, `@vielzeug/refine/icons/iconify`, `@vielzeug/refine/icons/lucide`, `@vielzeug/refine/icons/lucide/all`, `@vielzeug/refine/icons/mdi`, `@vielzeug/refine/icons/tabler`, `@vielzeug/refine/input`, `@vielzeug/refine/keyboard-key`, `@vielzeug/refine/list`, `@vielzeug/refine/list-item`, `@vielzeug/refine/marquee`, `@vielzeug/refine/media-navigation`, `@vielzeug/refine/menu`, `@vielzeug/refine/message-composer`, `@vielzeug/refine/navbar`, `@vielzeug/refine/navigation-menu`, `@vielzeug/refine/navigation-menu-link`, `@vielzeug/refine/number-input`, `@vielzeug/refine/otp-input`, `@vielzeug/refine/pagination`, `@vielzeug/refine/password-strength`, `@vielzeug/refine/popover`, `@vielzeug/refine/progress`, `@vielzeug/refine/prose`, `@vielzeug/refine/pull-to-refresh`, `@vielzeug/refine/qr-code`, `@vielzeug/refine/qr-scanner`, `@vielzeug/refine/query-bar`, `@vielzeug/refine/radio`, `@vielzeug/refine/radio-group`, `@vielzeug/refine/rank-item`, `@vielzeug/refine/rank-list`, `@vielzeug/refine/rating`, `@vielzeug/refine/select`, `@vielzeug/refine/separator`, `@vielzeug/refine/sidebar`, `@vielzeug/refine/skeleton`, `@vielzeug/refine/slider`, `@vielzeug/refine/speech-player`, `@vielzeug/refine/speed-reading`, `@vielzeug/refine/spotlight`, `@vielzeug/refine/state`, `@vielzeug/refine/stats`, `@vielzeug/refine/step`, `@vielzeug/refine/stepper`, `@vielzeug/refine/styles/animation.css`, `@vielzeug/refine/styles/layers.css`, `@vielzeug/refine/styles/preflight.css`, `@vielzeug/refine/styles/theme.css`, `@vielzeug/refine/switch`, `@vielzeug/refine/tab-item`, `@vielzeug/refine/tab-panel`, `@vielzeug/refine/table`, `@vielzeug/refine/tabs`, `@vielzeug/refine/text`, `@vielzeug/refine/textarea`, `@vielzeug/refine/theme`, `@vielzeug/refine/time-picker`, `@vielzeug/refine/toast`, `@vielzeug/refine/tokens.css`, `@vielzeug/refine/tooltip`, `@vielzeug/refine/tour`, `@vielzeug/refine/typing-indicator` | [`docs/refine/`](../../docs/refine/) | [`packages/refine/AGENTS.md`](../../packages/refine/AGENTS.md) | `build:e2e`, `test:e2e` |
| `@vielzeug/ripple` | root only | [`docs/ripple/`](../../docs/ripple/) | N/A | N/A |
| `@vielzeug/rune` | root only | [`docs/rune/`](../../docs/rune/) | N/A | N/A |
| `@vielzeug/sandbox` | `@vielzeug/sandbox/testing` | [`docs/sandbox/`](../../docs/sandbox/) | N/A | `test:types` |
| `@vielzeug/scout` | root only | [`docs/scout/`](../../docs/scout/) | N/A | N/A |
| `@vielzeug/scribe` | root only | [`docs/scribe/`](../../docs/scribe/) | N/A | N/A |
| `@vielzeug/scroll` | root only | [`docs/scroll/`](../../docs/scroll/) | N/A | N/A |
| `@vielzeug/sentinel` | root only | [`docs/sentinel/`](../../docs/sentinel/) | N/A | `test:e2e` |
| `@vielzeug/sigil` | root only | [`docs/sigil/`](../../docs/sigil/) | N/A | N/A |
| `@vielzeug/sourcerer` | root only | [`docs/sourcerer/`](../../docs/sourcerer/) | N/A | `test:types` |
| `@vielzeug/spell` | `@vielzeug/spell/json`, `@vielzeug/spell/predicates` | [`docs/spell/`](../../docs/spell/) | [`packages/spell/AGENTS.md`](../../packages/spell/AGENTS.md) | `test:types` |
| `@vielzeug/stage` | `@vielzeug/stage/worker` | [`docs/stage/`](../../docs/stage/) | N/A | `test:types` |
| `@vielzeug/tabula` | root only | [`docs/tabula/`](../../docs/tabula/) | N/A | N/A |
| `@vielzeug/tandem` | root only | [`docs/tandem/`](../../docs/tandem/) | N/A | N/A |
| `@vielzeug/tavern` | `@vielzeug/tavern/testing` | [`docs/tavern/`](../../docs/tavern/) | N/A | N/A |
| `@vielzeug/tempo` | `@vielzeug/tempo/cadence` | [`docs/tempo/`](../../docs/tempo/) | N/A | N/A |
| `@vielzeug/vault` | `@vielzeug/vault/indexeddb`, `@vielzeug/vault/local-storage`, `@vielzeug/vault/memory`, `@vielzeug/vault/session-storage`, `@vielzeug/vault/sqlite` | [`docs/vault/`](../../docs/vault/) | N/A | `test:types` |
| `@vielzeug/ward` | root only | [`docs/ward/`](../../docs/ward/) | N/A | N/A |
| `@vielzeug/wayfinder` | root only | [`docs/wayfinder/`](../../docs/wayfinder/) | N/A | N/A |
| `@vielzeug/wire` | root only | [`docs/wire/`](../../docs/wire/) | N/A | `test:types` |

<!-- GENERATED:packages-navigation:END -->

## Notes

- Dependencies, required peers, and optional peers are the live inter-package graph. Required peers remain distinct from hard dependencies for impact analysis.
- REPL exclusions are defined by `REPL_EXCLUDED_PACKAGES` in `scripts/vielzeug-packages.ts`.
