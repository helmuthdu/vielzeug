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
import { createContainer, token } from '@vielzeug/conduit';

interface Pool {
  end(): Promise<void>;
}

const DbPool = token<Pool>('DbPool');
const container = createContainer();

container.factory(DbPool, () => createPool({ connectionString: process.env.DATABASE_URL! }), {
  dispose: (pool) => pool.end(),
});

const pool = await container.resolve(DbPool);
await container.dispose(); // calls pool.end()
```

#### Value dispose hooks

`value()` dispose hooks always fire at disposal, regardless of whether the value was ever resolved.

```ts
import { createContainer, token } from '@vielzeug/conduit';

interface Db {
  close(): Promise<void>;
}

const Db = token<Db>('Db');
const container = createContainer();

const db = await connectDb();
container.value(Db, db, { dispose: (db) => db.close() });

await container.dispose(); // calls db.close() even if Db was never resolved
```

#### Scoped disposal

Child containers (created with `createScope()`) have their own disposal lifecycle. Disposing a child runs only the hooks owned by that child — either plain child registrations, or named-scope instances cached on it — and does not affect the parent.

```ts
import { createContainer, scope, token } from '@vielzeug/conduit';

interface ScopedCache {
  clear(): void;
}

const RequestScope = scope('request');
const ScopedCache = token<ScopedCache>('ScopedCache');
const container = createContainer();

container.factory(
  ScopedCache,
  () => {
    const store = new Map<string, unknown>();
    return { clear: () => store.clear() };
  },
  { lifetime: RequestScope, dispose: (c) => c.clear() },
);

const requestContainer = container.createScope(RequestScope);
await requestContainer.resolve(ScopedCache);
await requestContainer.dispose(); // runs the request scope's hooks only; root is unaffected
```

#### Error handling

If one or more hooks throw or reject, the container still disposes fully — `dispose()` never rejects because of a hook failure. Each failure is logged individually (via the internal dev-logging layer) rather than being collected and rethrown.

```ts
import { createContainer, token } from '@vielzeug/conduit';

const A = token<object>('A');
const B = token<object>('B');
const container = createContainer();

container.value(
  A,
  {},
  {
    dispose: () => {
      throw new Error('A cleanup failed');
    },
  },
);
container.value(
  B,
  {},
  {
    dispose: () => {
      throw new Error('B cleanup failed');
    },
  },
);

await container.dispose(); // resolves normally — both hooks ran despite A's failure
console.log(container.disposed); // true
// Dev builds log each failure individually:
// [@vielzeug/conduit] dispose hook failed in container 'root': Error: A cleanup failed
```

### Pitfalls

- Factory dispose hooks do not fire for transient instances — transients are not cached, so there is no stored reference to call the hook on. Manage transient resource cleanup manually.
- Calling `container.dispose()` multiple times is safe — only the first call runs hooks and marks the container as disposed. Subsequent calls are no-ops.
- After `dispose()`, any `resolve()` call throws `ConduitDisposedError`. Ensure no code holds a reference to a disposed container.

### Related

- [Child Containers](./child-containers.md)
- [Async Providers](./async-providers.md)
- [Lifetimes](./lifetimes.md)
