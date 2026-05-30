---
title: 'Conduit Examples — Async Providers'
description: 'Async providers example for @vielzeug/conduit.'
---

## Async Providers

### Problem

A dependency requires asynchronous initialization — fetching remote configuration, opening a database connection, or loading a module. Multiple parts of the application need the same initialized instance.

### Solution

Return a `Promise` from the `factory()` callback. Conduit awaits it automatically. Concurrent callers for singleton and scoped lifetimes share the same in-flight promise, so the work runs exactly once.

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

interface Config {
  baseUrl: string;
  timeout: number;
}

const Config = createToken<Config>('Config');

const container = createContainer();

container.factory(Config, async () => {
  const response = await fetch('/config.json');
  return response.json() as Config;
});

// Two concurrent callers — the fetch runs once
const [a, b] = await Promise.all([container.resolve(Config), container.resolve(Config)]);
// a === b (same instance)
```

#### Async factory with a dependency

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

interface Logger { log(msg: string): void }
interface DbPool { query(sql: string): Promise<unknown[]> }

const Logger = createToken<Logger>('Logger');
const Db = createToken<DbPool>('Db');

const container = createContainer();

container.value(Logger, console);

container.factory(
  Db,
  async (logger) => {
    logger.log('connecting to database…');
    const pool = await createPool(process.env.DATABASE_URL!);
    logger.log('connected');
    return pool;
  },
  { deps: [Logger], dispose: (pool) => pool.end() },
);

const db = await container.resolve(Db);
```

### Pitfalls

- Async factories whose promise rejects will cause `resolve()` to reject with the factory's error. The singleton promise is not cached when it rejects — a subsequent `resolve()` call will retry the factory.
- Calling `resolveSync()` on an async factory before it has been resolved at least once throws `SyncResolutionError`. Warm up the factory with `await container.resolve()` first.

### Related

- [Basic Setup](./basic-setup.md)
- [Sync Resolution](./sync-resolution.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
