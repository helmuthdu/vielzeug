---
name: vielzeug
description: 'Use when a project depends on any @vielzeug/* package: pick the owning package instead of hand-rolling, and use Refine components, tokens, and theme whenever @vielzeug/refine is installed. Applies to features, fixes, refactors, and UI work in consuming apps.'
---

# Vielzeug

Vielzeug is a monorepo of independently published TypeScript packages. "Zero dependency" refers to external (non-`@vielzeug`) runtime dependencies; `@vielzeug/*` dependencies are encouraged when they reduce duplication. This skill keeps an agent working _with_ the installed packages: discover what exists, use the owning package, and build UI from Refine when it is present.

## Detect

1. Read `package.json` (`dependencies`, `devDependencies`, `peerDependencies`) and list every `@vielzeug/*` entry. Resolve each installed version from `node_modules/@vielzeug/<pkg>/package.json` when present, otherwise from the package-manager lockfile.
2. Note whether `@vielzeug/refine` is installed. If it is, the **Refine** and **Theme** sections below are mandatory for any UI work.
3. Read the project's own agent contract (`AGENTS.md`, `.github/copilot-instructions.md`) first: project rules win over this skill.

## Discover, don't recall

Never guess exports, attributes, events, slots, or token names. Look them up:

| Question                                                    | MCP tool (`@vielzeug/codex`)                     | Offline fallback                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Which package solves X?                                     | `search-packages`, `list-packages`               | the package list below                                                                                   |
| How do I use package X?                                     | `get-docs` (`index`, `usage`, `api`, `examples`) | `node_modules/@vielzeug/<pkg>/README.md`                                                                 |
| Exact signature of an export                                | `get-type-signature`                             | the declaration file named by the installed manifest's matching export                                   |
| Runnable example                                            | `list-examples`, `get-example`                   | package README; `docs/<pkg>/examples/` when the Vielzeug repository is checked out                       |
| Which Refine components exist?                              | `refine-list-components` (tags + descriptions)   | `rg '"tagName"' node_modules/@vielzeug/refine/dist/custom-elements.json`                                 |
| Attributes, properties, events, slots, CSS parts of `ore-*` | `refine-get-component`                           | extract the matching `tagName` declaration from the manifest with a JSON parser                          |
| Component CSS custom properties                             | `refine-get-tokens` (pass a prefix)              | extract the component's `cssProperties` from the manifest                                                |
| Global design tokens                                        | targeted search in installed theme CSS           | `node_modules/@vielzeug/refine/dist/styles/theme.css` or checkout `packages/refine/src/styles/theme.css` |
| Are component attribute names recognized?                   | `refine-validate-usage`                          | compare against the manifest                                                                             |
| Blank component scaffold                                    | `refine-generate-template`                       | N/A                                                                                                      |

Look each thing up once, from the smallest source that answers it: reuse a lookup already in this task while its version and relevant inputs remain unchanged; read one component with `refine-get-component` instead of listing the whole catalog; pass the narrowest known prefix (prefer an exact token name when known) to `refine-get-tokens`; fetch the one `get-docs` page that answers the question, not `index` + `usage` + `api` + `examples`. Verified installed declarations or checkout source are sufficient evidence without an additional docs fetch. Offline, use targeted searches to locate source or CSS; extract a component declaration from the JSON manifest with a structured parser rather than dumping the manifest.

`refine-get-tokens` reads CEM component CSS properties, not the complete global theme. For global tokens such as `--size-*`, search the relevant prefix or exact name in theme CSS; an empty MCP result does not prove a global token is unavailable. `tokens.css` only imports the underlying stylesheets.

Codex serves a versioned snapshot, which may not match the versions installed in the project or include the newest packages. Compare `get-package`'s `version` with the installed version before using its API docs or signatures. If they differ, treat the installed package's declarations, docs, and runtime as authoritative; do not use newer snapshot APIs unless the dependency is deliberately updated. Treat the generated package list as a discovery aid, not proof that no other package exists.

`get-docs` reaches only the four standard pages (`index`, `api`, `usage`, `examples`). A package's extra guides (Refine's `frameworks`, `theming`, `accessibility`, per-component references) are not in that set: read them from `https://vielzeug.dev/<pkg>/<page>` or from the checkout's `docs/<pkg>/`, not from `get-docs`.

