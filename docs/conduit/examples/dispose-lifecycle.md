---
title: 'Conduit Examples — Dispose Lifecycle'
description: 'Dispose lifecycle example for @vielzeug/conduit.'
---

## Dispose Lifecycle

### Problem

Services hold external resources — database connections, file handles, open sockets — that must be released when the application shuts down or a request scope ends. Conduit needs to know about these resources to clean them up automatically.

### Solution

Attach a `dispose` hook via the `opts.dispose` parameter on `factory()` or `value()`. Call `await container.dispose()` when the scope ends and Conduit runs all hooks in parallel.

#### Factory dispose hooks

Factory `dispose` hooks fire only for instances that were resolved at least once.

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

interface Pool { end(): Promise<void> }

const DbPool = createToken<Pool>('DbPool');
const container = createContainer();

container.factory(
  DbPool,
  () => createPool({ connectionString: process.env.DATABASE_URL! }),
  { dispose: (pool) => pool.end() },
);

const pool = await container.resolve(DbPool);
await container.dispose(); // calls pool.end()
```

#### Value dispose hooks

`value()` dispose hooks always fire at disposal, regardless of whether the value was ever resolved.

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

interface Db { close(): Promise<void> }

const Db = createToken<Db>('Db');
const container = createContainer();

const db = await connectDb();
container.value(Db, db, { dispose: (db) => db.close() });

await container.dispose(); // calls db.close() even if Db was never resolved
```

#### Scoped disposal

Child containers have their own disposal lifecycle. Disposing a child runs only its scoped hooks and does not affect the parent.

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

interface ScopedCache { clear(): void }

const ScopedCache = createToken<ScopedCache>('ScopedCache');
const container = createContainer();

container.factory(
  ScopedCache,
  () => {
    const store = new Map<string, unknown>();
    return { clear: () => store.clear() };
  },
  { lifetime: 'scoped', dispose: (c) => c.clear() },
);

const child = container.createChild();
await child.resolve(ScopedCache);
await child.dispose(); // runs child's scoped hooks only; root is unaffected
```

#### Error handling

If one or more hooks throw or reject, the container still disposes fully and all errors are collected into an `AggregateError`.

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const A = createToken<object>('A');
const B = createToken<object>('B');
const container = createContainer();

container.value(A, {}, { dispose: () => { throw new Error('A cleanup failed'); } });
container.value(B, {}, { dispose: () => { throw new Error('B cleanup failed'); } });

try {
  await container.dispose();
} catch (err) {
  if (err instanceof AggregateError) {
    console.error('cleanup errors:', err.errors.map((e) => e.message));
    // ["A cleanup failed", "B cleanup failed"]
  }
}
```

### Pitfalls

- Factory dispose hooks do not fire for transient instances — transients are not cached, so there is no stored reference to call the hook on. Manage transient resource cleanup manually.
- Calling `container.dispose()` multiple times is safe — only the first call runs hooks and marks the container as disposed. Subsequent calls are no-ops.
- After `dispose()`, any `resolve()` call throws `ContainerDisposedError`. Ensure no code holds a reference to a disposed container.

### Related

- [Child Containers](./child-containers.md)
- [Async Providers](./async-providers.md)
- [Lifetimes](./lifetimes.md)
