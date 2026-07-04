---
title: 'Conduit Examples — Sync Resolution'
description: 'Sync resolution example for @vielzeug/conduit.'
---

## Sync Resolution

### Problem

Hot code paths — render loops, event handlers, request routers — cannot await a `Promise` each time they need a dependency. After application startup, the container holds pre-built instances that should be accessible synchronously without the `Promise` overhead.

### Solution

Use `container.resolveSync()` after warming up the container asynchronously. `resolveSync()` returns a cached value or instance immediately for value registrations and resolved singleton/scoped factories.

```ts
import { createContainer, token } from '@vielzeug/conduit';

interface Config {
  apiUrl: string;
  timeout: number;
}
interface Logger {
  log(msg: string): void;
}

const Config = token<Config>('Config');
const Logger = token<Logger>('Logger');

const container = createContainer();

container.value(Logger, console);
container.factory(Config, async () => {
  const res = await fetch('/config.json');
  return res.json() as Config;
});

// Async startup — warm up every provider that will be used synchronously
await container.resolve(Config);

// Hot path — no Promise, no await
const config = container.resolveSync(Config); // cached singleton
const logger = container.resolveSync(Logger); // value: always available
logger.log(`connecting to ${config.apiUrl}`);
```

#### Guarding optional integrations

Combine `has()` with `resolveSync()` when an integration is optional.

```ts
import { createContainer, token } from '@vielzeug/conduit';

interface Telemetry {
  track(event: string, data?: Record<string, unknown>): void;
}

const Telemetry = token<Telemetry>('Telemetry');
const container = createContainer();

// Telemetry registered only in production builds
if (process.env.NODE_ENV === 'production') {
  container.value(Telemetry, initTelemetry());
}

// Safe to call in any environment — no throw when absent
if (container.has(Telemetry)) {
  const telemetry = container.resolveSync(Telemetry);
  telemetry.track('page-view', { path: window.location.pathname });
}
```

#### Handling errors

```ts
import {
  createContainer,
  scope,
  token,
  ConduitScopedResolutionError,
  ConduitSyncResolutionError,
} from '@vielzeug/conduit';

const Heavy = token<object>('Heavy');
const Id = token<string>('Id');
const RequestScope = scope('request');
const Session = token<object>('Session');
const container = createContainer();

container.factory(Heavy, async () => loadHeavyModule());
container.factory(Id, () => crypto.randomUUID(), { lifetime: 'transient' });
container.factory(Session, () => ({}), { lifetime: RequestScope });

try {
  container.resolveSync(Heavy); // throws ConduitSyncResolutionError — not yet resolved
} catch (err) {
  if (err instanceof ConduitSyncResolutionError) {
    console.error(err.message);
    // "the instance has not been resolved yet; call await container.resolve() first"
  }
}

try {
  container.resolveSync(Id); // throws ConduitSyncResolutionError — transients are never cached
} catch (err) {
  if (err instanceof ConduitSyncResolutionError) {
    console.error(err.message); // "transient factories are never cached"
  }
}

try {
  container.resolveSync(Session); // throws ConduitScopedResolutionError — must use a scope container
} catch (err) {
  if (err instanceof ConduitScopedResolutionError) {
    console.error('use container.createScope(RequestScope) for named-scope tokens');
  }
}
```

### Pitfalls

- `resolveSync()` on a transient factory always throws `ConduitSyncResolutionError` — transient results are never cached, so there is nothing to return synchronously.
- Calling `resolveSync()` before `await container.resolve()` for a singleton that has an async factory throws `ConduitSyncResolutionError`. The warm-up call must complete before the sync path is entered.
- `resolveSync()` on a named-scope token called outside a matching scope container throws `ConduitScopedResolutionError`. Call `resolveSync()` on the scope container after resolving the scoped token there.

### Related

- [Async Providers](./async-providers.md)
- [Child Containers](./child-containers.md)
- [Lifetimes](./lifetimes.md)
