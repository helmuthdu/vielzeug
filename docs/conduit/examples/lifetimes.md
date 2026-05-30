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
import { createContainer, createToken } from '@vielzeug/conduit';

const Counter = createToken<{ id: number }>('Counter');
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
import { createContainer, createToken } from '@vielzeug/conduit';

const RequestId = createToken<string>('RequestId');
const container = createContainer();

container.factory(RequestId, () => crypto.randomUUID(), { lifetime: 'transient' });

const id1 = await container.resolve(RequestId);
const id2 = await container.resolve(RequestId);

console.log(id1 === id2); // false — two distinct UUIDs
```

#### Scoped

One instance per child container. The factory must be resolved from a child — calling `resolve()` or `resolveSync()` on the root for a scoped token throws `ScopedResolutionError`.

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const Session = createToken<{ userId: string }>('Session');
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

### Pitfalls

- A transient factory can never be resolved synchronously with `resolveSync()` — transients are never cached. Use `resolve()` for transient providers.
- A scoped factory resolved from the root throws `ScopedResolutionError`. Call `container.createChild()` first.
- Mixing lifetimes can produce stale references: a singleton that holds a reference to a transient gets one specific instance forever. Use scoped or transient lifetimes at the singleton level when freshness matters.

### Related

- [Child Containers](./child-containers.md)
- [Sync Resolution](./sync-resolution.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
