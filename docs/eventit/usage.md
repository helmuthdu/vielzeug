---
title: Eventit — Usage Guide
description: Event maps, subscribing, async/await, streaming, AbortSignal, error handling, disposal, and testing with Eventit.
---

# Eventit Usage Guide

::: tip New to Eventit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Eventit?

Manual event emitters lack TypeScript inference across event names and payloads, and offer no async patterns — `await`ing an event or streaming all future emits requires bespoke wiring.

```ts
// Before — manual typed event bus
type Handlers = { 'user:login': (p: { userId: string }) => void };
const listeners = new Map<keyof Handlers, Set<Function>>();
function on<K extends keyof Handlers>(event: K, fn: Handlers[K]) { /* ... */ }
function emit<K extends keyof Handlers>(event: K, payload: Parameters<Handlers[K]>[0]) { /* ... */ }
// No await, no stream, no AbortSignal, no error isolation

// After — Eventit
import { createBus } from '@vielzeug/eventit';
const bus = createBus<AppEvents>();
bus.on('user:login', ({ userId }) => loadProfile(userId));
bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
const session = await bus.wait('user:login');              // async one-shot
for await (const event of bus.events('cart:updated')) { }  // async stream
```

| Feature              | Eventit                                       | mitt     | EventEmitter3 |
| -------------------- | --------------------------------------------- | -------- | ------------- |
| Bundle size          | <PackageInfo package="eventit" type="size" /> | ~200 B   | ~2 kB         |
| TypeScript inference | ✅ Full                                       | ⚠️ Basic | ⚠️ Basic      |
| Async/await (`wait`) | ✅                                            | ❌       | ❌            |
| Async streaming      | ✅                                            | ❌       | ❌            |
| AbortSignal          | ✅                                            | ❌       | ❌            |
| Error isolation      | ✅                                            | ❌       | ❌            |
| Zero dependencies    | ✅                                            | ✅       | ✅            |

**Use Eventit when** you need a fully-typed event bus with async patterns (`wait`, `events` generator) and AbortSignal-based lifecycle management.

**Consider mitt** if you only need a bare-minimum synchronous pub/sub with the smallest possible footprint.

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
  'user:login': { userId: string; email: string };
  'user:logout': void; // signal — no payload
  'cart:updated': { items: CartItem[]; total: number };
  'theme:change': 'light' | 'dark';
  'data:loaded': { count: number; items: unknown[] };
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
  if (isDone(payload)) controller.abort(); // exits the loop cleanly
}
// loop ends here — no exception thrown on abort or dispose
```

`events()` is pull-based — it only awaits the next value when the loop body is ready. This makes it safe for processing events at variable rates without accumulating a backlog.

`events()` terminates **cleanly** — when the bus is disposed or the signal aborts, the `for await` loop exits without throwing. No `try/catch` is required:

## Error Handling

By default, a listener that throws propagates the error to the `emit()` caller, and subsequent listeners for that emit do not run.

Configure `onError` to capture errors instead. All remaining listeners still run.

```ts
const bus = createBus<AppEvents>({
  onError: (err, event, payload) => {
    // event and payload are fully typed to the specific event that failed
    logger.error(`[eventit] Error in "${event}" listener`, err, payload);
  },
});
```

`onError` receives:

- `err` — the thrown value
- `event` — the event key that was being emitted
- `payload` — the payload, typed to `T[K]` for the specific event

## Emit Hook

`onEmit` is called before any listeners run on every emission. Both `event` and `payload` are **fully typed** to the specific event that fired — no casts needed.

```ts
const bus = createBus<AppEvents>({
  onEmit: (event, payload) => {
    // payload is typed to T[K] for the specific event
    console.debug(`[bus emit] ${event}`, payload);
  },
});
```

::: tip
`createTestBus` uses `onEmit` internally for recording payloads. You can still provide your own `onEmit` — it will be called after the recording hook.
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
import { BusDisposedError } from '@vielzeug/eventit';

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

bus.reset(); // clear recorded payloads, keep listeners active
bus.dispose(); // clear listeners and recorded payloads
```

`createTestBus` accepts the full `BusOptions<T>` including `onEmit` — your hook is composed with the internal recording.

Use `using` for automatic cleanup in test cases:

```ts
it('records emitted events', () => {
  using bus = createTestBus<AppEvents>();
  bus.emit('user:logout');
  expect(bus.emitted('user:logout')).toHaveLength(1);
}); // bus disposed automatically
```
