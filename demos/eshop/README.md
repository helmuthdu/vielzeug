# Vielzeug Motors

A fictional luxury car eShop demo — browse the lineup, configure a build, compare models, check
out through a multi-step flow, and manage orders as a customer, sales rep, or admin. Built inside
the Vielzeug monorepo with Vite + TypeScript, `@vielzeug/refine` components/theme for the UI,
`@vielzeug/ore` for the handful of custom elements refine doesn't provide, and most
other `@vielzeug/*` packages wired in for a real, non-decorative purpose (three were deliberately
left out — see "Package map" below for why).

"Vielzeug Motors" borrows the monorepo's own project name for the storefront brand — a fictional
marque, not a real manufacturer, and a more honest showcase name than an invented one would be.
Model names ("A200", "R350", "V500", "X300", "X600 AS", "AV400") and sub-brands ("AS" = Vielzeug
Sport, the performance line; "Volt" = the EV line) are invented for this demo. Product media uses
`ore-skeleton` with its stripped `striped` prop as a deliberate design-mode placeholder.

## Running it

```bash
pnpm install
pnpm dev            # workspace package builds
pnpm dev:local       # VIELZEUG_LOCAL_DEV=1 — resolves @vielzeug/* directly to sibling packages/ source
pnpm build && pnpm preview
pnpm build:local     # type-check and bundle against sibling package source
pnpm test
```

## Design direction

Light-by-default showroom canvas (`core/theme.ts` defaults `themePreference` to `light` — every
real car-configurator reference this demo studied, Mercedes-Benz Store and BMW's Neuwagensuche,
is a bright, white-canvas retail site, not a dark stage; `dark`/`system` stay one click away in
Settings). One typeface, Hanken Grotesk, carries UI, body, and headings alike — off the
training-data-reflex font list on purpose, not refine's own Inter/Plus Jakarta defaults — with
500-weight model names, 300-weight supporting copy, and `font-variant-numeric: tabular-nums` on
prices doing the hierarchy work a second family would otherwise do. Color is Committed, not
Restrained: catalog cards and
the hero use each model's `heroHue` (`core/types.ts` — cold cyan for the Volt/electric line,
vermillion for AS/performance, steel-blue elsewhere), scoped to brand-register surfaces only;
cart/checkout/orders/admin stay locked to one calm global accent on
purpose (product register — consistent and boring by design). The catalog breaks its own
card-grid rhythm with one featured flagship hero (`ui/views/catalog.ts`, pinned to the V500 — the
one model whose own catalog copy calls it "the Vielzeug flagship"). Product-media slots use
`ore-skeleton` with `striped` enabled until final imagery is supplied. `ui/components/animated-price.ts`
tweens price changes instead of snapping, so the configurator's breakdown reads as a live
calculation.


## Feature tour

| Route | What it shows |
| --- | --- |
| `/catalog` | Editorial lineup — flagship first, compact search/sort/refinement controls, URL-persisted shortlist state |
| `/models/:slug` | Configurator — trim-first build flow, visible build summary, accessible paint/wheel/package controls, live pricing and financing |
| `/cart` | Line items, quantity, promo code, order summary |
| `/checkout/*` | Shipping → Payment → Review → Confirmation, guarded by a state machine |
| `/orders` | Customer's own order history, cancel (ward-guarded) |
| `/admin` | Sales/admin only — revenue chart, all-orders table, CSV export |
| `/settings` | Locale, theme + accent color, currency, user switcher, debug log |

Compare (up to 3 models) is deliberately not a route — the navbar's "Compare" item (and the
command palette) open `ui/components/compare-drawer.ts`, a single bottom `ore-drawer` mounted
globally in `app-shell.ts`. Its body lays the full spec comparison out with `ore-grid`'s
`responsive` auto-fit mode, so it collapses to one column on mobile instead of a horizontally
scrolling table, without ever leaving the page the shopper was already on.

## Package map

Every `@vielzeug/*` package this app actually needs (26 of the 29 published browser-runtime
packages — `codex` is a dev-time MCP server, not a browser runtime dependency, so it's not part
of this app's `package.json`) does real work here. `keymap`, `ledger`, and `pulse` are the three
deliberately *not* used: a global ⌘Z/⌘⇧Z undo and a navbar undo/redo pair mostly demonstrated
those packages rather than solving a real shopper need — a car-shopping cart isn't a document you
"undo" the way you'd undo a keystroke, "Remove" already covers it, and a hidden shortcut with no
visible affordance is a discoverability dead end. `core/history.ts`'s cart/compare mutations are
plain synchronous functions instead. `pulse` backed a scripted "N shoppers configuring this
model" presence badge on the configurator; it read as manufactured urgency rather than a useful
signal, so the whole realtime layer (`core/realtime.ts`) was dropped.

| Package | Where / why |
| --- | --- |
| `arsenal` | (transitively via other packages; see `core/pricing.ts`/`core/history.ts` for hand-rolled equivalents kept dependency-free) |
| `clockwork` | `core/checkout-machine.ts` — shipping → payment → review → confirmed FSM |
| `coins` | `core/pricing.ts`, `core/currency.ts` — exact price-breakdown and multi-currency math |
| `conduit` | `core/container.ts` — DI container composing the admin `ReportService` from the api client + logger tokens |
| `courier` | `core/api.ts`, `core/catalog.ts`, `core/orders.ts` — mock REST client, query cache, mutations |
| `dnd` | `ui/components/compare-drawer.ts` — keyboard- and drag-reorderable compare list |
| `familiar` | `core/worker-tasks.ts` — CSV export of orders on a Web Worker |
| `flux` | Bridges router/i18n subscribe-APIs into `ripple` signals (`core/router.ts`, `core/i18n.ts`, `core/catalog.ts`) |
| `forge` | `ui/views/checkout.ts` — shipping address form (values/validation/submit) |
| `herald` | `core/events.ts` — app-wide toast/cart/order event bus |
| `lingua` | `core/i18n.ts` — en/de catalog |
| `orbit` | `ui/components/spec-tooltip.ts` — positioned directly with `createPositioner()` + the `tooltip` preset (not via refine's own tooltip wrapper) |
| `ore` | Every custom element in `ui/` |
| `prism` | `ui/views/admin.ts` — revenue bar chart |
| `refine` | Every UI component + the theme (`styles/app.css` overrides `--color-primary-hue`) |
| `ripple` | State layer throughout `core/` |
| `rune` | `core/logger.ts` — structured logger + Settings' debug log viewer |
| `sandbox` | `core/embed-preview.ts` — sandboxed iframe preview for "Share this build" |
| `scout` | `core/search-index.ts` — fuzzy model search (catalog + command palette) |
| `scroll` + `sourcerer` | `ui/views/admin.ts` / `core/inventory-source.ts` — paginated, virtualized all-orders table |
| `spell` | `ui/views/cart.ts` — promo code format validation |
| `tempo` | `core/format.ts` — delivery-date estimation and formatting |
| `vault` | `core/persistence.ts` — cart/compare/preferences persisted to `localStorage` |
| `ward` | `core/auth.ts`, `core/order-actions.ts` — customer/sales/admin permissions |
| `wayfinder` | `core/router.ts` — client-side routing |

## AI tooling note

While building this demo, package APIs were looked up through `@vielzeug/codex`'s MCP catalog
rather than reading every package source file-by-file. The same snapshot-backed catalog powers
Codex clients and avoids duplicated lookup logic.
