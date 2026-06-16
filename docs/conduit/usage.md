---
title: Conduit — Usage Guide
description: How to register providers, resolve dependencies, manage lifetimes, and tear down containers with @vielzeug/conduit.
---

[[toc]]

## Basic Usage

Create a container, register providers with typed tokens, resolve dependencies, then dispose when done.

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Logger = token<{ log(message: string): void }>('Logger');
const Service = token<{ run(): Promise<void> }>('Service');

const container = createContainer();

container.value(Logger, console);
container.factory(Service, async (r) => {
  const logger = await r.resolve(Logger);
  return { run: async () => logger.log('running') };
});

const service = await container.resolve(Service);
await service.run();

await container.dispose();
```

## Tokens

Create one token per dependency contract. Tokens are unique symbols — two tokens with the same description are still distinct.

```ts
import { token } from '@vielzeug/conduit';

const Logger = token<{ log(message: string): void }>('Logger');
const Config = token<{ apiUrl: string }>('Config');
```

## Registration

Use `value()` for constants and pre-constructed instances. Use `factory()` for anything built lazily. A token can only be registered once — `DuplicateRegistrationError` is thrown on a second registration for the same token.

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Logger = token<{ log(message: string): void }>('Logger');
const Service = token<{ run(): void }>('Service');

const container = createContainer();

container.value(Logger, console);
container.factory(Service, async (r) => {
  const logger = await r.resolve(Logger);
  return { run: () => logger.log('ok') };
});
```

## Container Modules

Group related registrations into reusable modules. A `ContainerModule` is any function that registers providers on a container.

```ts
import { createContainer, token, type ContainerModule } from '@vielzeug/conduit';

const Logger = token<{ log(msg: string): void }>('Logger');
const Config = token<{ apiUrl: string }>('Config');

const loggingModule: ContainerModule = (c) => {
  c.value(Logger, console);
};

const configModule: ContainerModule = (c) => {
  c.factory(Config, async () => {
    const res = await fetch('/config.json');
    return res.json();
  });
};

const container = await loadModules(createContainer(), loggingModule, configModule);
```

Import `loadModules` from `'@vielzeug/conduit'`.

## Resolution

Call `resolve()` for a single provider. Use the free-function helpers when a missing token should not throw.

```ts
import { createContainer, token, resolveOptional, resolveOrDefault } from '@vielzeug/conduit';

const Service = token<{ run(): void }>('Service');
const Plugin = token<{ name: string }>('Plugin');
const container = createContainer();

const service = await container.resolve(Service);
const maybePlugin = await resolveOptional(container, Plugin); // undefined if not registered
const plugin = await resolveOrDefault(container, Plugin, defaultPlugin); // fallback if not registered
```

## Checking Registration

Use `has()` to test whether a token is registered without triggering the factory.

```ts
if (container.has(FeatureFlag)) {
  const flags = await container.resolve(FeatureFlag);
}
```

`has()` walks the parent chain, so child containers see parent registrations.

## Synchronous Resolution

After a container has been warmed up asynchronously, registered values and cached singleton/scoped instances can be retrieved synchronously with `resolveSync()`.

The recommended pattern is to call `resolveAll()` once at startup to pre-warm all singleton factories, then use `resolveSync()` freely in hot paths.

```ts
// Warm all singletons once during async startup
await container.resolveAll();

// Then resolve synchronously anywhere — no Promise overhead
const config = container.resolveSync(Config);
const logger = container.resolveSync(Logger);
```

`resolveSync()` throws `SyncResolutionError` for transient factories (never cached) and for unresolved singleton instances. It throws `ScopedResolutionError` when called outside a matching named-scope container. If a singleton factory previously **failed**, `resolveSync()` rethrows the original cached rejection.

> **Note:** `resolveAll()` only pre-warms `'singleton'` factories by default. Pass `{ includeScoped: true }` on a scope container to also pre-warm named-scope factories tagged to that scope. Transient factories are never pre-warmed.

Use the free-function variants when a token may not be registered:

```ts
import { resolveSyncOptional, resolveSyncOrDefault } from '@vielzeug/conduit';

await container.resolveAll();

const plugin = resolveSyncOptional(container, OptionalPlugin); // undefined if not registered
const timeout = resolveSyncOrDefault(container, RequestTimeout, 5000); // 5000 if not registered
```

Both re-throw `SyncResolutionError`, `ContainerDisposedError`, and all other errors — only `ProviderNotFoundError` is silenced.

## Lifetimes

