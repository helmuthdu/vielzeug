---
title: 'Courier Examples — Disposal'
description: 'Cancel Courier work deterministically.'
---

## Disposal

### Problem

A route can end while requests and streams are active, but the application client must remain usable elsewhere.

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

- A disposed client cannot start requests or streams.
- Create clients per application or SSR request scope, not per component render.
- `query.dispose()` removes that handle's subscriptions; it does not dispose the client.

### Related

- [Best Practices](../usage.md#best-practices)
- [Real-time Events](./sse-events.md)
