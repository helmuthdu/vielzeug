---
title: Conduit Examples — Disposal
description: Dispose dependency-owned resources safely.
---

## Disposal

### Problem

Release services without disposing a dependency before its dependent.

### Solution

```ts
const container = createContainer([
  factoryProvider(Database, [], createDatabase, { dispose: (database) => database.close() }),
  factoryProvider(Service, [Database], (database) => createService(database), {
    dispose: (service) => service.stop(),
  }),
]);

await container.resolve({ service: Service });
await container.dispose();
```

### Pitfalls

`dispose()` waits for in-flight factory creation. Cleanup failures are collected in `ConduitDisposeError`.

### Related

- [Usage Guide](../usage.md#dispose-resources)
