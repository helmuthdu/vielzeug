---
title: Getting Started
description: Vielzeug is a collection of focused TypeScript packages — each one does one thing well, and they all fit together naturally.
---

# Getting Started

**Vielzeug** (German for "many tools") is a set of focused TypeScript packages. Each one solves a single problem — state, forms, routing, storage, HTTP, UI components — and they all fit together without friction.

You don't need to adopt the whole ecosystem. Pick the packages you need and import only what you use.

::: tip Try it first
The [REPL](/repl.html) lets you run any package in the browser without installing anything.
:::

## Documentation Standards

- [Documentation Style Guide](./docs-style-guide.md)

## Integration Guides

- [Building a Typed Form Flow](./building-a-typed-form-flow.md) - Validit + Formit + Fetchit
- [State and Routing](./state-and-routing.md) - Stateit + Routeit

## Install a Package

Every package is independent. Install just what you need:

::: code-group

```sh [pnpm]
pnpm add @vielzeug/stateit
```

```sh [npm]
npm install @vielzeug/stateit
```

```sh [yarn]
yarn add @vielzeug/stateit
```

:::

## The Packages

### Reactive State — [Stateit](/stateit/)

Fine-grained signals with computed values, effects, and batched updates. No classes, no decorators — just functions.

```typescript
import { signal, computed, effect } from '@vielzeug/stateit';

const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => console.log(doubled.value)); // logs whenever count changes

count.value++; // → 2
```

**Start here if** you need reactive state in a vanilla TS/JS project or want to power your own UI layer.

---

### Web Components — [Craftit](/craftit/)

Define custom elements with a clean setup function, reactive templates, and automatic lifecycle management. Built on top of Stateit signals.

```typescript
import { define, html, signal } from '@vielzeug/craftit';

define('my-counter', () => {
  const count = signal(0);

  return html` <button @click=${() => count.value++}>Clicked ${count} times</button> `;
});
```

**Start here if** you want to build framework-agnostic UI components that work in any app.

---

### Component Library — [Buildit](/buildit/)

A collection of accessible, themeable UI components — buttons, inputs, modals, and more — all built with Craftit. Drop them straight into your project.

```html
<bl-button variant="primary" @click="${handleSave}">Save</bl-button> <bl-input label="Email" :value="${emailSignal}" />
```

**Start here if** you want production-ready components without building from scratch.

---

### Forms — [Formit](/formit/)

Form state management with field validation, dirty tracking, submission handling, and file upload support.

```typescript
import { createForm } from '@vielzeug/formit';
import { v } from '@vielzeug/validit';

const form = createForm({
  defaultValues: { email: '', age: 0 },
  validators: {
    email: (val) => {
      const r = v.string().email().safeParse(val);
      return r.success ? undefined : r.error.message;
    },
    age: (val) => {
      const r = v.number().min(18).safeParse(Number(val));
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

### Validation — [Validit](/validit/)

Schema-based validation with a chainable builder, async validators, and detailed error messages. Pairs naturally with Formit.

```typescript
import { v } from '@vielzeug/validit';

const schema = v.object({
  name: v.string().min(2).max(50),
  email: v.string().email(),
  age: v.number().min(18).optional(),
});

const result = schema.safeParse(input);
if (!result.success) console.log(result.error.issues);
```

**Start here if** you need type-safe validation that works both in forms and on raw API payloads.

---

### HTTP Client — [Fetchit](/fetchit/)

A modern HTTP client with request deduplication, smart caching, retries, and a query layer.

```typescript
import { createApi, createQuery } from '@vielzeug/fetchit';

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

### Client Storage — [Deposit](/deposit/)

Type-safe LocalStorage and IndexedDB with schemas, TTL expiration, and a query builder.

```typescript
import { createLocalStorage, defineSchema } from '@vielzeug/deposit';

type User = { id: string; name: string; role: string };

const schema = defineSchema<{ users: User }>({ users: { key: 'id', indexes: ['role'] } });
const db = createLocalStorage({ dbName: 'myapp', schema });

await db.put('users', { id: '1', name: 'Alice', role: 'admin' });
const admins = await db.from('users').equals('role', 'admin').toArray();
```

