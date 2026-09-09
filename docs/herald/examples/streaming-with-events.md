---
title: Herald Examples — Continuous Event Consumption
description: Consume ongoing typed events with a lifecycle-owned synchronous subscription.
---

## Consume Ongoing Events

### Problem

A component or service needs every future event until its owner ends.

### Solution

Use `on()` with an ownership signal. Herald delivers synchronously and keeps no queue.

```ts
const controller = new AbortController();

appBus.on(
  'cart:updated',
  ({ items, total }) => {
    renderCart(items, total);
  },
  { signal: controller.signal },
);

controller.abort();
```

Use `wait()` when only the next event matters:

```ts
const cart = await appBus.wait('cart:updated', {
  signal: AbortSignal.timeout(30_000),
});
```

### Pitfalls

- Events emitted before registration are not replayed.
- Herald does not buffer or provide backpressure. Use a dedicated queue or stream when asynchronous sequential consumption is required.
- Listener callbacks run inside `emit()`. Keep them short and handle asynchronous failures explicitly.
- Aborting the ownership signal removes the subscription but does not dispose the bus.

### Related

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Usage Guide](../usage.md#own-subscription-lifetimes)
