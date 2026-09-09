---
title: Conduit Examples — Async Providers
description: Resolve async dependency-first factories.
---

## Async Providers

### Problem

Create a service only after its asynchronous dependency is available.

### Solution

```ts
const Config = token<{ apiUrl: string }>('Config');
const Client = token<{ url: string }>('Client');

const container = createContainer([
  factoryProvider(Config, [], async () => ({ apiUrl: await loadApiUrl() })),
  factoryProvider(Client, [Config], (config) => ({ url: config.apiUrl })),
]);

const services = await container.resolve({ client: Client });
```

### Pitfalls

Concurrent singleton resolutions share one in-flight result.

### Related

- [Usage Guide](../usage.md#define-dependencies)
