---
title: Wireit Usage Guide
description: Practical usage patterns for the Wireit container.
---

[[toc]]

## Tokens

Create one token per dependency contract.

```ts
const Logger = createToken<{ log(message: string): void }>('Logger');
```

## Registration

Use `value()` for constants and `factory()` for computed values.

```ts
container.value(Logger, console);
container.factory(Service, (logger) => new ServiceImpl(logger), { deps: [Logger] });
```

## Resolution

Call `resolve()` for a single provider and `resolveOptional()` when a missing provider should not throw.

```ts
const service = await container.resolve(Service);
const maybeLogger = await container.resolveOptional(Logger);
```

`resolveMany()` is for multi-provider tokens.

```ts
container.value(Plugin, firstPlugin, { multi: true });
container.value(Plugin, secondPlugin, { multi: true });

const plugins = await container.resolveMany(Plugin);
```

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

Resolved instances with `dispose()` hooks are cleaned up during disposal.

## Framework Integration

Wireit's container is a plain class — use it as a singleton, inject it via framework context, or scope it to a component tree.

::: code-group

```tsx [React]
import { createContext, useContext, useEffect, useState, type FC } from 'react';
import { Container } from '@vielzeug/wireit';

const ContainerCtx = createContext<Container | null>(null);

export const ContainerProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [container] = useState(() => new Container());
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
import { Container } from '@vielzeug/wireit';
import { provide, inject, onScopeDispose } from 'vue';

// In root component (App.vue):
const container = new Container();
provide('container', container);
onScopeDispose(() => container.dispose());

// In child components:
const container = inject<Container>('container')!;
const repo = await container.resolve(UserRepo);
</script>
```

```svelte [Svelte]
<script lang="ts">
  import { Container } from '@vielzeug/wireit';
  import { setContext, getContext, onDestroy } from 'svelte';

  // Root component:
  const container = new Container();
  setContext('container', container);
  onDestroy(() => container.dispose());
</script>
```

:::

## Working with Other Vielzeug Libraries

### With Logit

Inject a shared logger into all services by registering it as a singleton.

```ts
import { Container } from '@vielzeug/wireit';
import { createLogger } from '@vielzeug/logit';

const container = new Container();
container.singleton(Logger, () => createLogger({ level: 'debug', prefix: 'app' }));

// Every service that depends on Logger receives the same instance.
const service = await container.resolve(ApiService);
```

### With Eventit

Register an event bus in the container and inject it into services that emit or subscribe.

```ts
import { Container } from '@vielzeug/wireit';
import { createBus } from '@vielzeug/eventit';

const container = new Container();
container.singleton(EventBus, () => createBus());

class NotificationService {
  constructor(private bus = container.resolve(EventBus)) {}
  notify(msg: string) { this.bus.emit('notification', msg); }
}
```

## Best Practices

- Register all singletons at startup and avoid calling `container.resolve()` in hot render paths.
- Use `container.factory()` for services with async initialization (config loading, DB connections).
- Scope child containers to component trees or request lifetimes — dispose them with the scope.
- Keep tokens (classes or Symbols) as the source of truth; avoid string-keyed registrations.
- Call `container.dispose()` during app teardown to invoke all registered cleanup hooks.
