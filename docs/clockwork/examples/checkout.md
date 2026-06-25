---
title: 'Clockwork Examples — Shopping Cart Checkout'
description: 'E-commerce checkout flow with persistence using @vielzeug/clockwork.'
---

## Shopping Cart Checkout

### Problem

Shopping carts need to survive page reloads and guide users through shipping → payment → confirmation steps. Without machine-backed state, cart data scatters across localStorage, component state, and API responses. Recovery after crashes leaves users confused about order status.

### Solution

Use the persistence adapter to save snapshots on every state change. Replay snapshots on app init to resume interrupted checkouts. Machine definition stays deterministic; persistence is pluggable.

```ts
import { createMachine } from '@vielzeug/clockwork';

type CartContext = {
  items: Array<{ id: string; name: string; price: number; qty: number }>;
  total: number;
  paymentId?: string;
  shippingAddress?: string;
};

type CartEvent =
  | { type: 'ADD_ITEM'; id: string; name: string; price: number }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'CHECKOUT' }
  | { type: 'ENTER_SHIPPING'; address: string }
  | { type: 'ENTER_PAYMENT'; paymentId: string }
  | { type: 'CONFIRM_ORDER' }
  | { type: 'ORDER_SUCCESS' }
  | { type: 'ORDER_FAILED'; error: string };

const checkoutMachine = createMachine({
  initial: 'shopping',
  context: { items: [], total: 0 },
  states: {
    shopping: {
      on: {
        ADD_ITEM: [
          {
            target: 'shopping',
            actions: [
              ({ context, event }) => {
                const existing = context.items.find((i) => i.id === event.id);
                if (existing) {
                  context.items = context.items.map((i) => (i.id === event.id ? { ...i, qty: i.qty + 1 } : i));
                } else {
                  context.items = [...context.items, { id: event.id, name: event.name, price: event.price, qty: 1 }];
                }
                context.total = context.items.reduce((sum, i) => sum + i.price * i.qty, 0);
              },
            ],
          },
        ],
        REMOVE_ITEM: [
          {
            target: 'shopping',
            actions: [
              ({ context, event }) => {
                context.items = context.items.filter((i) => i.id !== event.id);
                context.total = context.items.reduce((sum, i) => sum + i.price * i.qty, 0);
              },
            ],
          },
        ],
        CHECKOUT: [
          {
            guard: ({ context }) => context.items.length > 0 && context.total > 0,
            target: 'shipping',
          },
        ],
      },
    },
    shipping: {
      on: {
        ENTER_SHIPPING: [
          {
            target: 'payment',
            actions: [
              ({ context, event }) => {
                context.shippingAddress = event.address;
              },
            ],
          },
        ],
      },
    },
    payment: {
      on: {
        ENTER_PAYMENT: [
          {
            target: 'confirming',
            actions: [
              ({ context, event }) => {
                context.paymentId = event.paymentId;
              },
            ],
          },
        ],
      },
    },
    confirming: {
      invoke: [
        {
          src: async ({ context }) =>
            fetch('/api/checkout', {
              method: 'POST',
              body: JSON.stringify({
                items: context.items,
                address: context.shippingAddress,
                paymentId: context.paymentId,
              }),
            }).then((r) => {
              if (!r.ok) throw new Error('Payment failed');
              return r.json();
            }),
          onDone: () => ({ type: 'ORDER_SUCCESS' }),
          onError: (error) => ({ type: 'ORDER_FAILED', error: String(error) }),
        },
      ],
      on: {
        ORDER_SUCCESS: [{ target: 'success' }],
        ORDER_FAILED: [{ target: 'error' }],
      },
    },
    success: {
      entry: () => console.log('<ore-icon name="check" size="16"></ore-icon> Order confirmed!'),
    },
    error: {
      on: {
        CHECKOUT: [{ target: 'shipping' }],
      },
    },
  },
}).start();

const checkout = checkoutMachine; // already has persistence via options
// To add persistence, pass via createMachine().start() options:
/*
const checkout = createMachine({ initial: 'shopping', context: { items: [], total: 0 }, states: { /* ... */ } }).start({
  persistence: {
    load: () => {
      try {
        const data = localStorage.getItem('checkout_snapshot');
        return data ? JSON.parse(data) : undefined;
      } catch {
        return undefined;
      }
    },
    save: (snapshot) => {
      localStorage.setItem('checkout_snapshot', JSON.stringify(snapshot));
    },
  },
});

// Add item
checkout.send({ type: 'ADD_ITEM', id: 'book-1', name: 'TypeScript Handbook', price: 29.99 });
checkout.send({ type: 'ADD_ITEM', id: 'mug-1', name: 'Coffee Mug', price: 12.99 });
// localStorage now contains: { state: 'shopping', context: { items: [...], total: 42.98 } }

// Proceed to checkout
checkout.send({ type: 'CHECKOUT' }); // state: 'shipping'

// If page reloads here, createMachine().start({ persistence }) will restore:
// state: 'shipping', items and total intact

// Enter shipping
checkout.send({ type: 'ENTER_SHIPPING', address: '123 Main St' }); // state: 'payment'

// Enter payment
checkout.send({ type: 'ENTER_PAYMENT', paymentId: 'tok_visa' }); // state: 'confirming'

// Wait for async checkout
setTimeout(() => {
  if (checkout.state.value === 'success') {
    console.log('Final total:', checkout.context.value.total); // 42.98
  }
}, 1000);
```

### Pitfalls

- **Persistence saves every state change, not just checkpoints** — Loading a massive 1MB snapshot on every app init is slow. Use compression or only save at key states (use nested machines to save selectively).
- **JSON serialization strips functions and Symbols** — If context contains callbacks or Symbol.dispose, they won’t survive save/load. Store only plain data in context.
- **No validation on load; corrupted data causes silent failures** — If localStorage is mangled, JSON.parse() throws. Wrap load in try/catch and provide a validateSnapshot option to sanitize data before restore.
- **Cart items belong in database, not localStorage** — For real e-commerce, persist machine state but fetch current item prices/availability from backend on restore. Never trust frontend cart data.

### Related

- [Vault documentation](/vault/) — IndexedDB + LocalStorage API for persistence
- [Form with Validation](./form-validation.md) — Multi-step flows with validation
- [Courier documentation](/courier/) — POST requests during confirming state
