---
title: 'Conduit Examples — Basic Setup'
description: 'Basic setup example for @vielzeug/conduit.'
---

## Basic Setup

### Problem

You need to wire together a small application graph — a logger and a service that depends on it — with typed tokens, lazy construction, and automatic cleanup.

### Solution

Use `createToken()` to define each dependency contract, `container.value()` or `container.factory()` to register providers, and `await container.resolve()` to get an instance.

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Service = createToken<{ run(): Promise<void> }>('Service');

const container = createContainer();

container.value(Logger, {
  log(message) {
    console.log(message);
  },
});

container.factory(
  Service,
  (logger) => ({
    async run() {
      logger.log('running');
    },
  }),
  { deps: [Logger] },
);

const service = await container.resolve(Service);
await service.run(); // logs "running"

await container.dispose();
```

### Pitfalls

- Calling `container.resolve()` before `container.value()` or `container.factory()` throws `ProviderNotFoundError`. Register all providers before resolving.
- Passing a token of type `Token<A>` where `Token<B>` is expected is a type error at compile time. Each `createToken()` call creates a distinct symbol even when descriptions match.

### Related

- [Async Providers](./async-providers.md)
- [Lifetimes](./lifetimes.md)
- [Dispose Lifecycle](./dispose-lifecycle.md)
