# Vielzeug CRM

Vielzeug CRM is a fictional B2B sales workspace built to show how small `@vielzeug/*` packages compose into a convincing application. It is intentionally local-first: generated records, an in-memory mock API, simulated realtime traffic, and a durable browser outbox replace production infrastructure.

## Running it

```bash
pnpm install
pnpm dev
pnpm dev:local       # resolve @vielzeug/* directly to sibling package source
pnpm build
pnpm build:local
pnpm test
pnpm test:e2e
```

## Design direction

The Signal Workspace visual system treats the CRM as a live sales instrument: a bright neutral canvas, white operational surfaces, cobalt navigation and actions, teal momentum, and violet forecast analytics. A recurring 12-week Activity Signal turns realtime CRM events into an identifiable visual signature across Overview, Pipeline, company profiles, Activity, and Showcase. Public Sans carries dense UI and tabular data without introducing another font dependency.

Desktop uses a collapsible section rail, contextual navigation, and lazy-loaded route workspaces. Mobile reduces this to four primary destinations plus account and demo controls; metric cards become snap rails and record layouts adapt to task-oriented cards. Light, dark, and system themes preserve the same semantic color roles and follow operating-system changes.

## Demo flow

1. Open Overview and inspect live KPIs and Prism charts.
2. Press Ctrl/Cmd+K, search for `Acme`, and open the deep-linked company workspace.
3. Inspect Activity Signal, relationships, and keyboard-operable opportunity tabs, then open Pipeline and move Acme Enterprise Contract from Proposal to Negotiation by drag-and-drop or the stage selector.
4. Use the toast action or press Ctrl/Cmd+Z to undo the move.
5. Switch the network control to Offline, move another deal, then reconnect to flush the durable outbox.
6. Open Activity and simulate a live update.
7. Open Vielzeug Showcase from the topbar demo control or command search to inspect package compositions and run the worker, search, and sandbox demos.

## Architecture

- `src/core/` owns domain data and package integrations.
- `src/ui/` owns the app shell and lazy-loaded Ore/Refine route views.
- `src/workers/` owns Familiar worker entry points.
- No backend, database, authentication service, or WebSocket server is required.

Courier uses a browser-local `mockFetch` implementation with 100–400ms latency. The network control makes this transport fail like a real offline request, giving Postmaster a genuine retry target. Pulse runs against a small mock WebSocket implementing its room/presence protocol. Both are demonstration adapters, not recommended production infrastructure.

## Package map

| Package | Where used | Why |
| --- | --- | --- |
| `assay` | `crm-kpi` test | Framework-neutral DOM assertions |
| `clockwork` | Opportunity state machine | Validate legal pipeline transitions |
| `coins` | Money formatting | Correct localized EUR amounts |
| `conduit` | Report service | Compose reporting from Courier and Rune |
| `courier` | Mock CRM API | HTTP-shaped reads and stage mutations with latency |
| `dnd` | Pipeline | Connected sortable pipeline columns |
| `familiar` | Showcase analytics worker | Process 10,000 contacts off the main thread |
| `flux` | Router and Pulse bridges | Convert subscribed external state into Ripple signals |
| `forge` | Company, contact, lead, and opportunity forms | Typed immutable create/edit form state |
| `gesture` | Activity feed | Mobile swipe-to-archive interaction |
| `herald` | App event bus | Connect pipeline, activity, realtime, sync, and toasts |
| `illusionist` | Seed generator | Deterministic realistic people and contact data |
| `keymap` | App shell | Global undo and redo shortcuts |
| `ledger` | Opportunity history | Reversible stage and edit commands |
| `lingua` | Locale switcher | EN/DE navigation and action labels |
| `necromancer` | Realtime activity | Reduced-motion-aware feed insertion animation |
| `ore` | App shell and CRM elements | Custom KPI, activity, record form, detail drawer, and view elements |
| `postmaster` | Offline stage outbox | Persist and retry Courier mutations |
| `prism` | Overview | Accessible line and bar charts |
| `pulse` | Simulated presence | Exercise room/presence protocol without a server |
| `refine` | Controls, feedback, overlays | Accessible generic UI primitives |
| `ripple` | Application state | Signals, computed values, effects, and external bindings |
| `rune` | Core services | Scoped structured diagnostics |
| `sandbox` | Showcase email preview | Isolate generated preview HTML in a sandboxed iframe |
| `scout` | Global search | Fuzzy indexing for CRM-wide discovery |
| `sentinel` | Offline sync | Observe real browser connectivity and trigger an outbox flush |
| `spell` | Entity create/edit dialog | Validate names, contact email, revenue, amount, probability, and dates |
| `tempo` | Relative activity time | Parse Temporal instants before localization |
| `vault` | CRM state and outbox | Persist local data, preferences, and queued work |
| `ward` | Demo user switcher | Manager, sales representative, and viewer permissions |
| `wayfinder` | Eight application routes | Browser history and deep links |

`Arsenal`, `Focus`, and `Orbit` arrive transitively where their owners need them: Courier/Postmaster use Arsenal helpers, and Refine's composite controls use Focus and Orbit. They are not direct dependencies because the CRM has no direct API call for them. Codex remains a development-time MCP server and is intentionally absent from the browser bundle.

## Testing

Vitest covers deterministic data, workflow transitions, permissions, Ledger undo/redo, and an Assay DOM component check. Playwright runs the five-minute path at desktop and mobile widths. The suite is intentionally focused rather than production-comprehensive.
