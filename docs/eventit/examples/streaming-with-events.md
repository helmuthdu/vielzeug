---
title: 'Eventit Examples — Streaming with `events()`'
description: 'Streaming with `events()` examples for eventit.'
---

## Streaming with `events()`

## Problem

Implement streaming with `events()` in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

Process an ongoing sequence of events as an async generator:

```ts
async function watchCart() {
  const controller = new AbortController();

  // Stop streaming after 30 seconds of inactivity (extend pattern)
  let timeout = setTimeout(() => controller.abort(), 30_000);

  for await (const { items, total } of appBus.events('cart:updated', controller.signal)) {
    clearTimeout(timeout);
    timeout = setTimeout(() => controller.abort(), 30_000);
    renderCart(items, total);
  }
}
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
