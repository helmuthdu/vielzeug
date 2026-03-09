---
title: Eventit — Usage Guide
description: Event maps, subscribing, async/await, streaming, AbortSignal, error handling, disposal, and testing with Eventit.
---

# Eventit Usage Guide

::: tip New to Eventit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Import

```ts
import { createBus } from '@vielzeug/eventit';

// Types only
import type { Bus, BusOptions, EventMap, EventKey, Listener, Unsubscribe } from '@vielzeug/eventit';
```

## Event Maps

An event map is a plain TypeScript type where each key is an event name and each value is the payload type. Use `void` for signal events that carry no data.

```ts
type AppEvents = {
  // events with payloads
  'user:login':    { userId: string; email: string };
  'user:logout':   void; // signal — no payload
  'cart:updated':  { items: CartItem[]; total: number };
  'theme:change':  'light' | 'dark';
  'data:loaded':   { count: number; items: unknown[] };
};

const bus = createBus<AppEvents>();
```

Colons in event names (e.g. `'user:login'`) are a common convention for grouping related events. You can use any string key your team prefers.

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

### AbortSignal

Pass an `AbortSignal` as the third argument to `on()` or `once()`. The listener is automatically removed when the signal aborts — no manual `unsub()` call needed.

```ts
const controller = new AbortController();

bus.on('user:login', handler, controller.signal);

// Later — removes the listener automatically
controller.abort();
```

This composes naturally with component lifecycle, request cancellation, and timeout signals:

```ts
// Unsubscribe after 10 seconds
bus.on('data:loaded', handler, AbortSignal.timeout(10_000));

// React/Vue: pass component signal
bus.on('theme:change', applyTheme, componentSignal);
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

## Async Iteration

`events()` returns an `AsyncGenerator` that yields every future emit of an event. It terminates when the bus is disposed or the provided signal aborts.

```ts
for await (const { items, total } of bus.events('cart:updated')) {
  renderCart(items, total);
}
```

Use an `AbortSignal` to stop iterating early:

```ts
const controller = new AbortController();

for await (const payload of bus.events('data:loaded', controller.signal)) {
  process(payload);
  if (isDone(payload)) controller.abort(); // exits the loop
}
```

`events()` is pull-based — it only awaits the next value when the loop body is ready. This makes it safe for processing events at variable rates without accumulating a backlog.

## Error Handling

By default, a listener that throws propagates the error to the `emit()` caller, and subsequent listeners for that emit do not run.

Configure `onError` to capture errors instead. All remaining listeners still run.

```ts
const bus = createBus<AppEvents>({
  onError: (err, event, payload) => {
    logger.error(`[eventit] Error in "${event}" listener`, err);
  },
});
```

`onError` receives:
- `err` — the thrown value
- `event` — the event key that was being emitted
- `payload` — the payload passed to `emit()`

## Emit Hook

`onEmit` is called before any listeners run on every emission. Use it for logging, tracing, or debugging the event stream.

```ts
const bus = createBus<AppEvents>({
  onEmit: (event, payload) => {
    console.debug(`[bus emit] ${event}`, payload);
  },
});
```

::: tip
`createTestBus` uses `onEmit` internally for recording payloads. If you need both recording and a custom hook, use `createTestBus` and add separate logging in your listener or middleware.
:::

## Dispose & Cleanup

`dispose()` permanently tears down the bus: all listeners are removed and all pending `wait()` promises are rejected with `Bus is disposed`.

```ts
bus.dispose();
bus.disposed; // true

// Calling dispose() again is safe — idempotent
bus.dispose(); // no-op
```

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

Import `createTestBus` from `@vielzeug/eventit/test`. It wraps `createBus` and records every emitted payload by event key.

```ts
import { createTestBus } from '@vielzeug/eventit/test';

const bus = createTestBus<AppEvents>();

bus.emit('user:login', { userId: '1', email: 'a@example.com' });
bus.emit('user:login', { userId: '2', email: 'b@example.com' });

// emitted() returns a typed snapshot — not a live reference
expect(bus.emitted('user:login')).toEqual([
  { userId: '1', email: 'a@example.com' },
  { userId: '2', email: 'b@example.com' },
]);

bus.reset();   // clear recorded payloads, keep listeners active
bus.dispose(); // clear listeners and recorded payloads
```

`createTestBus` accepts the same options as `createBus` except `onEmit` (used internally for recording).

Use `using` for automatic cleanup in test cases:

```ts
it('records emitted events', () => {
  using bus = createTestBus<AppEvents>();
  bus.emit('user:logout');
  expect(bus.emitted('user:logout')).toHaveLength(1);
}); // bus disposed automatically
```
