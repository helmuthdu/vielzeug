# Wireit

Wireit is a small, typed dependency injection container for TypeScript.

## Features

- Typed symbol tokens with `createToken<T>()`
- Value and factory providers
- `singleton`, `transient`, and `scoped` lifetimes
- Hierarchical child containers
- Async resolution and lifecycle cleanup

## Quick Start

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Service = createToken<{ run(): Promise<void> }>('Service');

const container = createContainer();

container.value(Logger, {
  log(message) {
    console.log(message);
  },
});

container.factory(Service, (logger) => {
  return {
    async run() {
      logger.log('started');
    },
  };
}, {
  deps: [Logger],
});

await container.resolve(Service);
```

## Core API

- `createToken(description)` creates a typed symbol token.
- `createContainer()` creates a root container.
- `container.value(token, value, opts?)` registers a constant provider.
- `container.factory(token, fn, opts?)` registers a factory provider.
- `container.resolve(token)` resolves a single provider.
- `container.resolveMany(token)` resolves all providers for a token.
- `container.resolveOptional(token)` returns `undefined` when a token is missing.
- `container.createChild()` creates a child container.
- `container.dispose()` disposes resolved instances and marks the container unusable.

## Lifetimes

- `singleton` caches one instance per container registration.
- `transient` creates a new instance every time.
- `scoped` caches one instance per child container and fails on the root container.

## Documentation

- [Usage Guide](../../docs/wireit/usage.md)
- [API Reference](../../docs/wireit/api.md)
- [Examples](../../docs/wireit/examples.md)
