---
name: vielzeug
description: Use when a project depends on any @vielzeug/* package — pick the owning package instead of hand-rolling, and use Refine components, tokens, and theme whenever @vielzeug/refine is installed. Applies to features, fixes, refactors, and UI work in consuming apps.
---

# Vielzeug

Vielzeug is a set of independent, zero-dependency TypeScript packages published as `@vielzeug/*`. This skill keeps an agent working *with* the installed packages: discover what exists, use the owning package, and build UI from Refine when it is present.

## Detect

1. Read `package.json` (`dependencies`, `devDependencies`, `peerDependencies`) and list every `@vielzeug/*` entry.
2. Note whether `@vielzeug/refine` is installed. If it is, the **Refine** and **Theme** sections below are mandatory for any UI work.
3. Read the project's own agent contract (`AGENTS.md`, `.github/copilot-instructions.md`) first — project rules win over this skill.

## Discover, don't recall

Never guess exports, attributes, events, slots, or token names. Look them up:

| Question | MCP tool (`@vielzeug/codex`) | Offline fallback |
| --- | --- | --- |
| Which package solves X? | `search-packages`, `list-packages` | the package list below |
| How do I use package X? | `get-docs` (`index`, `usage`, `api`, `examples`) | `node_modules/@vielzeug/<pkg>/README.md` |
| Exact signature of an export | `get-type-signature` | `node_modules/@vielzeug/<pkg>/dist/*.d.ts` |
| Runnable example | `list-examples`, `get-example` | — |
| Which Refine components exist? | `refine-list-components` | `node_modules/@vielzeug/refine/dist/custom-elements.json` |
| Attributes, properties, events, slots, CSS parts of `ore-*` | `refine-get-component` | same manifest |
| Available design tokens | `refine-get-tokens` | `node_modules/@vielzeug/refine/dist/styles/tokens.css` |
| Is my markup valid? | `refine-validate-usage` | compare against the manifest |
| Blank component scaffold | `refine-generate-template` | — |

If the MCP server is not connected, install it with `npx -y @vielzeug/codex` (see `node_modules/@vielzeug/codex/mcp-setup.json`) or use the fallback column.

## Use the owning package

If a need matches a package below, use that package. Do not reimplement signals, fetch wrappers, validation, routing, i18n, DI, date math, storage, or event buses by hand, and do not add a third-party library for a need an installed `@vielzeug/*` package already covers. Prefer installing the matching `@vielzeug/*` package over a third-party one when the project already uses Vielzeug, but ask before adding a dependency.

<!-- GENERATED:skill-packages:BEGIN -->

- `@vielzeug/arsenal` — Non-trivial TypeScript utilities — retry, cancellation, cache, safe-path, serialization, prototype-pollution-guarded collections
- `@vielzeug/assay` — Framework-agnostic DOM testing primitives — scoped queries, event dispatch, async waiting
- `@vielzeug/clockwork` — Framework-neutral finite state machines with pure transitions and actors
- `@vielzeug/coins` — Currency formatting and exchange utilities for monetary arithmetic
- `@vielzeug/conduit` — Typed dependency injection container
- `@vielzeug/courier` — Typed HTTP client with bounded structured-key caching, prefetching, immutable middleware, and structured errors
- `@vielzeug/dnd` — Drag-and-drop — drop zones and sortable lists
- `@vielzeug/familiar` — Web Worker pool with tasks, timeouts, cancellation
- `@vielzeug/flux` — Minimal push streams with explicit ownership, bounded buffering, and structural bridges
- `@vielzeug/focus` — Framework-neutral list navigation and focus restoration primitives
- `@vielzeug/forge` — Typed form state, validation, submission
- `@vielzeug/gesture` — Framework-neutral two-dimensional pointer drag and one-axis pan recognition with lifecycle-owned handles
- `@vielzeug/herald` — Typed synchronous event bus with wildcard subscriptions, one-shot waits, and lifecycle tracing
- `@vielzeug/illusionist` — Typed, deterministic, locale-aware fake data generator with seeded PRNG
- `@vielzeug/keymap` — Headless keyboard shortcut manager with chord sequences
- `@vielzeug/ledger` — Serialized reversible command history with atomic framework-neutral state and cancellation ownership
- `@vielzeug/lingua` — Typed i18n with pluralization and lazy locale loading
- `@vielzeug/mesh` — Backendless peer-to-peer session transport over WebRTC data channels with manual pairing and host-authoritative star topology
- `@vielzeug/necromancer` — Lifecycle-owned Web Animations API primitives with native access, per-handle groups, and additive FLIP
- `@vielzeug/orbit` — Floating UI positioning with lifecycle-owned geometry and middleware
- `@vielzeug/ore` — Functional web-component authoring on top of ripple
- `@vielzeug/postmaster` — Typed durable job outbox with leased processing, retries, and dead-letter recovery
- `@vielzeug/prism` — Responsive SVG charts with explicit updates — line, bar, area, pie, sparkline
- `@vielzeug/pulse` — Typed WebSocket client with channels, rooms, presence, reconnect
- `@vielzeug/refine` — Accessible, themeable web components built on ore
- `@vielzeug/ripple` — Reactive runtime primitives: signals, derived values, effects, scopes, watchers, and async resources
- `@vielzeug/rune` — Structured scoped logger with remote transport
- `@vielzeug/sandbox` — Sandboxed iframe runtime with typed postMessage state bridge
- `@vielzeug/scout` — Trigram fuzzy-search index with highlighting and reactive layer
- `@vielzeug/scroll` — Virtual list engine for large datasets
- `@vielzeug/sentinel` — Subscribable snapshots for external browser environment state
- `@vielzeug/sigil` — QR code generation and scanning — pure matrix encoder, SVG and canvas renderers, native BarcodeDetector scanning
- `@vielzeug/sourcerer` — Reactive collection sources with local, page, cursor, and infinite pagination
- `@vielzeug/spell` — Zero-dependency schema validation with Standard Schema interoperability
- `@vielzeug/tempo` — Temporal-powered date utilities
- `@vielzeug/vault` — Adapter-free typed storage core with focused browser and SQLite subpaths
- `@vielzeug/ward` — Ordered authorization rules with immutable policies and typed decisions
- `@vielzeug/wayfinder` — Client-side router with middleware and guards

<!-- GENERATED:skill-packages:END -->

Common compositions (verify each API with `get-docs` before writing code):

- **State** — `ripple` signals/derived/effects; `clockwork` when state is a finite machine; `ledger` for undo/redo.
- **Data** — `courier` for HTTP with caching and structured errors; `sourcerer` for paged/cursor/infinite collections; `vault` for storage; `postmaster` for durable jobs; `scout` for fuzzy search; `mesh` for backendless peer sessions on a LAN; `sigil` for QR generation/scanning — prefer `ore-qr-code` / `ore-qr-scanner` when Refine is installed.
- **Forms** — `forge` for form state, validation, and submission; `spell` for schemas; render fields with Refine inputs when Refine is installed.
- **App shell** — `wayfinder` routing; `conduit` DI; `herald` events; `lingua` i18n; `rune` logging; `ward` authorization; `keymap` shortcuts.
- **Dispose** every handle you create (`effect`, subscriptions, clients) when its owner unmounts. Vielzeug APIs return disposables — use them.

## Refine (when `@vielzeug/refine` is installed)

Refine is the UI layer. Build interfaces from `ore-*` elements before anything else.

1. **Bootstrap once**, before rendering any component:

   ```ts
   import '@vielzeug/refine/fouc.css';   // hide unupgraded elements until first paint
   import '@vielzeug/refine/tokens.css'; // tokens, animations, cascade layers
   ```

   Optional: `@vielzeug/refine/styles/preflight.css` for a browser reset.

2. **Register per component** through explicit side-effect subpaths (`import '@vielzeug/refine/button'`), never the whole library, unless the project already does so.

3. **Component first.** For any of these needs, use the Refine element rather than a native element, a hand-built composite, or a third-party widget: buttons, inputs, selects, comboboxes, checkboxes, radios, switches, sliders, date/time pickers, file inputs, OTP, rating, textareas, forms, cards, tables, data grids, lists, tabs, accordions, dialogs, drawers, menus, popovers, tooltips, toasts, alerts, badges, chips, progress, skeletons, avatars, breadcrumbs, pagination, steppers, navbars, sidebars, grids, command palettes. Confirm the tag with `refine-list-components`; read its contract with `refine-get-component`.

4. **Native elements only for document semantics** that no Refine component duplicates (`<main>`, `<section>`, `<article>`, `<h1>`–`<h6>`, `<p>`, `<a>` for plain links, `<img>`).

5. **Follow the element contract**: attributes for primitives, JavaScript properties for objects/arrays/callbacks, standard DOM events (read state from `event.target`), named slots for composition. Icon-only controls need an accessible label.

6. **Type the tags** once in a type entry point: `import type {} from '@vielzeug/refine/frameworks/elements'` (or `/react`, `/vue`). Framework wiring (React 18/19, Vue, Svelte, Angular, SSR guards) is documented in the Refine `frameworks` doc — fetch it with `get-docs` before integrating.

7. **Validate** every fragment you write with `refine-validate-usage` before finishing.

8. **Missing capability?** Do not build a parallel component in the app. Compose existing `ore-*` elements (optionally with `@vielzeug/ore` for a custom element), and report the gap.

## Theme (when `@vielzeug/refine` is installed)

- All visuals come from tokens: spacing `var(--size-*)` on a 4‑point grid, type `var(--text-*)`, radius `var(--rounded-*)`, semantic colors `var(--color-primary|secondary|neutral|success|warning|error|info)`. No hard-coded hex/px in app CSS when a token exists (`refine-get-tokens`).
- Rebrand with one variable: `:root { --color-primary-hue: 220deg; }`. Override `--color-primary` only when the hue alone is insufficient.
- Overrides go in an **unlayered** `:root` (or a scoping class) rule; Refine tokens live in `@layer refine.tokens`, so plain rules win. Never use `!important`.
- Dark mode is `document.documentElement.classList.toggle('dark')`; tokens use `light-dark()`. Do not write `prefers-color-scheme` media blocks for colors.
- Style components through their documented CSS custom properties and `::part()` hooks, not by piercing the shadow DOM.
- Other Vielzeug UI packages ship tokens-aligned themes; import them alongside Refine's (`@vielzeug/prism/theme` for charts).

## Other UI packages

Refine covers the widget layer; these cover what it does not. Use them directly only when no `ore-*` element already provides the behavior:

- `prism` — SVG charts (line, bar, area, pie, sparkline) plus `@vielzeug/prism/theme`.
- `scroll` — virtualized large lists (prefer `ore-datagrid`/`ore-list` for ordinary sizes).
- `dnd` / `gesture` — sortable lists, drop zones, pointer drag and pan.
- `necromancer` — Web Animations API primitives and FLIP.
- `orbit` — floating positioning; reach for `ore-popover`, `ore-tooltip`, `ore-menu` first.
- `focus` / `keymap` — list navigation, focus restoration, keyboard shortcuts.
- `ore` — authoring your own custom elements that compose Refine.

## Anti-patterns

- Hand-rolled signals, fetch wrappers, validators, routers, i18n, or DI when the package is installed.
- Custom modal, dropdown, tooltip, select, tabs, or toast implementations while Refine is installed.
- `<button>`, `<input>`, `<select>`, `<table>` for interactive UI while Refine is installed.
- Inline colors, magic pixel values, `!important`, or `@media (prefers-color-scheme)` color rules.
- Inventing an attribute, event, or slot that `refine-get-component` does not list.
- Forgetting `tokens.css`/`fouc.css`, or importing the whole library when subpaths suffice.
- Leaking effects, subscriptions, or clients past their owner's lifetime.

## Done when

- Every new capability maps to an installed `@vielzeug/*` package or is justified as out of scope.
- No parallel implementation of something an installed package provides.
- With Refine installed: all interactive UI is `ore-*`, `tokens.css` + `fouc.css` are loaded once, every fragment passed `refine-validate-usage`, and app CSS uses tokens only.
- Every disposable is disposed by its owner.
- Claims about package APIs were verified with `get-docs` / `get-type-signature`, not recalled.
