---
title: 'Herald Examples — Streaming with `events()`'
description: 'Streaming with `events()` example for @vielzeug/herald.'
---

## Streaming with `events()`

### Problem

You need to consume a continuous stream of events as an async iterable — processing each one in sequence with `for await` instead of registering a callback that runs in parallel.

### Solution

Process an ongoing sequence of events as an async generator:

```ts
async function watchCart() {
  const controller = new AbortController();

  // Stop streaming after 30 seconds of inactivity (extend pattern)
  let timeout = setTimeout(() => controller.abort(), 30_000);

  for await (const { items, total } of appBus.events('cart:updated', { signal: controller.signal, maxBuffer: 20 })) {
    clearTimeout(timeout);
    timeout = setTimeout(() => controller.abort(), 30_000);
    renderCart(items, total);
  }
}
```

### Pitfalls

- `events()` subscribes **eagerly** — when `events()` is called, not when iteration begins. Events emitted before the first `await` are buffered and will be yielded on the first iteration. There is no data loss between `events()` and the first iteration step.
- Breaking out of the `for await` loop with `break` or `return` does not dispose the bus. Use `await using` around the stream or an `AbortSignal` for guaranteed cleanup.
- If the bus is disposed while the generator is awaiting the next event, the generator **returns cleanly** — no exception is thrown. The `for await` loop simply exits. There is no need to wrap it in `try/catch` for disposal.

### Related
- [Async Workflows with watch (Ripple)](@vielzeug/ripple/examples/pattern-nextvalue-in-async-workflows)
- [Polling (Courier)](@vielzeug/courier/examples/polling)

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](../usage.md#framework-integration)
