---
title: 'Herald Examples — Testing with `createTestBus`'
description: 'Testing with `createTestBus` example for @vielzeug/herald.'
---

## Testing with `createTestBus`

### Problem

You want to write unit tests for code that uses an event bus — asserting that specific events were emitted, in the right order, with the right payloads, without real side effects.

### Solution

```ts
import { describe, it, expect } from 'vitest';
import { createTestBus } from '@vielzeug/herald/testing';

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

- `createTestBus()` uses the same synchronous delivery as `createBus()` and records dispatch before listeners run, including dispatches whose listeners throw.
- `emitted(event)` returns every recorded payload in order and returns a copied array.
- `reset()` clears only recording history; existing listeners remain active.
- `allEmitted()` omits `__proto__`, `constructor`, and `prototype` keys to keep its plain result object safe. Use `emitted(event)` for those names.

### Related

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Observe listener failures](./custom-error-boundary.md)
- [Test emissions](../usage.md#test-emissions)
