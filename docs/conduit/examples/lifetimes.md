---
title: 'Conduit Examples — Lifetimes'
description: 'Lifetimes example for @vielzeug/conduit.'
---

## Lifetimes

### Problem

Different dependencies have different caching requirements: some should be shared across the whole application, some need a fresh copy every time, and some should be isolated to a request or session scope.

### Solution

Set `lifetime` in `factory()` options to control when Conduit creates a new instance. The default is `'singleton'`.

#### Singleton

The factory runs once. Every subsequent call returns the same instance.

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Counter = token<{ id: number }>('Counter');
let nextId = 0;

const container = createContainer();

// 'singleton' is the default — explicit here for clarity
container.factory(Counter, () => ({ id: ++nextId }), { lifetime: 'singleton' });

const a = await container.resolve(Counter);
const b = await container.resolve(Counter);

console.log(a === b); // true
console.log(nextId); // 1 — factory ran once
```

#### Transient

The factory runs on every resolution. The result is never cached.

```ts
import { createContainer, token } from '@vielzeug/conduit';

const RequestId = token<string>('RequestId');
const container = createContainer();

container.factory(RequestId, () => crypto.randomUUID(), { lifetime: 'transient' });

const id1 = await container.resolve(RequestId);
const id2 = await container.resolve(RequestId);

console.log(id1 === id2); // false — two distinct UUIDs
```

#### Named Scope

One instance per scope container created with a specific `ScopeToken`. Use `scope()` to create the token and `createScope(scopeToken)` to create the matching container.

```ts
import { createContainer, scope, token } from '@vielzeug/conduit';

const RequestScope = scope('request');
const RequestId = token<string>('RequestId');
const container = createContainer();

container.factory(RequestId, () => crypto.randomUUID(), { lifetime: RequestScope });

// Resolving from the root or a plain child throws ScopedResolutionError
// Resolving from a matching scope container creates one instance per scope
const scopeA = container.createScope(RequestScope);
const scopeB = container.createScope(RequestScope);

const idA = await scopeA.resolve(RequestId);
const idB = await scopeB.resolve(RequestId);

console.log(idA === idB); // false — each scope has its own instance
console.log((await scopeA.resolve(RequestId)) === idA); // true — same scope, same instance
```

### Pitfalls

- A transient factory can never be resolved synchronously with `resolveSync()` — transients are never cached. Use `resolve()` for transient providers.
- A named-scope factory resolved outside a matching scope container throws `ScopedResolutionError`.
- Mixing lifetimes can produce stale references: a singleton that holds a reference to a transient gets one specific instance forever. Use named-scope or transient lifetimes at the singleton level when freshness matters.

### Related

- [Named Scopes](./named-scopes.md)
- [Child Containers](./child-containers.md)
- [Sync Resolution](./sync-resolution.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
