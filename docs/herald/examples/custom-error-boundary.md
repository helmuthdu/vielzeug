---
title: Herald Examples — Observe Listener Failures
description: Observe isolated synchronous listener failures through Herald runtime tracing.
---

## Observe Listener Failures

### Problem

One listener can throw while other subscribers still need delivery, and diagnostics must remain separate from bus behavior.

### Solution

Install a `tap()` observer to inspect every `error` event, and catch the first rethrown error at the emission boundary when recovery is required.

```ts
import { createBus } from '@vielzeug/herald';

interface AppEvents {
  'order:placed': { amount: number; orderId: string };
}

const bus = createBus<AppEvents>();
const errors: unknown[] = [];
const stopTrace = bus.tap((event) => {
  if (event.type === 'error') errors.push(event.error);
});

bus.on('order:placed', ({ amount }) => {
  if (amount > 999) throw new Error('Amount exceeds limit');
});
bus.on('order:placed', ({ orderId }) => sendConfirmation(orderId));

try {
  bus.emit('order:placed', { amount: 1500, orderId: 'order-1' });
} catch (error) {
  console.log(error); // first listener failure; confirmation still ran
}
console.log(errors.length); // 1

stopTrace();
bus.dispose();
```

### Pitfalls

- Herald catches synchronous throws only. Handle rejected promises inside asynchronous listener work.
- Tap events contain the error and event key, not the original payload or a timestamp.
- Tap-handler errors are swallowed so diagnostics cannot change delivery.
- `emit()` rethrows only the first synchronous failure; use `tap()` when diagnostics must capture every failing listener.

### Related

- [Handling disposal in async code](./handling-disposal-in-async-code.md)
- [Usage Guide](../usage.md#handle-listener-failures)