**Start here if** you need structured, queryable storage that survives page reloads.

---

### Routing — [Routeit](/routeit/)

Hash and History router with type-safe params, middleware, async handlers, and View Transitions API support.

```typescript
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({
  // Guard all routes with a middleware
  middleware: async (ctx, next) => {
    if (!isLoggedIn()) return router.navigate('/login');
    await next();
  },
});

router.on('/', () => renderHome()).on('/users/:id', ({ params }) => renderUser(params.id));

router.start();
```

**Start here if** you need client-side routing without a frontend framework.

---

### Permissions — [Permit](/permit/)

Role-based access control with wildcard support, dynamic permission functions, and anonymous user handling.

```typescript
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();
permit.define('admin', 'posts', { create: true, update: true, delete: true });
permit.define('user', 'posts', { create: true });

if (!permit.check(currentUser, 'posts', 'delete')) {
  throw new ForbiddenError();
}
```

**Start here if** you need fine-grained access control without a full auth service.

---

### Dependency Injection — [Wireit](/wireit/)

Typed DI container with singleton and transient lifetimes, child scopes, and circular dependency detection.

```typescript
import { createContainer, createToken } from '@vielzeug/wireit';

const LoggerToken = createToken<Logger>('Logger');
const ApiToken = createToken<ApiService>('ApiService');

const container = createContainer();
container.register(LoggerToken, { useClass: ConsoleLogger, lifetime: 'singleton' });
container.register(ApiToken, { useClass: ApiService, deps: [LoggerToken] });

const api = container.get(ApiToken);
```

**Start here if** you want clean service wiring without coupling classes to each other.

---

### Utilities — [Toolkit](/toolkit/)

Over 100 tree-shakeable utilities — array, object, string, math, async, date helpers. Nothing you don't import, nothing you pay for.

```typescript
import { debounce, group, clamp, isEqual } from '@vielzeug/toolkit';

const search = debounce(fetchResults, 300);
const byRole = group(users, (u) => u.role); // { admin: [...], user: [...] }
const clamped = clamp(value, 0, 100);
const unchanged = isEqual(prev, next);
```

**Start here if** you want to stop copying utility snippets between projects.

---

### Other Packages

| Package                  | What it does                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| **[Logit](/logit/)**     | Structured logging with scoped loggers, log levels, and styled console output                   |
| **[i18nit](/i18nit/)**   | I18n with nested keys, variable interpolation, async locale loading, and reactive subscriptions |
| **[Eventit](/eventit/)** | Typed event bus for decoupled, reactive inter-module communication                              |
| **[Workit](/workit/)**   | Typed Web Worker abstraction with pooling, queuing, and graceful fallback                       |

## Packages That Work Well Together

| Combination           | Why                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Stateit + Craftit** | Craftit templates are powered by Stateit signals — same reactive primitives, zero glue    |
| **Validit + Formit**  | Pass a Validit schema directly as a field validator — one schema serves both form and API |
| **Fetchit + Stateit** | Fetch remote data with caching, push results into a signal for reactive rendering         |
| **Deposit + Fetchit** | Persist query results in IndexedDB for offline-capable apps                               |
| **Permit + Routeit**  | Check permissions in router middleware before the route handler ever runs                 |
| **Wireit + Logit**    | Register a scoped logger per service in your DI container                                 |

## Philosophy

**One problem per package.** We don't build "meta-frameworks". Each package has a tight scope and does that one thing well. You pull in exactly what you need.

**TypeScript first.** Types are not bolted on after the fact. Everything is designed around inference — you rarely write a type annotation and you never reach for `as any`.

**Zero surprises.** APIs follow consistent conventions: `create*` for factories, `on*` for subscriptions, `safeParse` for fallible operations. Learn one package and the next one feels familiar.

**No magic.** No proxies chasing object mutations, no decorators, no global singletons. If you want to know what a function does, reading it is enough.
