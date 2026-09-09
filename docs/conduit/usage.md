---
title: Conduit — Usage Guide
description: Register an immutable provider array, resolve a typed service object at composition roots, create scopes, and dispose owned resources.
---

[[toc]]

## Basic Usage

Create tokens once, build a container from an immutable provider array, then resolve a typed service object at your composition root.

```ts
import { createContainer, factoryProvider, token, valueProvider } from '@vielzeug/conduit';

const Config = token<{ baseUrl: string }>('Config');
const Client = token<{ url: string }>('Client');

const container = createContainer([
  valueProvider(Config, { baseUrl: '/api' }),
  factoryProvider(Client, [Config], (config) => ({ url: `${config.baseUrl}/users` })),
]);

const services = await container.resolve({ config: Config, client: Client });
console.log(services.client);
await container.dispose();
```

## Define Dependencies

Factory `dependencies` tuples are authoritative. Conduit resolves tuple values in order, validates every edge at construction, and disposes created services in reverse dependency order.

```ts
const Logger = token<{ info(message: string): void }>('Logger');
const Api = token<{ get(path: string): Promise<unknown> }>('Api');
const Service = token<{ load(): Promise<unknown> }>('Service');

const container = createContainer([
  valueProvider(Logger, { info: (message) => console.log(message) }),
  factoryProvider(Api, [], () => ({ get: async (path: string) => fetch(path) })),
  factoryProvider(Service, [Api, Logger], (api, logger) => ({
    async load() {
      logger.info('Loading data');
      return api.get('/data');
    },
  })),
]);
```

## Choose Lifetimes

Factories are singletons by default and cached on the registering container. Concurrent singleton resolutions share one in-flight attempt; a rejected attempt is evicted for retry. Use `'transient'` for one value per resolution or a `ScopeToken` for request, job, or test ownership. Singletons cannot depend on transient or scoped factories, and one named scope cannot depend on another.

```ts
import { createContainer, factoryProvider, scope, token } from '@vielzeug/conduit';

const Request = scope('request');
const Session = token<{ id: string }>('Session');

const root = createContainer([
  factoryProvider(Session, [], () => ({ id: crypto.randomUUID() }), { lifetime: Request }),
]);
```

Factory dependency tuples are copied at construction, so later caller mutation cannot change Conduit's graph. Add `disposalSignalToken` to a factory tuple when work must observe its owning container or scope cancellation.

## Create Named Scopes

Use a scope token when a resource belongs to a request, job, or test lifecycle. Pass immutable local providers through `createScope()` options to override parent registrations.

```ts
const TraceId = token<string>('TraceId');
const request = root.createScope(Request, {
  providers: [valueProvider(TraceId, 'request-trace')],
});
const services = await request.resolve({ session: Session });
await request.dispose();
await root.dispose();
```

Resolving `Session` from `root` throws `ConduitScopedResolutionError` because no matching scope owns it.

## Resolve at Composition Roots

Resolve a map at composition roots to receive an explicitly typed service object. Direct `resolve(token)` remains available for one root service and focused tests; avoid scattering service-locator calls through application code.

```ts
const client = await container.resolve(Client);
const services = await container.resolve({ client: Client, config: Config });
// Both results are fully typed.
```

## Dispose Resources

`dispose()` rejects new work, aborts `disposalSignal`, disposes child scopes, waits for in-flight creation, then releases services in reverse creation order. A factory that finishes after disposal starts is immediately cleaned up and its resolver receives `ConduitDisposedError`.

```ts
await container.dispose();
```

`ConduitDisposeError.errors` contains every cleanup failure after Conduit attempts all hooks, including cleanup from in-flight factories and child scopes.

## Testing

Build a container per test with explicit values for external dependencies. Because the provider array is immutable and validated at construction, a misconfigured test container fails immediately.

```ts
const Clock = token<{ now(): number }>('Clock');
const Service = token<{ timestamp: number }>('Service');

const container = createContainer([
  valueProvider(Clock, { now: () => 123 }),
  factoryProvider(Service, [Clock], (clock) => ({ timestamp: clock.now() })),
]);

const services = await container.resolve({ service: Service });
expect(services.service).toEqual({ timestamp: 123 });
await container.dispose();
```

## Best Practices

- Create tokens at module scope.
- Use `valueProvider()` and `factoryProvider()` so tokens, values, dependencies, and disposers remain type-safe.
- Declare every factory dependency in its tuple.
- Keep factories focused on one service.
- Use scopes for request/job-owned resources.
- Resolve once at a composition root; pass the typed service object downstream.
- Dispose every scope and root container.
- Keep optional application fallback policy outside Conduit.
- Use `await using container = createContainer([...])` when lexical async disposal fits application lifetime.
