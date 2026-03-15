---
title: Eventit — API Reference
description: Complete API reference for Eventit with type signatures and parameter documentation.
---

# Eventit API Reference

[[toc]]

## Types

### `EventMap`

The base constraint for an event map type. All event maps must satisfy:

```ts
type EventMap = Record<string, unknown>;
```

### `EventKey<T>`

Extracts the valid event keys from a `Bus<T>`:

```ts
type EventKey<T extends EventMap> = keyof T & string;
```

### `Listener<T>`

The listener function signature for a given payload type:

```ts
type Listener<T> = (payload: T) => void;
```

### `Unsubscribe`

The function returned by `on()` and `once()` to remove a listener:

```ts
type Unsubscribe = () => void;
```

### `BusOptions<T>`

Options for `createBus<T>()`:

```ts
type BusOptions<T extends EventMap = EventMap> = {
  /** Called on every emit before listeners run. Useful for logging/tracing. */
  onEmit?: <K extends EventKey<T>>(event: K, payload: T[K]) => void;
  /** If provided, listener errors are forwarded here instead of re-thrown. */
  onError?: <K extends EventKey<T>>(err: unknown, event: K, payload: T[K]) => void;
};
```

Both callbacks are **generic** — `event` and `payload` are typed to the specific event that fired.

### `BusDisposedError`

A typed error class thrown when a disposed bus is awaited. Prefer `instanceof` checks over string matching:

```ts
class BusDisposedError extends Error {
  constructor() {
    super('Bus is disposed');
    this.name = 'BusDisposedError';
  }
}
```

```ts
try {
  const payload = await bus.wait('user:login');
} catch (err) {
  if (err instanceof BusDisposedError) {
    /* bus was torn down */
  } else {
    throw err;
  }
}
```

### `Bus<T>`

The typed event bus interface:

```ts
type Bus<T extends EventMap> = {
  readonly disposed: boolean;
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]>;
  events<K extends EventKey<T>>(event: K, signal?: AbortSignal): AsyncGenerator<T[K]>;
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  listenerCount(event?: EventKey<T>): number;
  dispose(): void;
  [Symbol.dispose](): void;
};
```

### `TestBus<T>`

Extends `Bus<T>` with payload recording:

```ts
type TestBus<T extends EventMap> = Bus<T> & {
  emitted<K extends EventKey<T>>(event: K): T[K][];
  reset(): void;
};
```

## `createBus()`

```ts
function createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T>;
```

Creates and returns a new `Bus<T>` instance.

| Parameter         | Type                                        | Default | Description                                                            |
| ----------------- | ------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `options`         | `BusOptions<T>`                             | `{}`    | Optional configuration                                                 |
| `options.onEmit`  | `<K>(event: K, payload: T[K]) => void`      | —       | Called before listeners on every emission; payload is fully typed      |
| `options.onError` | `<K>(err, event: K, payload: T[K]) => void` | —       | Capture listener errors instead of re-throwing; payload is fully typed |

**Returns:** `Bus<T>`

```ts
import { createBus } from '@vielzeug/eventit';

const bus = createBus<AppEvents>();

const bus = createBus<AppEvents>({
  onEmit: (event, payload) => console.debug('[bus]', event, payload), // payload typed to T[K]
  onError: (err, event, payload) => console.error('[bus] error in', event, err, payload),
});
```

## Bus Interface

### `bus.disposed`

```ts
readonly disposed: boolean
```

`true` after `dispose()` has been called. Use this to guard against using a torn-down bus.

```ts
if (!bus.disposed) {
  bus.emit('user:login', payload);
}
```

---

### `bus.on()`

```ts
on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe
```

Subscribe to an event. The listener is called synchronously on every emit.

| Parameter  | Type             | Description                                         |
| ---------- | ---------------- | --------------------------------------------------- |
| `event`    | `K`              | The event key to subscribe to                       |
| `listener` | `Listener<T[K]>` | The callback to invoke on each emit                 |
| `signal`   | `AbortSignal`    | Optional signal — removes the listener when aborted |

**Returns:** `Unsubscribe` — call to remove the listener manually.

If `signal` is already aborted, `on()` returns a no-op unsubscribe immediately without adding the listener.

```ts
const unsub = bus.on('user:login', ({ userId }) => {
  console.log('login:', userId);
});
unsub();

// With AbortSignal
const controller = new AbortController();
bus.on('theme:change', applyTheme, controller.signal);
controller.abort(); // listener removed
```

---

### `bus.once()`

```ts
once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe
```

Subscribe to the next emit of an event. The listener fires exactly once and is automatically removed.

| Parameter  | Type             | Description                                                            |
| ---------- | ---------------- | ---------------------------------------------------------------------- |
| `event`    | `K`              | The event key                                                          |
| `listener` | `Listener<T[K]>` | Fires once, then auto-removed                                          |
| `signal`   | `AbortSignal`    | Optional — removes the listener early if aborted before the first emit |

**Returns:** `Unsubscribe`

```ts
bus.once('session:expired', () => redirectToLogin());
```

---

### `bus.wait()`

```ts
wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]>
```

