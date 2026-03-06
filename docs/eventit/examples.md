---
title: Eventit — Examples
description: Real-world recipes for eventit typed event bus — app-wide event buses, module communication, analytics, and testing patterns.
---

# Eventit Examples

::: tip
These are copy-paste ready recipes. See the [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## App-Wide Event Bus

Define a single event bus as a singleton module and import it across your app:

```ts
// src/events.ts
import { createEventBus } from '@vielzeug/eventit';

export type AppEvents = {
  // auth
  userLogin:    { id: string; name: string; role: 'admin' | 'user' };
  userLogout:   void;
  // ui
  toastShow:    { message: string; type: 'info' | 'success' | 'error' };
  modalOpen:    { id: string };
  modalClose:   { id: string };
  // data
  dataRefresh:  { entity: string };
};

export const appBus = createEventBus<AppEvents>({
  onError: (err, event) => console.error(`[appBus] error in "${event}":`, err),
});
```

```ts
// src/auth.ts
import { appBus } from './events';

export async function login(credentials: Credentials) {
  const user = await api.login(credentials);
  appBus.emit('userLogin', { id: user.id, name: user.name, role: user.role });
}
```

```ts
// src/ui/toast.ts
import { appBus } from './events';

appBus.on('userLogin', ({ name }) => {
  appBus.emit('toastShow', { message: `Welcome back, ${name}!`, type: 'success' });
});
```

---

## Module-to-Module Communication

Use eventit to decouple modules without direct imports:

```ts
// cart module
type CartEvents = {
  itemAdded:   { productId: string; quantity: number };
  itemRemoved: { productId: string };
  cleared:     void;
};

const cartBus = createEventBus<CartEvents>();

export const cart = {
  add(productId: string, quantity: number) {
    // ... update internal state ...
    cartBus.emit('itemAdded', { productId, quantity });
  },
  clear() {
    // ... clear internal state ...
    cartBus.emit('cleared');
  },
  onItemAdded: (cb: (e: CartEvents['itemAdded']) => void) => cartBus.on('itemAdded', cb),
  onCleared:   (cb: () => void) => cartBus.on('cleared', cb),
};
```

```ts
// analytics module — no import of cart internals
cart.onItemAdded(({ productId, quantity }) => {
  analytics.track('add_to_cart', { productId, quantity });
});
```

---

## One-Time Initialization

Run setup logic exactly once when a signal fires:

```ts
type SystemEvents = {
  dbReady:    void;
  cacheReady: void;
};

const systemBus = createEventBus<SystemEvents>();

// Queue work until DB is ready
systemBus.once('dbReady', () => {
  runMigrations();
  buildIndexes();
});

// Later in startup:
await connectDatabase();
systemBus.emit('dbReady');  // migrations run, listener removed automatically
systemBus.emit('dbReady');  // no-op — listener is already gone
```

---

## Typed Analytics

Event maps make analytics calls self-documenting and type-checked:

```ts
type TrackingEvents = {
  pageView:      { path: string; referrer?: string };
  buttonClick:   { label: string; section: string };
  formSubmit:    { formId: string; valid: boolean };
  errorOccurred: { code: string; message: string };
};

const trackingBus = createEventBus<TrackingEvents>();

// Generic analytics sink
trackingBus.on('pageView',      (e) => ga('send', 'pageview', e.path));
trackingBus.on('buttonClick',   (e) => ga('send', 'event', 'UI', e.section, e.label));
trackingBus.on('errorOccurred', (e) => sentry.captureMessage(e.message, { extra: e }));

// Typed emit — TypeScript errors if fields are wrong
trackingBus.emit('pageView', { path: '/checkout' });
trackingBus.emit('buttonClick', { label: 'Buy Now', section: 'Product' });
```

---

## Testing with createTestEventBus

```ts
import { createTestEventBus } from '@vielzeug/eventit';
import { describe, expect, it } from 'vitest';

type OrderEvents = {
  placed:   { orderId: string; total: number };
  shipped:  { orderId: string; trackingCode: string };
  canceled: { orderId: string; reason: string };
};

describe('order flow', () => {
  it('records all order events', () => {
    const { bus, emitted, dispose } = createTestEventBus<OrderEvents>();

    bus.emit('placed',   { orderId: 'O1', total: 49.99 });
    bus.emit('shipped',  { orderId: 'O1', trackingCode: 'TRK123' });

    expect(emitted.get('placed')).toEqual([{ orderId: 'O1', total: 49.99 }]);
    expect(emitted.get('shipped')?.[0]?.trackingCode).toBe('TRK123');
    expect(emitted.has('canceled')).toBe(false);

    dispose();
  });

  it('still calls listeners', () => {
    const { bus, dispose } = createTestEventBus<OrderEvents>();
    const onPlaced = vi.fn();

    bus.on('placed', onPlaced);
    bus.emit('placed', { orderId: 'O2', total: 19.99 });

    expect(onPlaced).toHaveBeenCalledWith({ orderId: 'O2', total: 19.99 });
    dispose();
  });
});
```

---

## React Integration

Use eventit as a cross-component event channel without prop drilling or context:

```tsx
// src/events.ts
import { createEventBus } from '@vielzeug/eventit';

type UIEvents = {
  sidebarToggle: void;
  themeChange:   { theme: 'light' | 'dark' };
};

export const uiBus = createEventBus<UIEvents>();
```

```tsx
// Sidebar.tsx
import { useEffect } from 'react';
import { uiBus } from '../events';

export function Sidebar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return uiBus.on('sidebarToggle', () => setOpen((v) => !v));
    // returned unsubscribe is called on unmount
  }, []);

  return <aside className={open ? 'open' : 'closed'}>...</aside>;
}
```

```tsx
// Header.tsx
import { uiBus } from '../events';

export function Header() {
  return (
    <button onClick={() => uiBus.emit('sidebarToggle')}>
      ☰
    </button>
  );
}
```
