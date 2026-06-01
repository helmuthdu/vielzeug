---
title: Getting Started
description: Vielzeug is a collection of focused TypeScript packages — each one does one thing well, and they all fit together naturally.
sidebar: false
---

# Getting Started

**Vielzeug** (German for "many tools") is a set of focused TypeScript packages. Each one solves a single problem — state, forms, routing, storage, HTTP, UI components — and they all fit together without friction.

You don't need to adopt the whole ecosystem. Pick the packages you need and import only what you use.

::: tip Try it first
The [REPL](/repl.html) lets you run any package in the browser without installing anything.
:::

## Install a Package

Every package is independent. Install just what you need:

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

## The Packages

### Reactive State — [Ripple](/ripple/)

Fine-grained signals with computed values, effects, and batched updates. No classes, no decorators — just functions.

```typescript
import { signal, computed, effect } from '@vielzeug/ripple';

const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => console.log(doubled.value)); // logs whenever count changes

count.value++; // → 2
```

**Start here if** you need reactive state in a vanilla TS/JS project or want to power your own UI layer.

---

### Web Components — [Craft](/craft/)

Define custom elements with a clean setup function, reactive templates, and automatic lifecycle management. Built on top of Ripple signals.

```typescript
import { define, html, signal } from '@vielzeug/craft';

define('my-counter', () => {
  const count = signal(0);

  return html` <button @click=${() => count.value++}>Clicked ${count} times</button> `;
});
```

**Start here if** you want to build framework-agnostic UI components that work in any app.

---

### Component Library — [Sigil](/sigil/)

A collection of accessible, themeable UI components — buttons, inputs, modals, and more — all built with Craft. Drop them straight into your project.

```html
<bit-button variant="solid" color="primary">Save</bit-button>
<bit-input label="Email"></bit-input>
```

**Start here if** you want production-ready components without building from scratch.

---

### Forms — [Forge](/forge/)

Form state management with field validation, dirty tracking, submission handling, and file upload support.

```typescript
import { createForm } from '@vielzeug/forge';
import { s } from '@vielzeug/spell';

const form = createForm({
  defaultValues: { email: '', age: 0 },
  validators: {
    email: (val) => {
      const r = s.string().email().safeParse(val);
      return r.success ? undefined : r.error.message;
    },
    age: (val) => {
      const r = s.number().min(18).safeParse(Number(val));
      return r.success ? undefined : r.error.message;
    },
  },
});

await form.submit(async (values) => {
  await fetch('/api/users', { method: 'POST', body: JSON.stringify(values) });
});
```

**Start here if** you're tired of writing boilerplate for controlled inputs and error state.

---

### Validation — [Spell](/spell/)

Schema-based validation with a chainable builder, async validators, and detailed error messages. Pairs naturally with Forge.

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

**Start here if** you need type-safe validation that works both in forms and on raw API payloads.

---

### HTTP Client — [Courier](/courier/)

A modern HTTP client with request deduplication, smart caching, retries, and a query layer.

```typescript
import { createApi, createQuery } from '@vielzeug/courier';

const api = createApi({ baseUrl: '/api' });
const queryClient = createQuery({ staleTime: 5_000 });

// Concurrent calls share one in-flight request
const user = await queryClient.query({
  key: ['user', id],
  fn: () => api.get<User>(`/users/${id}`).then((r) => r.json()),
});

// Invalidate after a mutation
await api.patch(`/users/${id}`, { body: { name: 'Alice' } });
queryClient.invalidate(['user', id]);
```

**Start here if** you want caching and deduplication without pulling in a full server-state library.

---

### Client Storage — [Vault](/vault/)

Type-safe LocalStorage and IndexedDB with schemas, TTL expiration, and a query builder.

```typescript
import { createLocalStorage, table } from '@vielzeug/vault';

type User = { id: string; name: string; role: string };

const schema = { users: table<User>('id') };
const db = createLocalStorage({ name: 'myapp', schema });

await db.put('users', { id: '1', name: 'Alice', role: 'admin' });
const admins = await db.query('users').equals('role', 'admin').toArray();
```

**Start here if** you need structured, queryable storage that survives page reloads.

---

### Routing — [Wayfinder](/wayfinder/)

Hash and History router with type-safe params, middleware, async handlers, and View Transitions API support.

```typescript
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    home: { path: '/', handler: () => renderHome() },
    login: { path: '/login', handler: () => renderLogin() },
    userDetail: { path: '/users/:id', handler: ({ params }) => renderUser(params.id) },
    notFound: { path: '*', handler: () => render404() },
  },
  middleware: [async (ctx, next) => {
    if (!isLoggedIn() && ctx.pathname !== '/login') return ctx.navigate({ path: '/login' });
    await next();
  }],
});
```

**Start here if** you need client-side routing without a frontend framework.

---

### Permissions — [Ward](/ward/)

Role-based access control with wildcard support, dynamic permission functions, and anonymous user handling.

```typescript
import { createWard, owns } from '@vielzeug/ward';

const ward = createWard<'create' | 'update' | 'delete', { authorId: string }>([
  { role: 'admin', resource: 'posts', action: 'create', effect: 'allow' },
  { role: 'admin', resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'admin', resource: 'posts', action: 'delete', effect: 'allow' },
  { role: 'user', resource: 'posts', action: 'create', effect: 'allow' },
  { role: 'user', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
]);

if (!ward.can(currentUser, 'posts', 'delete')) {
  throw new ForbiddenError();
}
```

