---
title: Conduit Examples — Basic Setup
description: Register static dependencies with Conduit.
---

## Basic Setup

### Problem

Create services with explicit typed dependencies.

### Solution

```ts
import { createContainer, factoryProvider, token, valueProvider } from '@vielzeug/conduit';

const Config = token<{ baseUrl: string }>('Config');
const Client = token<{ url: string }>('Client');

const container = createContainer([
  valueProvider(Config, { baseUrl: '/api' }),
  factoryProvider(Client, [Config], (config) => ({ url: `${config.baseUrl}/users` })),
]);

const services = await container.resolve({ client: Client });
await container.dispose();
```

### Pitfalls

Factory tuple must contain every dependency; construction fails fast otherwise.

### Related

- [Usage Guide](../usage.md#define-dependencies)
