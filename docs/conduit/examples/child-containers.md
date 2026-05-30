---
title: 'Conduit Examples — Child Containers'
description: 'Child containers example for @vielzeug/conduit.'
---

## Child Containers

### Problem

Some dependencies should be isolated to a request, job, or test scope — a fresh instance per invocation — without leaking into the application-wide container or across sibling scopes.

### Solution

Use `container.createChild()` to create a child container that inherits root registrations but maintains its own scope cache. Register scoped providers on the root with `lifetime: 'scoped'` and resolve from the child. Dispose the child when the scope ends.

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

interface RequestService { id: string; handle(path: string): string }

const RequestId = createToken<string>('RequestId');
const RequestService = createToken<RequestService>('RequestService');

const container = createContainer();

container.factory(RequestId, () => crypto.randomUUID(), { lifetime: 'scoped' });
container.factory(
  RequestService,
  (id) => ({ id, handle: (path) => `${id}: ${path}` }),
  { deps: [RequestId], lifetime: 'scoped' },
);

// Two concurrent request scopes — each gets isolated instances
const requestA = container.createChild();
const requestB = container.createChild();

const [serviceA, serviceB] = await Promise.all([
  requestA.resolve(RequestService),
  requestB.resolve(RequestService),
]);

// serviceA.id !== serviceB.id — separate scope caches
console.log(serviceA.id === serviceB.id); // false

await requestA.dispose(); // cleans up requestA's scoped instances
await requestB.dispose(); // cleans up requestB's scoped instances
```

#### Overriding a parent registration in a child

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

interface Logger { log(msg: string): void }

const Logger = createToken<Logger>('Logger');
const container = createContainer();

container.value(Logger, console);

const testChild = container.createChild();
const captured: string[] = [];
testChild.value(Logger, { log: (msg) => captured.push(msg) });

// testChild resolves the overridden logger; root still uses console
const logger = await testChild.resolve(Logger);
logger.log('test'); // captured, not printed
```

### Pitfalls

- Calling `container.resolve()` on the root for a scoped token throws `ScopedResolutionError`. Always resolve scoped tokens from a child container.
- A child container's `dispose()` only runs hooks for instances resolved within that child. The parent container is unaffected.
- Child containers do not share singleton instances with each other — only with the root. Two children resolving the same singleton both get the root's cached instance.

### Related

- [Lifetimes](./lifetimes.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
- [Sync Resolution](./sync-resolution.md)
