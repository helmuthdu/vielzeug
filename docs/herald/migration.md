---
title: Herald — Migration Guide
description: Migrate to Herald's focused synchronous event bus, tracing, waits, and lifecycle contracts.
---

[[toc]]

## Herald 3.0

Herald 3.0 removes middleware, validation, async streams, bus pipes, and general signal helpers. The remaining bus is a small synchronous temporal-delivery primitive with one-shot waits, wildcard listeners, tracing, and explicit lifecycle ownership.

### `emit()` now returns `void`

Listener counts are no longer returned from `emit()`. Capture the `listeners` field from the corresponding tap event when the delivered count is required.

```ts
// Before
const delivered = bus.emit('cart:updated', payload);

// After
let delivered = 0;
const stopTrace = bus.tap((event) => {
  if (event.type === 'emit' && event.event === 'cart:updated') delivered = event.listeners;
});
bus.emit('cart:updated', payload);
stopTrace();
```

Listener exceptions retain fail-late behavior: every remaining listener runs, each synchronous failure produces a `error` event through `tap()`, and `emit()` rethrows the first failure after dispatch.

### Replace `onError` with `tap()`

```ts
// Before
const bus = createBus({
  onError: ({ err, event, payload, timestamp }) => report(err, event, payload, timestamp),
});

// After
const bus = createBus();
const stopTrace = bus.tap((event) => {
  if (event.type === 'error') report(event.error, event.event);
});
```

`error` events contain `error` and `event`; payloads and timestamps are no longer included. Add timing in the tap handler if needed. Unlike `onError`, `tap()` does not suppress the first error rethrown from `emit()`; catch it at the emission boundary only when recovery is intentional. Async listener work must handle its own rejected promises.

### Move middleware and payload validation to application boundaries

`middleware`, `validatePayload`, `Middleware`, and `EmissionErrorContext` are removed. Validate before emitting and compose application behavior explicitly.

```ts
// Before
const bus = createBus({
  validatePayload: validate,
  middleware: [auditMiddleware],
});
bus.emit('order:created', payload);

// After
const order = OrderSchema.parse(payload);
audit('order:created', order);
bus.emit('order:created', order);
```

### Replace `events()` streams

`events()` and `EventStream` are removed. Use `on()` for continuous synchronous delivery or `wait()` / `waitAny()` for one future event.

```ts
// Before
for await (const payload of bus.events('cart:updated', { signal })) consume(payload);

// After — continuous delivery
bus.on('cart:updated', consume, { signal });

// After — one future event
const payload = await bus.wait('cart:updated', { signal });
```

Use a dedicated queue or stream abstraction when consumers require buffering or backpressure; Herald intentionally drops events without active listeners.

### Replace `pipeEvents()` with explicit forwarding

```ts
// Before
const stopPipe = pipeEvents(source, target, ['user:login'], { signal });

// After
const bridgeSignal = AbortSignal.any([target.disposalSignal, signal]);
const stopPipe = source.on('user:login', (payload) => target.emit('user:login', payload), {
  signal: bridgeSignal,
});
```

Explicit listeners keep transformation and ownership visible without a second piping abstraction.

### Replace `combineSignals()` with the platform API

```ts
// Before
const signal = combineSignals(owner.signal, AbortSignal.timeout(5_000));

// After
const signal = AbortSignal.any([owner.signal, AbortSignal.timeout(5_000)]);
```

### Update `HeraldEvent`

Runtime events no longer contain timestamps. The `listener-error` discriminant becomes `error`. Error events expose `error` and `event`, while `emit` events include the total number of specific and wildcard listeners invoked.

## Herald 2.0

Herald 2.0 removed retained behavior buses and test-only global listener removal. Use Ripple for current state and Herald for future temporal events.

### Replace `createBehaviorBus()`

```ts
// Before
const bus = createBehaviorBus<{ theme: string }>({ theme: 'light' });
bus.emit('theme', 'dark');
console.log(bus.current('theme'));

// After
import { signal } from '@vielzeug/ripple';

const theme = signal('light');
theme.value = 'dark';
console.log(theme.value);
```

### Replace `debugBehaviorBus()`

Use Ripple inspection for retained state and `bus.tap()` for temporal activity.

### Replace `removeAllListeners()`

Keep individual unsubscribe functions, pass an ownership signal, or dispose an owner-scoped bus.

```ts
const controller = new AbortController();
bus.on('cart:updated', renderCart, { signal: controller.signal });
controller.abort();
```

## Upgrade Checklist

- Replace `emit()` return-value reads.
- Observe listener failures through `tap()`.
- Move payload validation and middleware behavior to the emitting boundary.
- Replace `events()` with `on()`, `wait()`, or a dedicated buffered stream.
- Replace `pipeEvents()` with explicit forwarding listeners.
- Replace `combineSignals()` with `AbortSignal.any()`.
- Remove timestamp and payload reads from `error` trace handling.
- Replace retained behavior buses with Ripple.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current contracts.
