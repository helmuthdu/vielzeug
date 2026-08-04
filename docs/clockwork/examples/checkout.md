---
title: 'Clockwork Examples — Shopping Cart Checkout'
description: 'Keep checkout state in reducers and persistence at the actor boundary.'
---

## Shopping Cart Checkout

### Problem

A checkout flow needs replacement cart updates, guarded advancement, and durable committed state.

### Solution

Use reducers for cart context, a guard for checkout admission, and a subscription for persistence.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Item = { id: string; price: number; quantity: number };
type Event = { item: Item; type: 'ADD' } | { type: 'CHECKOUT' } | { address: string; type: 'SHIPPING' };

const checkout = defineMachine<{ address: string; items: Item[] }, Event>()({
  context: { address: '', items: [] },
  initial: 'shopping',
  states: {
    shopping: {
      on: {
        ADD: { reduce: ({ context, event }) => ({ ...context, items: [...context.items, event.item] }), target: 'shopping' },
        CHECKOUT: { guard: ({ context }) => context.items.length > 0, target: 'shipping' },
      },
    },
    shipping: {
      on: {
        SHIPPING: {
          effects: [({ context }) => console.log('shipping address committed:', context.address)],
          reduce: ({ context, event }) => ({ ...context, address: event.address }),
          target: 'payment',
        },
      },
    },
    payment: {},
  },
});

const actor = checkout.createActor();
const stop = actor.subscribe((snapshot) => localStorage.setItem('checkout', JSON.stringify(snapshot)));
actor.send({ item: { id: 'book', price: 29, quantity: 1 }, type: 'ADD' });
actor.send({ type: 'CHECKOUT' });
console.log(actor.snapshot.state); // 'shipping'
stop();
actor.dispose();
```

### Pitfalls

- Do not use client cart data for price or payment authorization; validate on the server.
- An effect observes committed context and should not mutate it.

### Related

- [Persisted Wizard](./persisted-wizard.md)
- [Counter with Reset](./counter-with-reset.md)
- [API Reference](../api.md)
