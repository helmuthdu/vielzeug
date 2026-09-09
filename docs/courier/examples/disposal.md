---
title: 'Courier Examples — Disposal'
description: 'Cancel Courier work deterministically.'
---

## Disposal

### Problem

A route can end while requests are active, but the application client must remain usable elsewhere.

### Solution

Use `cancelAll()` for a reusable scope and `dispose()` only at the final application or request boundary.

```ts
import { createCourier } from '@vielzeug/courier';

const courier = createCourier({ baseUrl: 'https://api.example.com' });

function leaveRoute(): void {
  courier.cancelAll();
}

function shutdownApplication(): void {
  courier.dispose();
}
```

### Pitfalls

- A disposed client cannot start requests.
- Create clients per application or SSR request scope, not per component render.
- `cancelAll()` aborts active direct and shared cached requests but retains settled cached values; use `clearCache()` when those values must also be removed.

### Related

- [Best Practices](../usage.md#best-practices)
- [Error Handling Patterns](./error-handling-patterns.md)
