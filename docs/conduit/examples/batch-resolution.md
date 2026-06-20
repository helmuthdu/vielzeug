---
title: 'Conduit Examples — Batch Resolution'
description: 'Batch resolution example for @vielzeug/conduit.'
---

## Batch Resolution

### Problem

Application startup requires several independent services to be initialized in parallel. Resolving them sequentially wastes time when the services have no interdependency.

### Solution

Use `container.resolveMany()` to resolve multiple tokens concurrently and get a typed tuple back in one call.

#### Parallel resolution with resolveMany

```ts
import { createContainer, token } from '@vielzeug/conduit';

interface Logger {
  log(msg: string): void;
}
interface Config {
  apiUrl: string;
}
interface Metrics {
  record(event: string): void;
}

const Logger = token<Logger>('Logger');
const Config = token<Config>('Config');
const Metrics = token<Metrics>('Metrics');

const container = createContainer();

container.value(Logger, console);
container.factory(Config, async () => fetch('/config.json').then((r) => r.json()));
container.factory(Metrics, async () => initMetrics());

// All three initialize concurrently; result is a typed tuple
const [logger, config, metrics] = await container.resolveMany([Logger, Config, Metrics] as const);
```

#### Parallel resolution with Promise.all

Use `Promise.all` when you need per-token error handling or conditional resolution.

```ts
import { createContainer, token, tryResolve } from '@vielzeug/conduit';

interface Cache {
  get(key: string): unknown;
}

const Logger = token<{ log(msg: string): void }>('Logger');
const Cache = token<Cache>('Cache');

const container = createContainer();
container.value(Logger, console);
container.factory(Cache, async () => connectCache());

// Wrap individual calls when partial failure is acceptable
const [logger, cacheResult] = await Promise.all([container.resolve(Logger), tryResolve(container, Cache)]);

if (cacheResult.ok) {
  logger.log(`Cache connected`);
} else {
  logger.log('Cache unavailable — running without cache');
}
```

### Pitfalls

- `resolveMany()` rejects if **any** token fails — it uses `Promise.all` semantics. Use `tryResolve()` on individual tokens when partial failure is acceptable.
- `resolveMany()` takes an **array of distinct tokens** (`[T1, T2, T3] as const`) and returns a typed tuple. It is not for resolving multiple implementations of the same token.

### Related

- [Async Providers](./async-providers.md)
- [Sync Resolution](./sync-resolution.md)
- [Basic Setup](./basic-setup.md)
