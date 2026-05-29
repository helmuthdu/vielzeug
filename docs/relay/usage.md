---
title: Relay — Usage Guide
description: Event maps, subscriptions, wait(), async event streams, hooks, cleanup, and testing for @vielzeug/relay.
---

[[toc]]

::: tip New to Relay?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

## Event Maps

An event map is a plain TypeScript type where each key is an event name and each value is the payload type. Use `void` for signal events that carry no data.

```ts
type AppEvents = {
  // events with payloads
  'user:login': { userId: string; email: string };
  'user:logout': void; // signal — no payload
  'cart:updated': { items: CartItem[]; total: number };
  'theme:change': 'light' | 'dark';
  'data:loaded': { count: number; items: unknown[] };
};

const bus = createBus<AppEvents>();
```

## Subscribing

### `on()` — Persistent subscription

`on()` registers a listener for every future emit of an event. It returns an `Unsubscribe` function.

```ts
const unsub = bus.on('user:login', ({ userId, email }) => {
  console.log('logged in:', userId, email); // fully typed
});

// Remove the listener
unsub();
```

### `once()` — One-shot listener

`once()` registers a listener that fires exactly once, then removes itself automatically.

```ts
bus.once('user:logout', () => {
  redirectToLogin();
});
```

### `removeAllListeners()` — Bulk unsubscribe

Remove listeners for one event, or all listeners across the bus.

```ts
bus.removeAllListeners('user:login');
bus.removeAllListeners(); // all events
```

### `eventNames()` — Introspect active subscriptions

Get a snapshot of event keys that currently have listeners.

```ts
bus.on('user:login', handler);
bus.on('user:logout', handler);

console.log(bus.eventNames()); // ['user:login', 'user:logout']
```

### AbortSignal

Pass an `AbortSignal` as the third argument to `on()` or `once()`. The listener is automatically removed when the signal aborts — no manual `unsub()` call needed.

```ts
const controller = new AbortController();

bus.on('user:login', handler, controller.signal);

// Later — removes the listener automatically
controller.abort();
```

## Emitting Events

`emit()` calls all registered listeners synchronously.

```ts
bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
bus.emit('user:logout'); // void event — no second argument
```

If a listener throws and no `onError` is configured, the error propagates to the `emit()` caller. With `onError`, the error is captured and remaining listeners still run.

## Awaiting Events

`wait()` returns a `Promise` that resolves with the payload of the next emit. This is useful for one-off async coordination patterns.

```ts
// Waits for the next 'user:login' emit and resolves
const { userId } = await bus.wait('user:login');
```

`wait()` rejects if:

- The bus is disposed before the event fires
- A provided `AbortSignal` aborts

```ts
// Reject if login hasn't happened within 5 seconds
const signal = AbortSignal.timeout(5_000);
const { userId } = await bus.wait('user:login', signal);
```

### `waitAny()`

`waitAny()` resolves with the first event that fires from a list and returns both the winning event key and payload.

```ts
const result = await bus.waitAny(['user:login', 'user:logout'] as const);

if (result.event === 'user:login') {
  console.log(result.payload.userId);
}
```

Like `wait()`, it rejects when the bus is disposed or when the provided signal aborts.

## Async Iteration

`events()` returns an `AsyncGenerator` that yields every future emit of an event. It terminates when the bus is disposed or the provided signal aborts.

```ts
for await (const { items, total } of bus.events('cart:updated')) {
  renderCart(items, total);
}
```

Use the `options` object to stop iterating early or cap the internal buffer:

```ts
const controller = new AbortController();

for await (const payload of bus.events('data:loaded', { signal: controller.signal, maxBuffer: 100 })) {
  process(payload);
  if (isDone(payload)) controller.abort(); // exits the loop cleanly
}
// loop ends here — no exception thrown on abort or dispose
```

## Error Handling

By default, a listener that throws propagates the error to the `emit()` caller, and subsequent listeners for that emit do not run.

Configure `onError` to capture errors instead. All remaining listeners still run.

```ts
const bus = createBus<AppEvents>({
  onError: (err, event, payload) => {
    // event and payload are fully typed to the specific event that failed
    logger.error(`[relay] Error in "${event}" listener`, err, payload);
  },
});
```

`onError` receives:

- `err` — the thrown value
- `event` — the event key that was being emitted
- `payload` — the payload, typed to `T[K]` for the specific event

### `onDispatch` hook

`onDispatch` is called on every `emit()`, before listeners run. It is intentionally a runtime-oriented hook: `event` is a string and `payload` is unknown, which keeps logging and tracing hooks simple and honest about runtime behavior.

```ts
const bus = createBus<AppEvents>({
  onDispatch: (event, payload) => {
    console.debug(`[bus emit] ${event}`, payload);
  },
});
```

::: tip
`createTestBus` composes your `onDispatch` hook with its own recording behavior.
:::

## Dispose & Cleanup

`dispose()` permanently tears down the bus: all listeners are removed and all pending `wait()` promises are rejected with `BusDisposedError`.

```ts
bus.dispose();
bus.disposed; // true

// Calling dispose() again is safe — idempotent
bus.dispose(); // no-op
```

Use `instanceof BusDisposedError` to distinguish bus teardown from other rejections:

```ts
import { BusDisposedError } from '@vielzeug/relay';

try {
  const payload = await bus.wait('user:login');
} catch (err) {
  if (err instanceof BusDisposedError) {
    // bus was torn down before the event fired
  } else {
    throw err; // signal abort reason or unexpected error
  }
}
```