If MCP is unavailable, use the offline fallback first. Check installed packages and the lockfile when the generated package list has no match. If the needed information is still unavailable and MCP setup would help, ask before running `npx -y @vielzeug/codex` or changing MCP configuration; setup details are in `node_modules/@vielzeug/codex/mcp-setup.json`.

## Use the owning package

If a need matches a package below, use that package. Do not reimplement signals, fetch wrappers, validation, routing, i18n, DI, date math, storage, or event buses by hand, and do not add a third-party library for a need an installed `@vielzeug/*` package already covers. Prefer installing the matching `@vielzeug/*` package over a third-party one when the project already uses Vielzeug, but ask before adding a dependency.

<!-- GENERATED:skill-packages:BEGIN -->

- `@vielzeug/archive`: Community content publishing for Cloudflare Workers + D1: a hardened Worker core over per-collection payload schemas
- `@vielzeug/arsenal`: Non-trivial TypeScript utilities: retry, cancellation, cache, safe-path, serialization, prototype-pollution-guarded collections
- `@vielzeug/assay`: Framework-agnostic DOM testing primitives: scoped queries, event dispatch, async waiting
- `@vielzeug/beacon`: Guided onboarding and contextual product tours for web applications
- `@vielzeug/clockwork`: Framework-neutral finite state machines with pure transitions and actors
- `@vielzeug/coins`: Currency formatting and exchange utilities for monetary arithmetic
- `@vielzeug/conduit`: Typed dependency injection container
- `@vielzeug/courier`: Typed HTTP client with bounded structured-key caching, prefetching, immutable middleware, and structured errors
- `@vielzeug/dnd`: Drag-and-drop: drop zones and sortable lists
- `@vielzeug/familiar`: Web Worker pool with tasks, timeouts, cancellation
- `@vielzeug/flux`: Minimal push streams with explicit ownership, bounded buffering, and structural bridges
- `@vielzeug/focus`: Framework-neutral list navigation and focus restoration primitives
- `@vielzeug/forge`: Typed form state, validation, submission
- `@vielzeug/gesture`: Framework-neutral two-dimensional pointer drag and one-axis pan recognition with lifecycle-owned handles
- `@vielzeug/herald`: Typed synchronous event bus with wildcard subscriptions, one-shot waits, and lifecycle tracing
- `@vielzeug/illusionist`: Typed, deterministic, locale-aware fake data generator with seeded PRNG
- `@vielzeug/keymap`: Headless keyboard shortcut manager with chord sequences
- `@vielzeug/ledger`: Serialized reversible command history with atomic framework-neutral state and cancellation ownership
- `@vielzeug/lingua`: Typed i18n with pluralization and lazy locale loading
- `@vielzeug/mesh`: Backendless peer-to-peer session transport over WebRTC data channels with manual pairing and host-authoritative star topology
- `@vielzeug/necromancer`: Lifecycle-owned Web Animations API primitives with native access, per-handle groups, and additive FLIP
- `@vielzeug/orbit`: Floating UI positioning with lifecycle-owned geometry and middleware
- `@vielzeug/ore`: Functional web-component authoring on top of ripple
- `@vielzeug/patchwork`: RFC 6902 JSON Patch: structural diff, immutable apply, and guarded tryApply for sync protocols.
- `@vielzeug/postmaster`: Typed durable job outbox with leased processing, retries, and dead-letter recovery
- `@vielzeug/prism`: Responsive SVG charts with explicit updates: line, bar, area, scatter, pie, radar, heatmap, sparkline
- `@vielzeug/pulse`: Typed WebSocket client with channels, rooms, presence, reconnect
- `@vielzeug/refine`: Accessible, themeable web components built on ore
- `@vielzeug/ripple`: Reactive runtime primitives: signals, derived values, effects, scopes, watchers, and async resources
- `@vielzeug/rune`: Structured scoped logger with remote transport
- `@vielzeug/sandbox`: Sandboxed iframe runtime with typed postMessage state bridge
- `@vielzeug/scout`: Trigram fuzzy-search index with highlighting and reactive layer
- `@vielzeug/scribe`: Safe Markdown prose: deterministic parser, XSS-safe DOM and HTML renderers, outline and plain-text extraction.
- `@vielzeug/scroll`: Virtual list engine for large datasets
- `@vielzeug/sentinel`: Subscribable snapshots for external browser environment state
- `@vielzeug/sigil`: QR code generation and scanning: pure matrix encoder, SVG and canvas renderers, native BarcodeDetector scanning
- `@vielzeug/sourcerer`: Reactive collection sources with local, page, cursor, and infinite pagination
- `@vielzeug/spell`: Zero-dependency schema validation with Standard Schema interoperability
- `@vielzeug/tabula`: Typed CSV and TSV: RFC 4180 parser with schema-validated rows, streaming reader, and safe serializer.
- `@vielzeug/tandem`: Offline-first sync engine with rev baselines, tombstoned deletions, and idle-batched pushes
- `@vielzeug/tavern`: Table sessions over mesh: host-owned state replication with guest command forwarding
- `@vielzeug/tempo`: Temporal-powered date utilities
- `@vielzeug/vault`: Adapter-free typed storage core with focused browser and SQLite subpaths
- `@vielzeug/ward`: Ordered authorization rules with immutable policies and typed decisions
- `@vielzeug/wayfinder`: Client-side router with middleware and guards

