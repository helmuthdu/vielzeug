---
title: 'Eventit Examples — Testing with `createTestBus`'
description: 'Testing with `createTestBus` examples for eventit.'
---

## Testing with `createTestBus`

## Problem

Implement testing with `createtestbus` in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

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
