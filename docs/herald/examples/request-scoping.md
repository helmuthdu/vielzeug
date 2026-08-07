---
title: 'Herald Examples — Request scoping'
description: 'Request scoping example for @vielzeug/herald.'
---

## Request scoping

### Problem

You need an event bus scoped to a single HTTP request or user action. Listeners from one request must not bleed into the next, and all subscriptions should be released when the request completes.

### Solution

Scope a bus to a single request and dispose it on cleanup:

```ts
async function handleRequest(req: Request): Promise<Response> {
  using requestBus = createBus<RequestEvents>();

  requestBus.on('data:loaded', (data) => cache.set(req.url, data));

  await processRequest(req, requestBus);

  return buildResponse();
} // requestBus.dispose() called automatically
```

### Pitfalls

- Reusing one bus across requests is not safe — subscriptions from concurrent requests can cross boundaries. Create and dispose one bus per request instead.
- Not calling `dispose()` at the end of the request handler leaks the bus. Ensure disposal runs in a `finally` block so it fires even when the handler throws.
- Passing the scoped bus through function arguments is safer than storing it on a shared object where concurrent requests can accidentally share a reference.

### Related

- [Request Middleware (Rune)](@vielzeug/rune/examples/request-middleware)

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](../usage.md#framework-integration)