<!-- GENERATED:skill-packages:END -->

Common compositions (verify unfamiliar APIs from the smallest applicable source above before writing code):

- **State**: `ripple` signals/derived/effects; `clockwork` when state is a finite machine; `ledger` for undo/redo.
- **Data**: `courier` for HTTP with caching and structured errors; `sourcerer` for paged/cursor/infinite collections; `vault` for storage; `postmaster` for durable jobs; `scout` for fuzzy search; `mesh` for backendless peer sessions on a LAN; `sigil` for QR generation/scanning: prefer `ore-qr-code` / `ore-qr-scanner` when Refine is installed.
- **Forms**: `forge` for form state, validation, and submission; `spell` for schemas; render fields with Refine inputs when Refine is installed.
- **App shell**: `wayfinder` routing; `conduit` DI; `herald` events; `lingua` i18n; `rune` logging; `ward` authorization; `keymap` shortcuts.
- **Own cleanup** for every stateful handle or subscription whose API documents disposal or unsubscription, and tie it to the owner's lifecycle. Pure functions and value-returning APIs need no cleanup; verify the specific API contract rather than assuming it returns a disposable.

## Refine (when `@vielzeug/refine` is installed)

Refine is the UI layer. Build interfaces from `ore-*` elements before anything else.

1. **Bootstrap once**, before rendering any component:

   ```ts
   import '@vielzeug/refine/fouc.css';   // hide unupgraded elements until first paint
   import '@vielzeug/refine/tokens.css'; // tokens, animations, cascade layers
   ```

   Optional: `@vielzeug/refine/styles/preflight.css` for a browser reset.

2. **Register per component** through explicit side-effect subpaths (`import '@vielzeug/refine/button'`). The package root registers nothing by design: there is no whole-library import to fall back on.

3. **Prefer Refine components when they fit.** For common interface controls and widgets such as buttons, inputs, selects, dialogs, menus, tables, and tabs, first check whether Refine has a component whose documented behavior fits the feature and the project's framework, accessibility, and runtime requirements. Read the candidate's contract with `refine-get-component`; fall back to `refine-list-components` only when no tag is known to fit. If no component fits or a project requirement makes it unsuitable, use the simplest appropriate native element or other package and briefly explain the choice; do not build a parallel composite when a suitable Refine component exists.

4. **Use native elements for document semantics** (`<main>`, `<section>`, `<article>`, headings, paragraphs, plain links, and images), and when they are the better fit for a documented project or platform constraint.

5. **Follow the element contract**: attributes for primitives, JavaScript properties for objects/arrays/callbacks, named slots for composition. Read event payloads from the documented `event.detail` or element state as appropriate; do not assume every event uses `event.target`. Icon-only controls need an accessible label.

