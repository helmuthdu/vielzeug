---
title: 'Herald Examples — Custom Error Boundary'
description: 'Custom error boundary example for @vielzeug/herald.'
---

## Custom Error Boundary

### Problem

A listener that throws will silently swallow the error unless you provide a global `onError` handler. Without one, Relay rethrows inside `emit`, which can break the call site and prevent other listeners from running.

### Solution

Pass an `onError` handler to `createBus`. The handler receives the thrown error, the event name, and the emitted payload, so you can log, report, or collect errors without interrupting delivery to the remaining listeners.

```ts
import { createBus } from '@vielzeug/herald';

interface AppEvents {
  'order:placed': { orderId: string; amount: number };
  'order:failed': { orderId: string; reason: string };
}

const errors: Array<{ err: unknown; event: string; payload: unknown }> = [];

const bus = createBus<AppEvents>({
  onError({ err, event, payload, timestamp }) {
    // Collect instead of rethrowing — other listeners continue
    errors.push({ err, event, payload });
    console.error(`[bus] listener error on "${String(event)}" at ${timestamp}`, err);
  },
});

// Listener A — well-behaved
bus.on('order:placed', ({ orderId, amount }) => {
  console.log(`Order ${orderId} placed for $${amount}`);
});

// Listener B — buggy: throws on large amounts
bus.on('order:placed', ({ amount }) => {
  if (amount > 999) throw new Error('Amount exceeds limit');
  processPayment(amount);
});

// Listener C — also well-behaved; runs even when B throws
bus.on('order:placed', ({ orderId }) => {
  sendConfirmationEmail(orderId);
});

// Emit: A and C run successfully; B throws, onError is called, delivery continues
bus.emit('order:placed', { orderId: 'abc-1', amount: 1500 });

// errors[0] === { err: Error('Amount exceeds limit'), event: 'order:placed', payload: { orderId: 'abc-1', amount: 1500 } }
console.log('Collected errors:', errors.length); // 1

function processPayment(_amount: number) {
  /* ... */
}
function sendConfirmationEmail(_id: string) {
  /* ... */
}
```

### Pitfalls

- **Not providing `onError` means errors re-throw from `emit`.** If you call `emit` in a fire-and-forget context (e.g., a UI event handler), an uncaught throw can cause an unhandled exception or break downstream listeners on that same call.
- **`onError` does not convert `emit` into a promise.** You cannot `await` listener errors — they are delivered synchronously via the callback. Use a collector array (as shown above) or send errors to a monitoring service.
- **`onError` applies to synchronous throws only.** If a listener returns a Promise that later rejects, that rejection is not caught by `onError` — handle async listener errors with `.catch()` inside the listener itself.

### Related

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Handling disposal in async code](./handling-disposal-in-async-code.md)
- [Framework Integration](../usage.md#framework-integration)
