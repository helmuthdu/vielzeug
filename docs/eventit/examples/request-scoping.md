---
title: 'Eventit Examples — Request scoping'
description: 'Request scoping examples for eventit.'
---

## Request scoping

## Problem

Implement request scoping in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

Scope a bus to a single request and dispose it on cleanup:

```ts
async function handleRequest(req: Request): Promise<Response> {
  using requestBus = createBus<RequestEvents>();

  requestBus.on('data:loaded', (data) => cache.set(req.url, data));

  await processRequest(req, requestBus);

  return buildResponse();
} // requestBus.dispose() called automatically
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](./framework-integration.md)
