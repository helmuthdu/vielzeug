---
title: Conduit Examples — Lifetimes
description: Choose shared singleton or per-resolution transient factory results.
---

## Factory Lifetimes

### Problem

Control whether a factory result is shared across resolutions.

### Solution

```ts
const Singleton = token<object>('Singleton');
const Transient = token<object>('Transient');

const container = createContainer([
  factoryProvider(Singleton, [], () => ({})),
  factoryProvider(Transient, [], () => ({}), { lifetime: 'transient' }),
]);

const services = await container.resolve({ a: Singleton, b: Singleton });
const first = await container.resolve(Transient);
const second = await container.resolve(Transient);
// services.a === services.b; first !== second
```

### Pitfalls

Singletons cache successful values on the registering container; failed attempts may retry. Transients belong to the requesting container for disposal. A singleton cannot depend on transient or scoped factories.

### Related

- [Usage Guide](../usage.md#choose-lifetimes)
