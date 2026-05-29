---
title: Wired — Usage Guide
description: How to register providers, resolve dependencies, manage lifetimes, and tear down containers with @vielzeug/wired.
---

[[toc]]

## Basic Usage

Create a container, register providers with typed tokens, resolve dependencies, then dispose when done.

```ts
import { createContainer, createToken } from '@vielzeug/wired';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Service = createToken<{ run(): Promise<void> }>('Service');

const container = createContainer();

container.value(Logger, console);
container.factory(
  Service,
  (logger) => ({ run: async () => logger.log('running') }),
  { deps: [Logger] },
);

const service = await container.resolve(Service);
await service.run();

await container.dispose();
```

## Tokens

Create one token per dependency contract. Tokens are unique symbols — two tokens with the same description are still distinct.

```ts
import { createToken } from '@vielzeug/wired';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Config = createToken<{ apiUrl: string }>('Config');
```

## Registration

Use `value()` for constants and pre-constructed instances. Use `factory()` for anything built lazily.

```ts
import { createContainer, createToken } from '@vielzeug/wired';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Service = createToken<{ run(): void }>('Service');

const container = createContainer();

container.value(Logger, console);
container.factory(Service, (logger) => ({ run: () => logger.log('ok') }), { deps: [Logger] });
```

## Resolution

Call `resolve()` for a single provider. Use `resolveOptional()` when a missing token should return `undefined` rather than throw.

```ts
import { createContainer, createToken } from '@vielzeug/wired';

const Service = createToken<{ run(): void }>('Service');
const Plugin = createToken<{ name: string }>('Plugin');
const container = createContainer();

const service = await container.resolve(Service);
const maybePlugin = await container.resolveOptional(Plugin); // undefined if not registered
```

Use `resolveMany()` for multi-provider tokens.

```ts
container.value(Plugin, { name: 'first' }, { multi: true });
container.value(Plugin, { name: 'second' }, { multi: true });

const plugins = await container.resolveMany(Plugin); // [{ name: 'first' }, { name: 'second' }]
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

```ts
// During startup — async warm-up
await container.resolve(Config);
await container.resolve(Logger);

// Later, in hot paths — no Promise overhead
const config = container.resolveSync(Config);
const logger = container.resolveSync(Logger);
```

`resolveSync()` throws `SyncResolutionError` for transient factories (which are never cached) and for any singleton or scoped factory that has not been resolved at least once. It throws `ScopedResolutionError` when called on the root container for a scoped token.

## Lifetimes

- `singleton` caches the first resolved instance.
- `transient` creates a fresh instance every time.
- `scoped` caches once per child container.

Scoped providers must be resolved from a child container.

```ts
container.factory(RequestState, () => ({ id: crypto.randomUUID() }), {
  lifetime: 'scoped',
});
```

## Child Containers

Use `createChild()` when you need a request, job, or test scope.

```ts
const child = container.createChild();
const value = await child.resolve(Service);
```

## Async Providers

Factories may return promises. Concurrent callers share the same in-flight singleton or scoped resolution.

```ts
container.factory(Config, async () => {
  const response = await fetch('/config.json');

  return response.json();
});
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

If any hook throws, the container still disposes fully and the errors are collected into an `AggregateError`.

## Framework Integration

Wired's container is a plain class — use it as a singleton, inject it via framework context, or scope it to a component tree.

::: code-group

```tsx [React]
import { createContext, useContext, useEffect, useState, type FC } from 'react';
import { createContainer, type Container } from '@vielzeug/wired';

const ContainerCtx = createContext<Container | null>(null);

export const ContainerProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [container] = useState(() => createContainer());
  useEffect(() => () => { container.dispose(); }, [container]);
  return <ContainerCtx.Provider value={container}>{children}</ContainerCtx.Provider>;
};

export function useContainer(): Container {
  const c = useContext(ContainerCtx);
  if (!c) throw new Error('useContainer must be used within ContainerProvider');
  return c;
}

// In a component:
function UserService() {
  const container = useContainer();
  const [user, setUser] = useState<string | null>(null);
  useEffect(() => {
    container.resolve(UserRepo).then((repo) => repo.getCurrent().then(setUser));
  }, [container]);
  return <span>{user}</span>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createContainer, type Container } from '@vielzeug/wired';
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
  import { createContainer, type Container } from '@vielzeug/wired';
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

Inject a shared logger into all services by registering it as a singleton.

```ts
import { createContainer, createToken } from '@vielzeug/wired';
import { createLogger } from '@vielzeug/rune';

const Logger = createToken<ReturnType<typeof createLogger>>('Logger');
const container = createContainer();

container.factory(Logger, () => createLogger({ level: 'debug', prefix: 'app' }));

// Every service that depends on Logger receives the same instance.
const service = await container.resolve(ApiService);
```

### With Relay

Register an event bus in the container and inject it into services that emit or subscribe.

```ts
import { createContainer, createToken } from '@vielzeug/wired';
import { type Bus, createBus } from '@vielzeug/relay';

const EventBus = createToken<Bus>('EventBus');
const container = createContainer();

container.factory(EventBus, () => createBus(), { dispose: (bus) => bus.clear() });

const NotificationService = createToken<{ notify(msg: string): void }>('NotificationService');

container.factory(
  NotificationService,
  (bus) => ({ notify: (msg) => bus.emit('notification', msg) }),
  { deps: [EventBus] },
);
```

## Best Practices

- Register all providers at startup before any resolution begins.
- Use `container.factory()` for services with async initialization (config loading, DB connections).
- Use `resolveSync()` in hot paths after a startup warm-up phase — not as a substitute for `resolve()`.
- Use `has()` to guard optional integrations instead of `resolveOptional()` when you don't need the instance.
- Scope child containers to component trees or request lifetimes — dispose them with the scope.
- Attach `dispose` hooks to both factory and value registrations for external resources that need cleanup.
- Call `container.dispose()` during app teardown to invoke all registered cleanup hooks.
