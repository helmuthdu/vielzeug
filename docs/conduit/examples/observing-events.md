---
title: 'Conduit Examples — Observing Events'
description: 'Event observation example for @vielzeug/conduit — logging, metrics, and debugging with on().'
---

## Observing Events

### Problem

You need visibility into what the container is doing at runtime — which providers are registered, when they are resolved, and when the container is torn down. This is useful for logging, performance metrics, and debugging unexpected resolution behaviour.

### Solution

Use `container.on(listener)` to subscribe to lifecycle events. The listener receives events synchronously as they happen. Call the returned unsubscribe function to stop observing.

#### Logging all container activity

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Logger = token<{ log(msg: string): void }>('Logger');
const Config = token<{ apiUrl: string }>('Config');

const container = createContainer({ name: 'app' });

const unsubscribe = container.on((event) => {
  switch (event.type) {
    case 'register':
      console.log(`[di:register] ${event.description} (${event.kind})`);
      break;
    case 'resolve':
      console.log(`[di:resolve]  ${event.description}`);
      break;
    case 'dispose':
      console.log('[di:dispose]  container disposed');
      break;
  }
});

container.value(Logger, console);
// → [di:register] Logger (value)

container.factory(Config, async () => ({ apiUrl: 'https://api.example.com' }));
// → [di:register] Config (factory)

await container.resolve(Config);
// → [di:resolve]  Config

await container.dispose();
// → [di:dispose]  container disposed

unsubscribe(); // stop observing
```

#### Collecting metrics

```ts
import { createContainer, token } from '@vielzeug/conduit';

const resolveCounts = new Map<string, number>();

const container = createContainer();

container.on((event) => {
  if (event.type === 'resolve') {
    resolveCounts.set(event.description, (resolveCounts.get(event.description) ?? 0) + 1);
  }
});

const Config = token<object>('Config');
container.value(Config, {});

await container.resolve(Config);
await container.resolve(Config);

console.log(resolveCounts.get('Config')); // 2
```

#### Observing child container events from the root

Events propagate up the container hierarchy. A listener on the root container observes events from all child and scope containers.

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Session = token<{ id: string }>('Session');

const root = createContainer({ name: 'root' });
const events: string[] = [];

root.on((e) => {
  if (e.type === 'resolve') events.push(e.description);
});

root.factory(Session, () => ({ id: crypto.randomUUID() }), { lifetime: 'scoped' });

const child = root.createChild({ name: 'request-1' });
await child.resolve(Session);

console.log(events); // ['Session'] — observed from the root listener
```

### Pitfalls

- Errors thrown inside an `on()` listener are **silently swallowed** — they do not propagate to the caller and do not interrupt container operation. Keep listeners side-effect-free and defensive.
- `on()` returns an unsubscribe function. Store it and call it when the observer is no longer needed to avoid memory leaks, especially in tests or short-lived scopes.
- Listeners are called **synchronously** inside the resolution / registration path. Avoid slow or blocking operations inside listeners.

### Related

- [Basic Setup](./basic-setup.md)
- [Child Containers](./child-containers.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