### Counting listeners

`listenerCount()` lets you inspect active subscriptions without needing to track them manually:

```ts
bus.on('user:login', handler1);
bus.on('user:login', handler2);
bus.on('user:logout', handler3);

bus.listenerCount('user:login'); // 2
bus.listenerCount(); // 3 — total across all events
```

This is useful for debugging, assertions in tests, or conditional emit optimizations.

You can combine this with `eventNames()` when you need a quick snapshot of which channels are active.

### `using` keyword

`Bus` implements `[Symbol.dispose]`, so it works with the `using` keyword (TypeScript 5.2+, `"lib": ["esnext"]`):

```ts
{
  using bus = createBus<AppEvents>();
  bus.on('user:login', handler);
  bus.emit('user:login', { userId: '1', email: 'a@b.com' });
} // bus.dispose() is called automatically here
```

This is especially useful in test cases, request handlers, or any scope where you want guaranteed cleanup.

## Testing

Import `createTestBus` from `@vielzeug/relay/test`. It wraps `createBus` and records every emitted payload by event key.

```ts
import { createTestBus } from '@vielzeug/relay/test';

const bus = createTestBus<AppEvents>();

bus.emit('user:login', { userId: '1', email: 'a@example.com' });
bus.emit('user:login', { userId: '2', email: 'b@example.com' });

// emitted() returns a typed snapshot — not a live reference
expect(bus.emitted('user:login')).toEqual([
  { userId: '1', email: 'a@example.com' },
  { userId: '2', email: 'b@example.com' },
]);

bus.reset(); // clear recorded payloads, keep listeners active
bus.dispose(); // clear listeners and recorded payloads
```

`createTestBus` accepts the full `BusOptions<T>` including `onDispatch` — your hook is composed with the internal recording.

Use `using` for automatic cleanup in test cases:

```ts
it('records emitted events', () => {
  using bus = createTestBus<AppEvents>();
  bus.emit('user:logout');
  expect(bus.emitted('user:logout')).toHaveLength(1);
}); // bus disposed automatically
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect } from 'react';
import { createBus } from '@vielzeug/relay';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
};

// Module-level bus shared across components
const bus = createBus<AppEvents>();

function useEvent<K extends keyof AppEvents>(
  event: K,
  handler: (payload: AppEvents[K]) => void,
) {
  useEffect(() => {
    const controller = new AbortController();
    bus.on(event as any, handler as any, controller.signal);
    return () => controller.abort();
  }, [event, handler]);
}

function LoginButton() {
  useEvent('user:login', ({ userId }) => console.log('logged in:', userId));
  return <button onClick={() => bus.emit('user:login', { userId: '1', email: 'a@x.com' })}>Login</button>;
}
```

```ts [Vue 3]
import { onScopeDispose } from 'vue';
import { createBus } from '@vielzeug/relay';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
};

const bus = createBus<AppEvents>();

function useEvent<K extends keyof AppEvents>(event: K, handler: (payload: AppEvents[K]) => void) {
  const controller = new AbortController();
  bus.on(event as any, handler as any, controller.signal);
  onScopeDispose(() => controller.abort());
}
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createBus } from '@vielzeug/relay';

  type AppEvents = {
    'user:login': { userId: string; email: string };
    'user:logout': void;
  };

  const bus = createBus<AppEvents>();

  // Listen to events with automatic cleanup on component destroy
  const controller = new AbortController();
  bus.on('user:login', ({ userId }) => console.log('logged in:', userId), controller.signal);
  onDestroy(() => controller.abort());

  function login() {
    bus.emit('user:login', { userId: '1', email: 'alice@example.com' });
  }
</script>

<button on:click={login}>Login</button>
```

:::

### Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Working with Other Vielzeug Libraries

### With Rune

Use Rune to trace all event dispatches in development.

```ts
import { createBus } from '@vielzeug/relay';
import { createLogger } from '@vielzeug/rune';

const logger = createLogger({ scope: 'relay' });

const bus = createBus<AppEvents>({
  onDispatch: (event, payload) => logger.debug('dispatched', { event, payload }),
  onError: (err, event) => logger.error('handler failed', { err, event }),
});
```

### With Ripple

Use Ripple signals to reflect the latest event payload as reactive state.

```ts
import { createBus } from '@vielzeug/relay';
import { signal } from '@vielzeug/ripple';

type AppEvents = { 'user:login': { userId: string; email: string }; 'user:logout': void };
const bus = createBus<AppEvents>();

const currentUser = signal<{ userId: string; email: string } | null>(null);

bus.on('user:login', (payload) => { currentUser.value = payload; });
bus.on('user:logout', () => { currentUser.value = null; });
```

## Best Practices

- Create one bus per logical domain (e.g., one bus per micro-frontend module) rather than a single global bus.
- Pass `AbortSignal` to `on()` and `once()` for lifecycle-bound listeners — avoids manual `unsub()` tracking.
- Use `wait()` for one-off async coordination; use `events()` for continuous processing pipelines.
- Configure `onError` on the bus rather than wrapping each listener in try/catch.
- Call `dispose()` when a bus is no longer needed — it rejects all pending `wait()` promises.
- Prefer typed `EventMap` interfaces over generic string keys for full payload inference.
- Use `createTestBus` from `@vielzeug/relay/test` in unit tests rather than mocking the bus.