Returns a `Promise` that resolves with the payload of the next emit of `event`.

| Parameter | Type          | Description                              |
| --------- | ------------- | ---------------------------------------- |
| `event`   | `K`           | The event key to wait for                |
| `signal`  | `AbortSignal` | Optional — rejects with the abort reason |

**Returns:** `Promise<T[K]>`

**Rejects when:**

- The bus is disposed before the event fires — rejects with `BusDisposedError`
- The provided `signal` aborts — rejects with `signal.reason`

```ts
const { userId } = await bus.wait('user:login');

// With timeout
const { userId } = await bus.wait('user:login', AbortSignal.timeout(5_000));
```

---

### `bus.events()`

```ts
events<K extends EventKey<T>>(event: K, signal?: AbortSignal): AsyncGenerator<T[K]>
```

Returns an `AsyncGenerator` that yields payloads for every future emit of `event`. Pull-based — only proceeds when the `for await` loop body is ready.

| Parameter | Type          | Description                                      |
| --------- | ------------- | ------------------------------------------------ |
| `event`   | `K`           | The event key to iterate                         |
| `signal`  | `AbortSignal` | Optional — terminates the generator when aborted |

**Terminates when:**

- The bus is disposed — generator returns cleanly (no exception thrown)
- The provided `signal` aborts — generator returns cleanly (no exception thrown)

```ts
for await (const payload of bus.events('cart:updated')) {
  renderCart(payload.items);
  // loop exits cleanly when bus is disposed or signal aborts — no try/catch needed
}

// Stop early
const ctl = new AbortController();
for await (const payload of bus.events('data:loaded', ctl.signal)) {
  if (payload.count === 0) ctl.abort();
}
```

---

### `bus.emit()`

```ts
emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void
```

Emit an event, calling all registered listeners synchronously in subscription order.

- For `void` events, no second argument is accepted.
- For payload events, the second argument is required and type-checked.
- If the bus is disposed, `emit()` is a no-op.

```ts
bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
bus.emit('user:logout'); // void — no argument
```

---

### `bus.dispose()`

```ts
dispose(): void
```

Permanently tears down the bus:

- All listeners are removed.
- All pending `wait()` promises are rejected with `BusDisposedError`.
- Subsequent `emit()` and `on()` calls become no-ops.

Idempotent — safe to call multiple times.

```ts
bus.dispose();
bus.disposed; // true
```

---

### `bus[Symbol.dispose]()`

```ts
[Symbol.dispose](): void
```

Alias for `dispose()`. Enables the `using` keyword (TypeScript 5.2+):

```ts
{
  using bus = createBus<AppEvents>();
  // ...
} // dispose() called automatically
```

---

### `bus.listenerCount()`

```ts
listenerCount(event?: EventKey<T>): number
```

Returns the number of active listeners.

| Parameter | Type                     | Description                                                             |
| --------- | ------------------------ | ----------------------------------------------------------------------- |
| `event`   | `EventKey<T>` (optional) | Specific event to count. Omit to count all listeners across all events. |

**Returns:** `number`

```ts
bus.on('user:login', handler1);
bus.on('user:login', handler2);
bus.on('user:logout', handler3);

bus.listenerCount('user:login'); // 2
bus.listenerCount('user:logout'); // 1
bus.listenerCount(); // 3 — total

bus.dispose();
bus.listenerCount(); // 0
```

## Testing Utilities

Import from `@vielzeug/eventit/test`.

### `createTestBus()`

```ts
function createTestBus<T extends EventMap>(options?: BusOptions<T>): TestBus<T>;
```

Creates a `TestBus<T>` — a full `Bus<T>` that also records every emitted payload for later assertion. Accepts the full `BusOptions<T>` including `onEmit` — user-provided `onEmit` is called after the internal recording hook.

| Parameter | Type                            | Default | Description                       |
| --------- | ------------------------------- | ------- | --------------------------------- |
| `options` | `Omit<BusOptions<T>, 'onEmit'>` | `{}`    | Optional — `onError` is supported |

**Returns:** `TestBus<T>`

```ts
import { createTestBus } from '@vielzeug/eventit/test';

const bus = createTestBus<AppEvents>();
```

---

### `testBus.emitted()`

```ts
emitted<K extends EventKey<T>>(event: K): T[K][]
```

Returns a **snapshot** of all payloads emitted for the given event key, in emission order. Each call returns a new array — mutations do not affect the internal records.

```ts
bus.emit('user:login', { userId: '1', email: 'a@example.com' });
bus.emit('user:login', { userId: '2', email: 'b@example.com' });

bus.emitted('user:login');
// => [{ userId: '1', email: 'a@example.com' }, { userId: '2', email: 'b@example.com' }]
```

---

### `testBus.reset()`

```ts
reset(): void
```

Clears all recorded payloads without disposing the bus or removing any listeners.

```ts
bus.reset();
bus.emitted('user:login'); // => []
```

---

### `testBus.dispose()`

```ts
dispose(): void
```

Clears recorded payloads and then calls the underlying `bus.dispose()`, removing all listeners and rejecting pending waits. Idempotent.
