---
title: 'Relay Examples — Streaming with `events()`'
description: 'Streaming with `events()` examples for relay.'
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

- `events()` starts listening when iteration begins (the first `next()` call), not when the generator object is created. Events emitted between construction and first iteration are lost.
- Breaking out of the `for await` loop with `break` or `return` does not dispose the bus. Call `bus.dispose()` explicitly or wrap the loop in `try/finally`.
- If the bus is disposed while the generator is awaiting the next event, the generator throws `BusDisposedError`. Wrap the `for await` in a try/catch to handle graceful teardown.

### Related
- [Async Workflows with watch (Ripple)](@vielzeug/ripple/examples/pattern-nextvalue-in-async-workflows)
- [Polling (Courier)](@vielzeug/courier/examples/polling)

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](../usage.md#framework-integration)
