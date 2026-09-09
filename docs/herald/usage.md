---
title: Herald — Usage Guide
description: Define typed events, own subscriptions, await one-shot events, trace failures, and test emissions.
---

[[toc]]

## Basic Usage

Use an interface or object type whose string keys are event names and whose values are payloads. Use `void` or `undefined` for payloadless events.

```ts
import { createBus } from '@vielzeug/herald';

interface AppEvents {
  'cart:updated': { count: number };
  'user:logout': void;
}

using bus = createBus<AppEvents>({ name: 'app' });
const stop = bus.on('cart:updated', ({ count }) => console.log(count));

bus.emit('cart:updated', { count: 1 });
bus.emit('user:logout');
stop();
```

`emit()` calls listeners synchronously and returns `void`. Event-specific listeners run before wildcard listeners. Events emitted without listeners are discarded.

## Own Subscription Lifetimes

Keep the returned unsubscribe function or bind a subscription to an `AbortSignal`. `once()` and `{ once: true }` unsubscribe before invoking the listener.

```ts
const controller = new AbortController();

bus.on('cart:updated', renderCart, { signal: controller.signal });
bus.once('user:logout', clearSession);
bus.on('user:logout', clearSession, { once: true });

controller.abort();
```

An already-aborted signal creates no subscription and returns an idempotent no-op unsubscribe function.

## Observe Every Event

Use `onAny()` for cross-cutting application behavior. Wildcard listeners receive the event key and untyped payload after event-specific listeners.

```ts
const stop = bus.onAny((event, payload) => {
  audit(event, payload);
});

stop();
```

Pass `{ once: true }` to stop after the first event of any type. `wildcardCount()` reports wildcard listeners separately from `listenerCount()`.

## Await One Event

`wait()` resolves on the next matching event. `waitAny()` requires at least two keys and returns a discriminated union.

```ts
const cart = await bus.wait('cart:updated', { signal: AbortSignal.timeout(5_000) });
const result = await bus.waitAny(['cart:updated', 'user:logout'], {
  signal: AbortSignal.timeout(5_000),
});

if (result.event === 'cart:updated') console.log(result.payload.count);
```

These methods do not replay earlier events. External cancellation rejects with the signal reason. Bus disposal rejects pending waits with `BusDisposedError`.

## Handle Listener Failures

Listener exceptions do not prevent remaining specific or wildcard listeners from running. Each failure produces a `error` tap event, then `emit()` rethrows the first error after dispatch.

```ts
const stopTrace = bus.tap((event) => {
  if (event.type === 'error') {
    recordListenerFailure(event.error);
  }
});

stopTrace();
```

Herald captures synchronous listener throws only, and `tap()` does not suppress the error rethrown after dispatch. A listener that starts asynchronous work must handle its own rejected promises.

## Trace Bus Activity

`tap()` observes subscriptions, unsubscriptions, wildcard subscriptions, emissions, listener failures, and disposal without changing bus behavior. Tap-handler failures are swallowed.

```ts
const stopTrace = bus.tap((event) => {
  recordHeraldEvent(event);
}, { signal: owner.signal });
```

An `emit` trace includes the event key, payload, and number of specific plus wildcard listeners invoked. Trace events do not include timestamps; add them in the observer if needed.

## Inspect Listeners

```ts
bus.listenerCount('cart:updated'); // specific listeners for this key
bus.listenerCount(); // all specific listeners
bus.wildcardCount(); // onAny listeners
bus.eventNames(); // keys with active specific listeners
```

`eventNames()` does not include events that only have wildcard listeners.

## Dispose the Bus

`dispose()` is permanent and idempotent. It emits a final tap event, aborts `disposalSignal` with `BusDisposedError`, clears all listeners and taps, and rejects pending waits. Later subscriptions and emissions are no-ops.

```ts
using scopedBus = createBus<AppEvents>({ name: 'checkout' });
scopedBus.disposalSignal.addEventListener('abort', () => releaseOwnedWork());
```

The configured name appears in disposal errors and listener-threshold warnings.

## Test Emissions

Import test helpers from the focused testing entry point.

```ts
import { createTestBus } from '@vielzeug/herald/testing';

using testBus = createTestBus<AppEvents>();
testBus.emit('cart:updated', { count: 2 });

expect(testBus.emitted('cart:updated')).toEqual([{ count: 2 }]);
expect(testBus.emittedCount('cart:updated')).toBe(1);
expect(testBus.allEmitted()).toEqual({ 'cart:updated': [{ count: 2 }] });

testBus.reset();
```

Returned recordings are snapshots. `reset()` clears recording history without removing listeners; disposal clears both.

## Working with Other Vielzeug Libraries

Use Herald for temporal facts, Ripple for retained state, Rune for structured logging inside `tap()`, and Postmaster when work must survive reloads or retry durably.

## Best Practices

- Define one explicit event map per module or application boundary.
- Emit facts, not mutable retained state.
- Keep synchronous listeners short.
- Handle rejected promises inside asynchronous listener work.
- Keep unsubscribe functions or pass ownership signals.
- Use `wait()` and `waitAny()` only for future one-shot events.
- Install a `tap()` observer when listener failures must be visible.
- Dispose owner-scoped buses.
