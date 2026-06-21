---
title: Getting Started
description: Vielzeug is a collection of focused TypeScript packages — each one does one thing well, with zero external dependencies and full tree-shaking.
sidebar: false
---

# Getting Started

**Vielzeug** — a German-inspired name meaning roughly "many things" — is a collection of focused TypeScript packages. Each one solves a single problem. You pick what you need, import only what you use, and the rest never ships.

Zero external dependencies. Full tree-shaking. TypeScript-first throughout.

::: tip Try before you install
The [REPL](/repl) lets you run any package in the browser without installing anything.
:::

## What are you building?

Jump to the packages most relevant to your work.

| I'm building…                        | Start with                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Reactive vanilla TS/JS               | [Ripple](#ripple) → [Arsenal](#arsenal)                                      |
| Custom UI components or a design system | [Craft](#craft) → [Sigil](#sigil) → [Ripple](#ripple)                    |
| A form-heavy application             | [Forge](#forge) → [Spell](#spell) → [Ripple](#ripple)                        |
| A full SPA                           | [Wayfinder](#wayfinder) → [Courier](#courier) → [Ripple](#ripple)            |
| Complex async or event-driven logic  | [Flux](#flux) → [Clockwork](#clockwork) → [Ripple](#ripple)                  |
| Just utility functions               | [Arsenal](#arsenal)                                                          |
| Real-time search UI (combobox, command palette) | [Scout](/scout/) → [Sourcerer](#sourcerer)                    |
| App with undo/redo (editor, design tool)         | [Ledger](/ledger/) → [Ripple](#ripple)                        |
| Global keyboard shortcuts or command palette    | [Keymap](/keymap/) → [Ledger](/ledger/)                       |

## Core

The packages most projects reach for first.

### Ripple

Fine-grained reactive state — signals, computed values, effects, stores, and reactive scopes.

```typescript
import { signal, computed, effect } from '@vielzeug/ripple';

const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => console.log(doubled.value)); // runs whenever count changes

count.value++; // logs: 2
```

Most other packages build on Ripple. Learn it first.

[Ripple docs →](/ripple/)

### Craft

Custom element authoring — reactive templates, signals, slots, and automatic lifecycle management.

```typescript
import { define, html } from '@vielzeug/craft';
import { signal } from '@vielzeug/ripple';

define('my-counter', () => {
  const count = signal(0);
  return html`<button @click=${() => count.value++}>Clicked ${count} times</button>`;
});
```

[Craft docs →](/craft/)

### Arsenal

100+ tree-shakeable utilities — array, object, string, async, math, cache, and more. Nothing you don't import, nothing you pay for.

```typescript
import { debounce, groupBy, clamp, isEqual } from '@vielzeug/arsenal';

const search = debounce(fetchResults, 300);
const byRole = groupBy(users, (u) => u.role);
const clamped = clamp(value, 0, 100);
```

[Arsenal docs →](/arsenal/)

## Common

Packages for the tasks that come up in most real applications.

### Sigil

Accessible, themeable web components built on Craft — buttons, inputs, modals, and more.

```html
<sg-button variant="solid" color="primary">Save</sg-button>
<sg-input label="Email" type="email"></sg-input>
```

Drop them straight into any project. No framework required.

[Sigil docs →](/sigil/)

### Forge

Type-safe form state — field validation, dirty tracking, submission handling, field arrays, and async defaults.

```typescript
import { createForm } from '@vielzeug/forge';
import { s } from '@vielzeug/spell';

const form = createForm({
  defaultValues: { email: '', age: 0 },
  validators: {
    email: (val) => s.string().email().safeParse(val).error?.message,
    age: (val) => s.number().min(18).safeParse(Number(val)).error?.message,
  },
});

await form.submit(async (values) => {
  await fetch('/api/users', { method: 'POST', body: JSON.stringify(values) });
});
```

Pairs with [Spell](#spell) — one schema for both form and API validation.

[Forge docs →](/forge/)

### Spell

Schema-first validation and parsing — runtime type checking, coercion, and custom refinements.

```typescript
import { s } from '@vielzeug/spell';

const schema = s.object({
  name: s.string().min(2).max(50),
  email: s.string().email(),
  age: s.number().min(18).optional(),
});

const result = schema.safeParse(input);
if (!result.success) console.log(result.error.issues);
```

[Spell docs →](/spell/)

### Courier

HTTP client with caching, request deduplication, typed mutations, SSE streaming, and interceptors.

```typescript
import { createApi, createQuery } from '@vielzeug/courier';

const api = createApi({ baseUrl: '/api' });
const queryClient = createQuery({ staleTime: 5_000 });

const user = await queryClient.query({
  key: ['user', id],
  fn: () => api.get<User>(`/users/${id}`).then((r) => r.json()),
});

await api.patch(`/users/${id}`, { body: { name: 'Alice' } });
queryClient.invalidate(['user', id]);
```

[Courier docs →](/courier/)

### Vault

Storage adapter for IndexedDB and localStorage — TTL expiration, reactive signals, schema validation, and a query builder.

```typescript
import { createLocalStorage, table } from '@vielzeug/vault';

type User = { id: string; name: string; role: string };

const db = createLocalStorage({ name: 'myapp', schema: { users: table<User>('id') } });

await db.put('users', { id: '1', name: 'Alice', role: 'admin' });
const admins = await db.query('users').equals('role', 'admin').toArray();
```

[Vault docs →](/vault/)

### Wayfinder

Typed client-side router — guards, middleware, history management, and nested routes.

```typescript
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    home: { path: '/', handler: () => renderHome() },
    userDetail: { path: '/users/:id', handler: ({ params }) => renderUser(params.id) },
    notFound: { path: '*', handler: () => render404() },
  },
  middleware: [
    async (ctx, next) => {
      if (!isLoggedIn() && ctx.pathname !== '/login') return ctx.navigate({ path: '/login' });
      await next();
    },
  ],
});
```

[Wayfinder docs →](/wayfinder/)

## Specialized

Reach for these when the problem calls for them.

### Clockwork

Typed finite state machine — guards, async invokes, nested states, and signal integration.

```typescript
import { define } from '@vielzeug/clockwork';

type AuthEvent = { type: 'LOGIN'; token: string } | { type: 'LOGOUT' };

const authMachine = define({
  initial: 'idle',
  context: { token: '' },
  states: {
    idle: { on: { LOGIN: [{ target: 'active', actions: [({ context, event }) => { context.token = event.token; }] }] } },
    active: { on: { LOGOUT: [{ target: 'idle', actions: [({ context }) => { context.token = ''; }] }] } },
  },
});

const auth = authMachine.start();
auth.send({ type: 'LOGIN', token: 'abc123' });
console.log(auth.state.value); // 'active'
```

[Clockwork docs →](/clockwork/)

### Flux

Composable streams with hot/cold semantics, backpressure, and adapters for every Vielzeug primitive.

```typescript
import { flux, filter, debounce, map, createSubject } from '@vielzeug/flux';

const subject = createSubject<string>();

flux(subject)
  .pipe(
    filter((q) => q.length > 1),
    debounce(300),
    map((q) => q.toLowerCase().trim()),
  )
  .subscribe(console.log);

subject.next('hello'); // after 300 ms: 'hello'
```

[Flux docs →](/flux/)

### Ward

Role-based access control — typed permissions, wildcard patterns, and composable predicates.

```typescript
import { createWard, owns } from '@vielzeug/ward';

const ward = createWard([
  { role: 'admin', resource: 'posts', action: '*', effect: 'allow' },
  { role: 'user', resource: 'posts', action: 'create', effect: 'allow' },
  { role: 'user', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
]);

if (!ward.can(currentUser, 'posts', 'delete')) throw new ForbiddenError();
```

[Ward docs →](/ward/)

### Conduit

Lightweight dependency injection — singletons, transient instances, factories, and named scopes.

```typescript
import { createContainer, createToken } from '@vielzeug/conduit';

const LoggerToken = createToken<Logger>('Logger');
const ApiToken = createToken<ApiService>('ApiService');

const container = createContainer();
container.factory(LoggerToken, () => new ConsoleLogger(), { lifetime: 'singleton' });
container.factory(ApiToken, (logger) => new ApiService(logger), { deps: [LoggerToken] });

const api = await container.resolve(ApiToken);
```

[Conduit docs →](/conduit/)

### Other Packages

| Package                          | What it does                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| **[Prism](/prism/)**             | Reactive SVG charts — line, bar, area, pie, and sparkline with signal-driven updates               |
| **[Orbit](/orbit/)**             | Floating element positioning for tooltips, dropdowns, menus, and popovers                          |
| **[Scroll](/scroll/)**           | Virtual list engine with variable-height rows, smooth scrolling, and zero layout thrash            |
| **[Dnd](/dnd/)**                 | Framework-agnostic drag-and-drop with sortable lists, file-drop zones, and MIME filtering          |
| **[Scout](/scout/)**             | Trigram fuzzy search with per-field weights, reactive query state, and match highlighting          |
| **[Sourcerer](/sourcerer/)**     | Typed data-source adapter for pagination, filtering, sorting, search, and infinite scroll          |
| **[Pulse](/pulse/)**             | Typed WebSocket client with channel multiplexing, presence tracking, and auto-reconnect            |
| **[Lingua](/lingua/)**           | I18n with typed translations, pluralization, namespace lazy-loading, and SSR support               |
| **[Herald](/herald/)**           | Typed event bus — pub/sub with namespaces, wildcards, and once-listeners                           |
| **[Keymap](/keymap/)**           | Headless keyboard shortcut manager with chord sequences, modifier aliases, and context guards      |
| **[Ledger](/ledger/)**           | Async undo/redo command history with Ripple signals for reactive `canUndo`/`canRedo` state         |
| **[Rune](/rune/)**               | Structured logging with scoped loggers, pluggable transports, and log levels                       |
| **[Familiar](/familiar/)**       | Typed Web Worker pool with task queuing, streaming, and AbortSignal cancellation                   |
| **[Tempo](/tempo/)**             | Date and time utilities — timezone conversion, DST-safe arithmetic, and Intl formatting            |
| **[Coins](/coins/)**             | Bigint-based monetary arithmetic with currency formatting and rounding policies                    |

## Packages That Work Well Together

| Combination                 | Why                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Ripple + Craft**          | Craft templates are powered by Ripple signals — same reactive primitives, zero glue                          |
| **Spell + Forge**           | Pass a Spell schema as a field validator — one schema for both form and API                                  |
| **Courier + Ripple**        | Fetch with caching, push results into a signal for reactive rendering                                        |
| **Vault + Courier**         | Persist query results in IndexedDB for offline-capable apps                                                  |
| **Ward + Wayfinder**        | Check permissions in router middleware before the route handler runs                                         |
| **Conduit + Rune**          | Register a scoped logger per service in your DI container                                                    |
| **Sourcerer + Courier**     | Use Courier as the HTTP transport inside `createRemoteSource` for pagination with caching                    |
| **Sourcerer + Wayfinder**   | Sync source query state (page, filters, sort) with the URL so links stay shareable                           |
| **Scroll + Orbit**          | Render a virtualised list inside an Orbit-positioned dropdown for high-count comboboxes                      |
| **Dnd + Scroll**            | Combine sortable drag handles with a virtual list for large reorderable datasets                             |
| **Clockwork + Ripple**      | Clockwork state and context are signals — bind them directly to effects or UI templates                      |
| **Clockwork + Ward**        | Call Ward predicates inside Clockwork guards to block unauthorized transitions                               |
| **Clockwork + Herald**      | Publish state-change events to decouple multiple machines from each other                                    |
| **Flux + Ripple**           | `fromSignal()` / `toSignal()` bridge signals and streams — Ripple for state, Flux for pipelines             |
| **Flux + Herald**           | `fromBus()` / `toBus()` turn a Herald bus into a Flux stream and back                                       |
| **Flux + Courier**          | `fromSse()` / `fromQuery()` wrap Courier SSE and query responses as cancellable stream pipelines            |
| **Flux + Pulse**            | `fromPulse()` / `fromPresence()` convert Pulse WebSocket channels into composable Flux streams              |
| **Scout + Ripple**          | `createReactiveSearch()` wraps the index in Ripple signals — query and results are reactive computed values  |
| **Scout + Sourcerer**       | `toSearchFn()` wires a Scout index directly into `createLocalSource` as the search function                 |
| **Keymap + Ledger**         | Wire `ctrl+z` / `ctrl+shift+z` to `ledger.undo()` / `ledger.redo()` with no boilerplate                    |
| **Keymap + Herald**         | Publish shortcut events to a bus instead of calling handlers directly — decouples keyboard from logic       |
| **Ledger + Ripple**         | `canUndo`, `canRedo`, and `isProcessing` are Ripple `Computed` values — bind directly to UI templates       |

## Philosophy

**One problem per package.** Each package has a tight scope and does that one thing well. You pull in exactly what you need.

**TypeScript first.** Types are not bolted on. Everything is designed around inference — you rarely write a type annotation and you never reach for `as any`.

**No magic.** No proxies chasing object mutations, no decorators, no global singletons. If you want to know what a function does, reading it is enough.

**Zero surprises.** APIs follow consistent conventions: `create*` for factories, `on*` for subscriptions, `safeParse` for fallible operations. Learn one package and the next one feels familiar.

## Install a Package

Every package is independent. Install only what you need:

::: code-group

```sh [pnpm]
pnpm add @vielzeug/ripple
```

```sh [npm]
npm install @vielzeug/ripple
```

```sh [yarn]
yarn add @vielzeug/ripple
```

:::
