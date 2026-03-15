---
title: Eventit — Examples
description: Copy-paste ready event bus patterns for modules, React, Vue, Svelte, async workflows, and testing.
---

# Eventit Examples

::: tip
These are copy-paste ready recipes. See the [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## Module-level bus

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

## React — component lifecycle

Use an `AbortController` to unsubscribe when the component unmounts:

```tsx
import { useEffect } from 'react';
import { appBus } from './app-bus';

function UserGreeting() {
  useEffect(() => {
    const controller = new AbortController();

    appBus.on(
      'user:login',
      ({ userId }) => {
        fetchUser(userId).then(setUser);
      },
      controller.signal,
    );

    return () => controller.abort(); // unsubscribes on unmount
  }, []);

  return <div>{user?.name}</div>;
}
```

Or use the `using` keyword if your build supports it:

```tsx
useEffect(() => {
  using _cleanup = appBus.on('theme:change', applyTheme);
  // Note: using currently requires a wrapper to work in useEffect return
}, []);
```

## Vue — composable

```ts
// src/composables/useAppBus.ts
import { onUnmounted } from 'vue';
import { appBus } from '../events/app-bus';
import type { EventKey, Listener } from '@vielzeug/eventit';
import type { AppEvents } from '../events/app-bus';

export function useAppBus<K extends EventKey<AppEvents>>(event: K, listener: Listener<AppEvents[K]>) {
  const unsub = appBus.on(event, listener);
  onUnmounted(unsub);
}

// In a Vue component
useAppBus('user:login', ({ userId }) => loadProfile(userId));
```

## Svelte — store-like reactive pattern

```ts
// src/stores/theme.ts
import { writable } from 'svelte/store';
import { appBus } from '../events/app-bus';

export const theme = writable<'light' | 'dark'>('light');

appBus.on('theme:change', (value) => theme.set(value));
```

```svelte
<!-- App.svelte -->
<script>
  import { theme } from './stores/theme';
</script>

<div class={$theme}>...</div>
```

## Request scoping

Scope a bus to a single request and dispose it on cleanup:

```ts
async function handleRequest(req: Request): Promise<Response> {
  using requestBus = createBus<RequestEvents>();

  requestBus.on('data:loaded', (data) => cache.set(req.url, data));

  await processRequest(req, requestBus);

  return buildResponse();
} // requestBus.dispose() called automatically
```

## Awaiting a one-time event

Use `wait()` for async coordination between modules:

```ts
// Module A: waits for auth before doing work
async function loadDashboard() {
  const { userId } = await appBus.wait('user:login', AbortSignal.timeout(10_000));
  const data = await fetchDashboard(userId);
  renderDashboard(data);
}

// Module B: triggers the event independently
function onAuthSuccess(user: User) {
  appBus.emit('user:login', { userId: user.id, email: user.email });
}
```

## Streaming with `events()`

Process an ongoing sequence of events as an async generator:

```ts
async function watchCart() {
  const controller = new AbortController();

  // Stop streaming after 30 seconds of inactivity (extend pattern)
  let timeout = setTimeout(() => controller.abort(), 30_000);

  for await (const { items, total } of appBus.events('cart:updated', controller.signal)) {
    clearTimeout(timeout);
    timeout = setTimeout(() => controller.abort(), 30_000);
    renderCart(items, total);
  }
}
```

## Testing with `createTestBus`

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

## Custom error boundary

Collect errors across an event bus session with typed context:

```ts
import { BusDisposedError } from '@vielzeug/eventit';

const errors: Array<{ event: string; err: unknown }> = [];

const bus = createBus<AppEvents>({
  // event and payload are fully typed to the specific event
  onError: (err, event, payload) => errors.push({ event, err }),
});

// All other listeners for the same emit still run even if one throws
bus.on('user:login', throwingHandler);
bus.on('user:login', workingHandler); // still called
bus.emit('user:login', { userId: '1', email: 'a@example.com' });

console.log(errors); // [{ event: 'user:login', err: Error(...) }]
```

## Handling disposal in async code

Use `BusDisposedError` for `instanceof` checks instead of string matching:

```ts
import { BusDisposedError } from '@vielzeug/eventit';

async function waitForLogin(bus: Bus<AppEvents>) {
  try {
    const { userId } = await bus.wait('user:login', AbortSignal.timeout(10_000));
    return userId;
  } catch (err) {
    if (err instanceof BusDisposedError) return null; // bus torn down — graceful exit
    throw err; // timeout or unexpected error — propagate
  }
}
```

## Inspecting listener counts

Useful for debugging, conditional logic, or test assertions:

```ts
const bus = createBus<AppEvents>();

const unsub1 = bus.on('user:login', handler1);
const unsub2 = bus.on('user:login', handler2);
bus.on('user:logout', handler3);

bus.listenerCount('user:login'); // 2
bus.listenerCount('user:logout'); // 1
bus.listenerCount(); // 3 — total across all events

unsub1();
bus.listenerCount('user:login'); // 1

bus.dispose();
bus.listenerCount(); // 0
```
