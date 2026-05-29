---
title: 'Relay Examples — Inspecting listener counts'
description: 'Inspecting listener counts examples for relay.'
---

## Inspecting listener counts

### Problem

During debugging or in a test, you want to assert that exactly the right number of listeners are registered on the bus — detecting leaks from missing cleanup or verifying that setup ran correctly.

### Solution

Useful for debugging, conditional logic, or test assertions:

```ts
const bus = createBus<AppEvents>();

const unsub1 = bus.on('user:login', handler1);
const unsub2 = bus.on('user:login', handler2);
bus.on('user:logout', handler3);

bus.listenerCount('user:login'); // 2
bus.listenerCount('user:logout'); // 1
bus.listenerCount(); // 3 — total across all events

unsub1();
bus.listenerCount('user:login'); // 1

bus.dispose();
bus.listenerCount(); // 0
```


### Pitfalls

- `listenerCount(event)` only counts listeners for that exact event name. Listeners registered under a different casing or alias are not included.
- The count is live. If you cache it, it becomes stale the moment a listener is added or removed.
- `eventNames()` only returns names with at least one active listener. A name with no listeners does not appear, even if it was previously used.

### Related

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](../usage.md#framework-integration)
