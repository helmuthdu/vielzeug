---
title: Flux Migration
---

# Flux Migration

## 3.0

Flux 3.0 removes package-specific adapter subpaths in favor of two dependency-free structural bridges. Flux owns push-stream behavior; state, event buses, transport, and presence remain owned by their source packages.

### Replace snapshot adapters with `fromStore()`

`fromStore()` requires both snapshot and subscription operations. It emits the current snapshot, closes subscription-time update gaps, and reads a new snapshot after every notification.

```diff
- import { fromSignal } from '@vielzeug/flux/ripple';
+ import { fromStore } from '@vielzeug/flux';

- const updates = fromSignal(signal);
+ const updates = fromStore({
+   getSnapshot: () => signal.peek(),
+   subscribe: (listener) => signal.subscribe(listener),
+ });
```

Use the same shape for Sourcerer query handles and presence state:

```ts
const updates = fromStore({
  getSnapshot: () => query.snapshot,
  subscribe: (listener) => query.subscribe(listener),
});
```

### Replace event adapters with `fromSubscribe()`

`fromSubscribe()` receives a value-listener registration function rather than a snapshot object:

```diff
- import { fromBus } from '@vielzeug/flux/herald';
+ import { fromSubscribe } from '@vielzeug/flux';

- const messages = fromBus(bus, 'message');
+ const messages = fromSubscribe<Message>((listener) => bus.on('message', listener));
```

Pulse events use the same form:

```ts
const messages = fromSubscribe<Message>((listener) => pulse.on('message', listener));
```

Pulse presence already implements the structural store contract:

```ts
const presence = fromStore(room.presence);
```

### Replace sink-side adapters explicitly

`toSignal()` and `toBus()` are removed. Subscribe at the state or event boundary that owns writes:

```ts
using subscription = source.subscribe({
  error: reportError,
  next: (value) => {
    target.value = value;
  },
});
```

```ts
using subscription = source.subscribe({
  error: reportError,
  next: (value) => bus.emit('message', value),
});
```

### Removed entry points

The following subpaths are removed:

- `@vielzeug/flux/courier`
- `@vielzeug/flux/herald`
- `@vielzeug/flux/pulse`
- `@vielzeug/flux/ripple`

Courier query state moved to Sourcerer, so adapt a query handle with `fromStore()` rather than restoring `fromQuery()`.

### Recheck runtime boundaries

- Timer-backed durations range from 0 through 2,147,483,647 milliseconds.
- `first()`, `last()`, and `toArray()` preserve custom abort reasons.
- `ValueOptions<T>.defaultValue` must match the stream value type.
- Async-iterator overflow rejects with `FluxCapacityError`; invalid policies throw `RangeError`, and external cancellation rejects with `signal.reason`.
- `takeUntil()` accepts cross-realm AbortSignals.
- Rejected async-iterator teardown is reported through the platform error channel.
- Channel disposal releases replay and pending values.
- Error names and NodeNext declaration specifiers remain stable in published artifacts.

## 2.0

Flux 2.0 redesigned streams around returned teardowns, `pipe()`, explicit buffers, channels, and terminal consumer names.

### Replace subscription cleanup

Retain the `Subscription` returned by `subscribe()` and call `unsubscribe()`, or own it with `using` and `[Symbol.dispose]()`.

### Compose with `pipe()`

Build stream transformations through `pipe()` and current creation, transformation, filtering, combination, and terminal operators.

### Make buffering explicit

Configure buffering and overflow behavior on flattening, collection, and async-iteration boundaries. Review every source that can outpace its consumer.
