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

console.log(a === b);   // true
console.log(nextId);    // 1 — factory ran once
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

#### Scoped

One instance per child container. The factory must be resolved from a child — calling `resolve()` or `resolveSync()` on the root for a scoped token throws `ScopedResolutionError`.

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Session = token<{ userId: string }>('Session');
const container = createContainer();

container.factory(Session, () => ({ userId: crypto.randomUUID() }), { lifetime: 'scoped' });

const childA = container.createChild();
const childB = container.createChild();

const s1 = await childA.resolve(Session);
const s2 = await childA.resolve(Session);
const s3 = await childB.resolve(Session);

console.log(s1 === s2); // true  — same child scope
console.log(s1 === s3); // false — different child scopes
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
console.log(await scopeA.resolve(RequestId) === idA); // true — same scope, same instance
```

### Pitfalls

- A transient factory can never be resolved synchronously with `resolveSync()` — transients are never cached. Use `resolve()` for transient providers.
- A scoped factory resolved from the root throws `ScopedResolutionError`. Call `container.createChild()` first.
- Mixing lifetimes can produce stale references: a singleton that holds a reference to a transient gets one specific instance forever. Use scoped or transient lifetimes at the singleton level when freshness matters.

### Related

- [Named Scopes](./multi-providers.md)
- [Child Containers](./child-containers.md)
- [Sync Resolution](./sync-resolution.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