6. **Type the tags** once in a type entry point: `import type {} from '@vielzeug/refine/frameworks/elements'` (or `/react`, `/vue`). For new or changed framework wiring (React 18/19, Vue, Svelte, Angular, SSR guards), read the relevant section of the Refine `frameworks` guide from the checkout or `https://vielzeug.dev/refine/frameworks` (`get-docs` does not serve it). Reuse verified existing wiring for ordinary component edits.

7. **Check attribute names** with `refine-validate-usage` when available. It only checks for unknown attributes on the specified component's opening tag; it does not validate HTML generally, attribute values, JavaScript properties, events, slots, accessibility, or runtime behavior. Check those against the component docs and relevant tests instead.

8. **Missing capability?** Compose existing `ore-*` elements when they fit. If none meets the documented feature and project requirements, use the simplest appropriate native element or other package and report the gap; avoid a parallel composite when a suitable Refine component exists.

## Theme (when `@vielzeug/refine` is installed)

- All visuals come from tokens: spacing `var(--size-*)` on a 4‑point grid, type `var(--text-*)`, radius `var(--rounded-*)`, semantic colors `var(--color-primary|secondary|neutral|success|warning|error|info)`. No hard-coded hex/px in app CSS when a token exists (verify the exact name or prefix with a targeted theme CSS search).
- Rebrand with one variable: `:root { --color-primary-hue: 220deg; }`. Override `--color-primary` only when the hue alone is insufficient.
- Overrides go in an **unlayered** `:root` (or a scoping class) rule; Refine tokens live in `@layer refine.tokens`, so plain rules win. Never use `!important`.
- Dark mode is `document.documentElement.classList.toggle('dark')`; tokens use `light-dark()`. Do not write `prefers-color-scheme` media blocks for colors. `@vielzeug/refine/theme` ships `createThemeController()` for a persisted light/dark/system preference.
- Style components through their documented CSS custom properties and `::part()` hooks, not by piercing the shadow DOM.
- Other Vielzeug UI packages ship tokens-aligned themes; import them alongside Refine's (`@vielzeug/prism/theme.css` for charts).

## Other UI packages

Refine covers the widget layer; these provide specialized behavior it may not cover. Use the package that best fits the requirement, and prefer an `ore-*` element when it provides the needed behavior:

- `prism`: SVG charts (line, bar, area, scatter, pie, radar, heatmap, sparkline) plus `@vielzeug/prism/theme.css`.
- `scroll`: virtualized large lists (prefer `ore-datagrid`/`ore-list` for ordinary sizes).
- `dnd` / `gesture`: sortable lists, drop zones, pointer drag and pan.
- `necromancer`: Web Animations API primitives and FLIP.
- `orbit`: floating positioning; reach for `ore-popover`, `ore-tooltip`, `ore-menu` first.
- `focus` / `keymap`: list navigation, focus restoration, keyboard shortcuts.
- `ore`: authoring your own custom elements that compose Refine.

## Anti-patterns

- Hand-rolled signals, fetch wrappers, validators, routers, i18n, or DI when the package is installed.
- Custom modal, dropdown, tooltip, select, tabs, or toast implementations when a suitable Refine component meets the project requirements.
- Native `<button>`, `<input>`, `<select>`, or `<table>` for interactive UI when a suitable Refine component meets the project requirements.
- Inline colors, magic pixel values, `!important`, or `@media (prefers-color-scheme)` color rules.
- Inventing an attribute, event, or slot that `refine-get-component` does not list.
- Forgetting `tokens.css`/`fouc.css`, or importing the whole library when subpaths suffice.
- Leaking effects, subscriptions, or clients past their owner's lifetime.

## Done when

- Every new capability maps to an installed `@vielzeug/*` package or is justified as out of scope.
- No parallel implementation of something an installed package provides.
- With Refine installed: prefer `ore-*` for interactive UI when its documented contract fits; load `tokens.css` + `fouc.css` once, use the attribute checker within its stated limits, and use Refine tokens for app styling where suitable tokens exist.
- Every API that documents an owned resource or cleanup operation is integrated with the owning lifecycle; pure and value-returning APIs are not given invented cleanup.
- Claims about package APIs were verified from an applicable lookup, installed declarations, or checkout source, not recalled; completion does not require repeating unchanged evidence.