**Start here if** you need fine-grained access control without a full auth service.

---

### Dependency Injection — [Conduit](/conduit/)

Typed DI container with singleton and transient lifetimes, child scopes, and circular dependency detection.

```typescript
import { createContainer, createToken } from '@vielzeug/conduit';

const LoggerToken = createToken<Logger>('Logger');
const ApiToken = createToken<ApiService>('ApiService');

const container = createContainer();
container.factory(LoggerToken, () => new ConsoleLogger(), { lifetime: 'singleton' });
container.factory(ApiToken, (logger) => new ApiService(logger), { deps: [LoggerToken] });

const api = await container.resolve(ApiToken);
```

**Start here if** you want clean service wiring without coupling classes to each other.

---

### Utilities — [Arsenal](/arsenal/)

75+ tree-shakeable utilities — array, object, string, math, async, date helpers. Nothing you don't import, nothing you pay for.

```typescript
import { debounce, group, clamp, isEqual } from '@vielzeug/arsenal';

const search = debounce(fetchResults, 300);
const byRole = group(users, (u) => u.role); // { admin: [...], user: [...] }
const clamped = clamp(value, 0, 100);
const unchanged = isEqual(prev, next);
```

**Start here if** you want to stop copying utility snippets between projects.

---

### State Machines — [Clockwork](/clockwork/)

Typed finite state machines with discriminated event unions, guard conditions, async invokes with cancellation, and reactive state/context as Ripple signals.

```typescript
import { defineMachine, interpret } from '@vielzeug/clockwork';

type AuthEvent = { type: 'LOGIN'; token: string } | { type: 'LOGOUT' };

const authMachine = defineMachine({
  initial: 'idle',
  context: { token: '' },
  states: {
    idle: { on: { LOGIN: [{ target: 'active', actions: [({ context, event }) => { context.token = event.token; }] }] } },
    active: { on: { LOGOUT: [{ target: 'idle', actions: [({ context }) => { context.token = ''; }] }] } },
  },
});

const auth = interpret(authMachine);
auth.send({ type: 'LOGIN', token: 'abc123' });
console.log(auth.state.value); // 'active'
```

**Start here if** you need predictable state transitions with strict type safety and reactive UI binding.

---

### Other Packages

| Package                  | What it does                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| **[Rune](/rune/)**         | Structured logging with scoped loggers, log levels, and styled console output                   |
| **[Lingua](/lingua/)**     | I18n with nested keys, variable interpolation, async locale loading, and reactive subscriptions |
| **[Herald](/herald/)**     | Typed event bus for decoupled, reactive inter-module communication                              |
| **[Familiar](/familiar/)**       | Typed Web Worker abstraction with pooling, queuing, and graceful fallback                       |
| **[Grip](/grip/)**       | Framework-agnostic drag-and-drop with drop zones, MIME filtering, and sortable lists            |
| **[Orbit](/orbit/)**     | Floating element positioning for tooltips, dropdowns, menus, and popovers                       |
| **[Sourcerer](/sourcerer/)**   | Typed local and remote data sources for pagination, filtering, sorting, and search              |
| **[Tempo](/tempo/)**         | Date parsing, timezone conversion, DST-safe arithmetic, and Intl formatting                     |
| **[Scroll](/scroll/)** | Virtual list engine with variable heights, smooth scrolling, and zero dependencies              |

## Packages That Work Well Together

| Combination           | Why                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Ripple + Craft**       | Craft templates are powered by Ripple signals — same reactive primitives, zero glue                   |
| **Spell + Forge**        | Pass a Spell schema directly as a field validator — one schema serves both form and API                |
| **Courier + Ripple**       | Fetch remote data with caching, push results into a signal for reactive rendering                        |
| **Vault + Courier**       | Persist query results in IndexedDB for offline-capable apps                                              |
| **Ward + Wayfinder**      | Check permissions in router middleware before the route handler ever runs                                |
| **Conduit + Rune**          | Register a scoped logger per service in your DI container                                                |
| **Sourcerer + Courier**      | Use Courier as the HTTP transport inside a `createRemoteSource` for pagination and search with caching   |
| **Scroll + Orbit**     | Render a virtualised list inside a Orbit-positioned dropdown for high-item-count comboboxes            |
| **Grip + Scroll**      | Combine sortable drag handles with a virtual list for large reorderable datasets                         |
| **Sourcerer + Wayfinder**      | Sync a source's query state (page, filters, sort) with the URL so links stay shareable                   |
| **Clockwork + Ripple**      | Clockwork state and context are ReadonlySignals — bind them directly to effects or UI templates            |
| **Clockwork + Ward**       | Call ward predicates inside clockwork guards to block unauthorized transitions                           |
| **Clockwork + Herald**      | Publish state-change events to decouple multiple machines from each other                                |

## Philosophy

**One problem per package.** We don't build "meta-frameworks". Each package has a tight scope and does that one thing well. You pull in exactly what you need.

**TypeScript first.** Types are not bolted on after the fact. Everything is designed around inference — you rarely write a type annotation and you never reach for `as any`.

**Zero surprises.** APIs follow consistent conventions: `create*` for factories, `on*` for subscriptions, `safeParse` for fallible operations. Learn one package and the next one feels familiar.

**No magic.** No proxies chasing object mutations, no decorators, no global singletons. If you want to know what a function does, reading it is enough.
