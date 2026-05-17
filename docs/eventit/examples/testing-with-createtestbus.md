---
title: 'Eventit Examples — Testing with `createTestBus`'
description: 'Testing with `createTestBus` examples for eventit.'
---

## Testing with `createTestBus`

### Problem

You want to write unit tests for code that uses an event bus — asserting that specific events were emitted, in the right order, with the right payloads, without real side effects.

### Solution

```ts
import { describe, it, expect } from 'vitest';
import { createTestBus } from '@vielzeug/eventit/test';

type CartEvents = {
  'item:added': { id: string; qty: number };
  'cart:cleared': void;
};

describe('cart module', () => {
  it('emits item:added when item is added', () => {
    using bus = createTestBus<CartEvents>();

    addItemToCart(bus, { id: 'sku-1', qty: 2 });

    expect(bus.emitted('item:added')).toEqual([{ id: 'sku-1', qty: 2 }]);
  });

  it('emits cart:cleared on reset', () => {
    using bus = createTestBus<CartEvents>();

    clearCart(bus);

    expect(bus.emitted('cart:cleared')).toHaveLength(1);
  });

  it('reset() clears emission records without removing listeners', () => {
    using bus = createTestBus<CartEvents>();

    addItemToCart(bus, { id: 'sku-1', qty: 1 });
    bus.reset();

    expect(bus.emitted('item:added')).toHaveLength(0);
  });
});
```


### Pitfalls

- `createTestBus` delivers events synchronously. If your production code relies on microtask-level async delivery, the test may pass when the real code would fail. Verify the delivery timing matches production.
- `testBus.emitted(event)` returns all payloads ever emitted under that name — not just the most recent. Assert on a specific index when emission order matters.
- Calling `testBus.reset()` clears both emitted history and all active listeners. Re-register any listeners set up in `beforeEach` after calling `reset()`.

### Related

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](../usage.md#framework-integration)