- `'singleton'` — factory runs once; the same instance is returned on every subsequent call (default). Shared across child containers.
- `'transient'` — factory runs on every resolution; result is never cached.
- `ScopeToken` — one instance per matching named-scope container; see [Named Scopes](#named-scopes) below.

### Singleton failure behavior

If a singleton factory rejects, the rejection is cached and rethrown on every subsequent `resolve()` call. The factory is **not** silently retried. To retry, create a new container.

## Child Containers

Use `createScope()` (without a scope token) to create a plain child container that inherits parent registrations. Use it for test isolation or per-request overrides.

```ts
const child = container.createScope();
const session = await child.resolve(Session);
await child.dispose();
```

## Named Scopes

Named scopes give you explicit control over which child container owns a lifecycle. Create a `ScopeToken` with `scope()`, register factories with that token as the `lifetime`, then create scope containers with `createScope()`.

```ts
import { scope, token, createContainer } from '@vielzeug/conduit';

const RequestScope = scope('request');
const Session = token<{ id: string }>('Session');

const root = createContainer();
root.factory(Session, () => ({ id: crypto.randomUUID() }), { lifetime: RequestScope });

// Each request gets its own scope container with isolated instances
async function handleRequest() {
  const requestContainer = root.createScope(RequestScope);

  const session = await requestContainer.resolve(Session);
  // session is unique to this request scope

  await requestContainer.dispose(); // runs Session dispose hook
}
```

Resolving a named-scope factory from a container that is not a matching scope (or one of its descendants) throws `ScopedResolutionError` with the required scope name.

## Async Providers

Factories may return promises. Concurrent callers share the same in-flight singleton or scoped resolution — the factory runs exactly once even if `resolve()` is called concurrently.

```ts
container.factory(Config, async () => {
  const response = await fetch('/config.json');
  return response.json();
});
```

## Resolving Without Throwing

Use `tryResolve()` (free function) to resolve a token as a discriminated union instead of throwing:

```ts
import { tryResolve } from '@vielzeug/conduit';

const result = await tryResolve(container, OptionalPlugin);
if (result.ok) {
  result.value.init();
} else {
  console.warn('OptionalPlugin not available:', result.error);
}
```

Use `resolveMany()` to resolve multiple tokens in parallel with a typed tuple result:

```ts
const [db, cache, logger] = await container.resolveMany([Db, Cache, Logger] as const);
```

## Freezing Containers

Call `freeze()` after all registrations are complete. It validates the graph, then locks the container:

```ts
const container = createContainer({ name: 'app' });

await loadModules(container, dbModule, authModule, serviceModule);
container.freeze(); // validates + seals

// Later in application code:
container.value(SomeToken, x); // throws ContainerFrozenError: Container 'app' is frozen ...
```

`freeze()` checks that every registered token has a provider. Declare `deps` on a factory to also enable static cycle detection at freeze time:

```ts
const Logger = token<Logger>('Logger');
const Service = token<Service>('Service');

container.value(Logger, new ConsoleLogger());
container.factory(Service, (r) => new Service(r.resolve(Logger)), { deps: [Logger] });

container.freeze();
// → throws CircularDependencyError if deps form a cycle
// → throws ProviderNotFoundError if a declared dep is missing
```

> Lazy dependencies not listed in `deps:` are still caught at resolve time — declaring deps is opt-in.

## Named Containers

Assign names to containers for clearer error messages:

```ts
const root = createContainer({ name: 'root' });
const child = root.createScope(undefined, { name: 'child-42' });
const scope = root.createScope(RequestScope, { name: 'scope-42' });

// Error messages will include the container name:
// ProviderNotFoundError: No provider registered for token: MyToken (in container 'child-42')
```

## Cycle Detection

By default, cycle detection runs lazily at resolve time. To catch cycles earlier, declare `deps:` on factories and call `freeze()` — this enables static cycle detection before any resolution occurs.

## Inspecting the Container

`container.inspect()` returns a serializable graph of registered tokens. By default it traverses the full parent chain. Pass `{ deep: false }` to limit to the local registry.

```ts
const graph = container.inspect(); // deep traversal (default)
const local = container.inspect({ deep: false }); // local only

for (const node of graph.nodes) {
  console.log(`${node.description} (${node.kind}, ${node.lifetime ?? 'singleton'})`);
}
```

## Disposal

Dispose the container when its scope ends.

```ts
await container.dispose();
```

Disposal hooks are supported on both `factory()` and `value()` registrations. Factory hooks fire only when the instance was resolved at least once; value hooks always fire.

```ts
// Factory with cleanup
container.factory(DbPool, () => createPool(), {
  dispose: (pool) => pool.end(),
});

// External resource registered as a value
const db = await connectDb();
container.value(Db, db, { dispose: (db) => db.close() });

await container.dispose(); // calls both hooks
```

If any hook throws, the container still disposes fully. Failures are **warned** (dev-only) — they do not throw or reject `dispose()`.

Use the `await using` pattern (explicit resource management) to ensure disposal even on early return or thrown error:

```ts
await using container = createContainer();
// container.dispose() is called automatically at block exit
```

## Resolution Interceptors

Use `onResolve()` to register a callback fired after every successful resolution (both async and sync). Useful for telemetry, logging, and debugging.

```ts
const unsub = container.onResolve((tok, value) => {
  metrics.increment('di.resolve', { token: tok.description });
});

// Stop intercepting:
unsub();
```

Interceptor errors are swallowed — a misbehaving interceptor cannot break resolution. Interceptors propagate to parent containers.

## Observing Container Events

Subscribe to container lifecycle events with `on()` for logging, metrics, or debugging. Each event carries a `source` field containing the container name.

```ts
const unsubscribe = container.on((event) => {
  if (event.type === 'register') {
    console.log(`[${event.source}] registered ${event.description} (${event.kind})`);
  }
  if (event.type === 'resolve') {
    console.log(`[${event.source}] resolved ${event.description}`);
  }
  if (event.type === 'dispose') {
    console.log(`[${event.source}] container disposed`);
  }
});

// Stop listening:
unsubscribe();
```

Events propagate up to parent listeners. Listener errors are silently swallowed.

## Framework Integration

Conduit's container is a plain object — use it as a singleton, inject it via framework context, or scope it to a component tree.

::: code-group

```tsx [React]
import { createContext, useContext, useEffect, useState, type FC } from 'react';
import { createContainer, type Container } from '@vielzeug/conduit';

const ContainerCtx = createContext<Container | null>(null);

export const ContainerProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [container] = useState(() => createContainer());
  useEffect(
    () => () => {
      container.dispose();
    },
    [container],
  );
  return <ContainerCtx.Provider value={container}>{children}</ContainerCtx.Provider>;
};

export function useContainer(): Container {
  const c = useContext(ContainerCtx);
  if (!c) throw new Error('useContainer must be used within ContainerProvider');
  return c;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createContainer, type Container } from '@vielzeug/conduit';
import { provide, inject, onScopeDispose } from 'vue';

// In root component (App.vue):
const container = createContainer();
provide('container', container);
onScopeDispose(() => container.dispose());

// In child components:
const container = inject<Container>('container')!;
const repo = await container.resolve(UserRepo);
</script>
```

```svelte [Svelte]
<script lang="ts">
  import { createContainer, type Container } from '@vielzeug/conduit';
  import { setContext, getContext, onDestroy } from 'svelte';

  // Root component:
  const container = createContainer();
  setContext('container', container);
  onDestroy(() => container.dispose());
</script>
```

:::

## Working with Other Vielzeug Libraries

### With Rune

Inject a shared logger into all services.

```ts
import { createContainer, token } from '@vielzeug/conduit';
import { createLogger } from '@vielzeug/rune';

const Logger = token<ReturnType<typeof createLogger>>('Logger');
const container = createContainer();

container.factory(Logger, () => createLogger({ level: 'debug', prefix: 'app' }));
```

### With Herald

Register an event bus and inject it into services that emit or subscribe.

```ts
import { createContainer, token } from '@vielzeug/conduit';
import { type Bus, createBus } from '@vielzeug/herald';

const EventBus = token<Bus>('EventBus');
const container = createContainer();

container.factory(EventBus, () => createBus(), { dispose: (bus) => bus.clear() });

const NotificationService = token<{ notify(msg: string): void }>('NotificationService');

container.factory(NotificationService, async (r) => {
  const bus = await r.resolve(EventBus);
  return { notify: (msg) => bus.emit('notification', msg) };
});
```

## Best Practices

- Register all providers at startup before any resolution begins.
- Group registrations into `ContainerModule` functions. Use `loadModules()` for sequential async setup.
- Call `freeze()` after all modules are loaded — it validates the graph and locks the container in one step.
- Declare `deps:` on factories to enable static cycle detection at `freeze()` time.
- Use `resolveAll()` once at startup, then `resolveSync()` in hot paths.
- Use `tryResolve()` when optional providers are expected to be absent; use `resolveOptional()` for one-off nullable checks; use `resolveOrDefault()` when a concrete fallback value is available.
- In hot paths after `resolveAll()`, prefer `resolveSyncOptional()` or `resolveSyncOrDefault()` over wrapping `resolveSync()` in try/catch.
- Use `resolveMany()` to resolve multiple well-known providers at startup in parallel.
- Use `onResolve()` for observability (telemetry, logging) rather than coupling resolution paths to event parsing.
- Scope named-scope containers to request or component lifetimes — dispose them with the scope.
- Attach `dispose` hooks to both factory and value registrations for external resources that need cleanup.
- Call `container.dispose()` during app teardown to invoke all registered cleanup hooks.
