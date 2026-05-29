---
title: 'Relay Examples — Standalone entry'
description: 'Standalone entry example for @vielzeug/relay.'
---

## Standalone entry

### Problem

You want the minimal setup to create a bus, emit a typed event, and receive it in a subscriber — the starting point before adding namespacing, disposal, or error handling.

### Solution

```ts
import { createBus } from '@vielzeug/relay';

type WorkerEvents = {
  message: { id: string; body: string };
  stop: void;
};

const bus = createBus<WorkerEvents>();
bus.on('message', (payload) => console.log(payload.body));
```


### Pitfalls

- Calling `emit()` before any listener is registered silently discards the event. There is no event queue — register listeners before emitting.
- `on()` returns an unsubscribe function. Ignoring the return value means the listener can only be removed with `removeAllListeners()`.
- The type parameter on `createBus<T>()` is compile-time only. Emitting an event name not in `T` is a TypeScript error but has no runtime guard.

### Related

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](../usage.md#framework-integration)
