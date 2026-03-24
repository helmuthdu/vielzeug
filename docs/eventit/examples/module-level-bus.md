---
title: 'Eventit Examples — Module-level bus'
description: 'Module-level bus examples for eventit.'
---

## Module-level bus

## Problem

Implement module-level bus in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

Define a shared bus as a module singleton. Any module can import it to publish or subscribe.

```ts
// src/events/app-bus.ts
import { createBus } from '@vielzeug/eventit';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
  'cart:updated': { items: CartItem[]; total: number };
  'theme:change': 'light' | 'dark';
};

export const appBus = createBus<AppEvents>({
  onError: (err, event, payload) => console.error(`[bus] error in "${event}"`, err, payload),
});

// src/cart/cart-module.ts
import { appBus } from '../events/app-bus';

appBus.on('user:login', ({ userId }) => loadCart(userId));
appBus.on('user:logout', clearCart);
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
