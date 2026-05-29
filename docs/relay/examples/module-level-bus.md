---
title: 'Relay Examples — Module-level bus'
description: 'Module-level bus example for @vielzeug/relay.'
---

## Module-level bus

### Problem

Multiple modules need to communicate through typed events without passing a bus instance through function arguments or a DI container. A module-level singleton gives every importer access to the same bus.

### Solution

Define a shared bus as a module singleton. Any module can import it to publish or subscribe.

```ts
// src/events/app-bus.ts
import { createBus } from '@vielzeug/relay';

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


### Pitfalls

- A module-level bus is a singleton. Calling `dispose()` in a component's teardown disposes it for all modules that imported it. Only dispose when the application shuts down.
- Circular imports between modules that both import the same bus can cause the bus to be `undefined` during initialization. Keep the bus in a leaf module with no dependencies on the importing modules.
- The TypeScript event map is erased at runtime. Emitting a misspelled event name does not throw — it simply fires with no listeners. Use the type parameter to catch these at compile time.

### Related
- [Shared Module Store (Ripple)](@vielzeug/ripple/examples/pattern-shared-module-store)

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Custom error boundary](./custom-error-boundary.md)
- [Framework Integration](../usage.md#framework-integration)
