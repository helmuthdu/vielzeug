---
title: Eventit — Usage Guide
description: Core concepts and patterns for eventit typed event bus — event maps, subscriptions, one-time listeners, error handling, and testing.
---

# Eventit Usage Guide

::: tip New to Eventit?
Start with the [Overview](./index.md) for installation and a quick example, then come back here for in-depth patterns.
:::

[[toc]]

## Event Maps

An **event map** is a plain TypeScript type that declares every event name and its payload:

```ts
type AppEvents = {
  // events with payloads
  userLogin:       { id: string; name: string };
  messageReceived: { text: string; from: string };
  // signal events — no payload
  userLogout:      void;
  appReady:        void;
};
```

Pass it as a type parameter to `eventBus`:

```ts
import { eventBus } from '@vielzeug/eventit';

const bus = eventBus<AppEvents>();
```

TypeScript now enforces correct payload shapes everywhere — in `on`, `once`, `off`, and `emit`.

## Subscribing

### `on` — persistent listener

```ts
const unsub = bus.on('userLogin', ({ id, name }) => {
  console.log(`${name} logged in`);
});

// later, remove the listener
unsub();
```

`on` returns an **unsubscribe** function. Call it to remove just that listener without affecting others.

### Multiple listeners per event

Any number of listeners can subscribe to the same event. They fire in registration order:

```ts
bus.on('userLogin', (user) => analytics.track('login', user));
bus.on('userLogin', (user) => notifications.send(`Welcome, ${user.name}!`));
```

## Emitting Events

### With payload

```ts
bus.emit('userLogin', { id: '42', name: 'Alice' });
```

TypeScript will error if the payload shape doesn't match the event map.

### Void events

Events declared as `void` are emitted with no arguments:

```ts
bus.emit('userLogout');  // no second argument needed or allowed
bus.emit('appReady');
```

## One-Time Listeners

`once` subscribes for a **single emission**, then automatically unsubscribes:

```ts
bus.once('appReady', () => {
  initDashboard(); // only runs on the first appReady
});
```

You can still unsubscribe before firing using the returned function:

```ts
const unsub = bus.once('userLogin', handleFirstLogin);
// if login happens before user confirms, cancel it
unsub();
```

## Error Handling

By default, if a listener throws, the error propagates to the caller of `emit`:

```ts
bus.on('userLogin', () => { throw new Error('oops'); });
bus.emit('userLogin', { id: '1', name: 'Bob' }); // throws
```

For resilient multi-listener buses, supply an `onError` callback:

```ts
const bus = eventBus<AppEvents>({
  onError: (err, event) => {
    console.error(`[eventit] Error in "${event}" listener:`, err);
  },
});
```

With `onError` set, a throwing listener logs the error but allows remaining listeners to continue running.

## Emit Hook

`onEmit` is called on every `emit`, before any listeners run. The event name is typed as a union of valid event keys:

```ts
const bus = eventBus<AppEvents>({
  onEmit: (event, payload) => {
    console.debug(`[bus] ${event}`, payload);
  },
});
```

Useful for logging, analytics instrumentation, or debugging event flows in development.

## Cleanup

```ts
bus.clear('userLogin'); // remove all listeners for one event
bus.clear();            // remove all listeners for all events
```

## Disposing

`dispose()` permanently tears down the bus:

```ts
bus.dispose();
```

After `dispose()`:

- All listeners are removed.
- `emit` becomes a no-op — calls are silently ignored.
- `on` and `once` return a no-op unsubscribe; no listener is stored.

Ideal for component or module teardown when the bus should never fire again.

## Testing

`testEventBus` wraps a real bus and records every emitted payload for easy assertions:

```ts
import { testEventBus } from '@vielzeug/eventit';

type Events = { count: number; reset: void };

test('increments counter', () => {
  const { bus, emitted, reset, dispose } = testEventBus<Events>();

  bus.emit('count', 1);
  bus.emit('count', 2);
  bus.emit('reset');

  expect(emitted.get('count')).toEqual([1, 2]);
  expect(emitted.has('reset')).toBe(true);

  reset();   // clear recorded payloads; listeners still work
  dispose(); // clear listeners and recorded payloads
});
```

Listeners registered on `bus` still fire normally — `testEventBus` only adds recording on top:

```ts
test('listener is called', () => {
  const { bus, dispose } = testEventBus<Events>();
  const handler = vi.fn();

  bus.on('count', handler);
  bus.emit('count', 42);

  expect(handler).toHaveBeenCalledWith(42);
  dispose();
});
```

After `dispose()`, the bus is permanently torn down — `emit` is a no-op and `emitted` is cleared. Use `reset()` between assertions within a single test when you only want to discard the recorded history.
