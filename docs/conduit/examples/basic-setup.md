---
title: Conduit Examples — Basic Setup
description: Register static dependencies with Conduit.
---

## Basic Setup

### Problem

Create services with explicit typed dependencies.

### Solution

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Config = token<{ baseUrl: string }>('Config');
const Client = token<{ url: string }>('Client');
const container = createContainer();

container.value(Config, { baseUrl: '/api' });
container.factory(Client, [Config], (config) => ({ url: `${config.baseUrl}/users` }));

const client = await container.resolve(Client);
await container.dispose();
```

### Pitfalls

Factory tuple must contain every dependency.

### Related

- [Usage Guide](../usage.md#define-dependencies)
