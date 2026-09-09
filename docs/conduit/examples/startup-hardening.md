---
title: Conduit Examples — Validation
description: Validate static Conduit dependency wiring at construction.
---

## Validation

### Problem

Detect missing registrations and cycles before application services receive traffic.

### Solution

`createContainer` validates the full provider graph at construction — malformed providers, duplicate local tokens, missing dependencies, cycles, captive singleton dependencies, and incompatible named scopes all fail fast.

```ts
try {
  createContainer([
    factoryProvider(Service, [Api, Logger], (api, logger) => createService(api, logger)),
  ]);
} catch (error) {
  // ConduitProviderNotFoundError: Api is not registered
}
```

### Pitfalls

Validation only covers dependencies declared in factory tuples. Dynamic lookup is intentionally not part of Conduit.

### Related

- [Usage Guide](../usage.md)
