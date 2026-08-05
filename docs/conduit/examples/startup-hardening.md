---
title: Conduit Examples — Validation
description: Validate static Conduit dependency wiring at startup.
---

## Validation

### Problem

Detect missing registrations and cycles before application services receive traffic.

### Solution

```ts
container.factory(Service, [Api, Logger], (api, logger) => createService(api, logger));
container.validate();
```

### Pitfalls

Validation only covers dependencies declared in factory tuples. Dynamic lookup is intentionally not part of Conduit.

### Related

- [Usage Guide](../usage.md#validate-startup-wiring)
