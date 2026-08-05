---
title: Conduit — Usage Guide
description: Register static dependency tuples, resolve services asynchronously, create scopes, validate startup wiring, and dispose owned resources.
---

[[toc]]

## Basic Usage

Create tokens once, register values and factories, then resolve through one async API.

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Config = token<{ baseUrl: string }>('Config');
const Client = token<{ url: string }>('Client');

const container = createContainer();
container.value(Config, { baseUrl: '/api' });
container.factory(Client, [Config], (config) => ({ url: `${config.baseUrl}/users` }));

console.log(await container.resolve(Client));
await container.dispose();
```

## Define Dependencies

Factory token tuples are authoritative. Conduit resolves tuple values in order, validates every edge, and disposes created services in reverse dependency order.

```ts
const Logger = token<{ info(message: string): void }>('Logger');
const Api = token<{ get(path: string): Promise<unknown> }>('Api');
const Service = token<{ load(): Promise<unknown> }>('Service');

container.factory(Service, [Api, Logger], (api, logger) => ({
  async load() {
    logger.info('Loading data');
    return api.get('/data');
  },
}));
```

## Choose Lifetimes

Factories are singletons by default. Use transient lifetime for a new value on every resolution. Conduit retains a transient only when its factory has a `dispose` hook.

```ts
const RequestId = token<{ id: string }>('RequestId');

container.factory(RequestId, [], () => ({ id: crypto.randomUUID() }), {
  lifetime: 'transient',
});
```

Concurrent singleton resolutions share one in-flight factory result. A singleton cannot depend on a scoped resource; give dependent factory equal-or-shorter lifetime instead. Factory dependency tuples are copied at registration, so later caller mutation cannot change Conduit's graph.

## Create Named Scopes

Use a scope token when a resource belongs to a request, job, or test lifecycle.

```ts
import { createContainer, scope, token } from '@vielzeug/conduit';

const Request = scope('request');
const Session = token<{ id: string }>('Session');
const root = createContainer();

root.factory(Session, [], () => ({ id: crypto.randomUUID() }), { lifetime: Request });

const request = root.createScope(Request);
const session = await request.resolve(Session);
await request.dispose();
await root.dispose();
```

## Validate Startup Wiring

Call `validate()` after registration. It detects missing dependencies and cycles before service resolution. Parent singleton factories validate dependencies from their registration owner; child overrides do not satisfy them.

```ts
container.validate();
```

## Dispose Resources

`dispose()` rejects new work, aborts `disposalSignal`, disposes child scopes, waits for in-flight creation, then releases services in reverse creation order. A factory that finishes after disposal starts is immediately cleaned up and its resolver receives `ConduitDisposedError`.

```ts
await container.dispose();
```

`ConduitDisposeError.errors` contains every cleanup failure after Conduit attempts all hooks, including cleanup from in-flight factories and child scopes.

## Testing

Create a container per test and register explicit values for external dependencies.

```ts
const Clock = token<{ now(): number }>('Clock');
const Service = token<{ timestamp: number }>('Service');
const container = createContainer();

container.value(Clock, { now: () => 123 });
container.factory(Service, [Clock], (clock) => ({ timestamp: clock.now() }));

expect(await container.resolve(Service)).toEqual({ timestamp: 123 });
await container.dispose();
```

## Best Practices

- Create tokens at module scope.
- Declare every factory dependency in its tuple.
- Keep factories focused on one service.
- Use scopes for request/job-owned resources.
- Call `validate()` during startup.
- Dispose every scope and root container.
- Keep optional application fallback policy outside Conduit.
- Use `await using container = createContainer()` when lexical async disposal fits application lifetime.
