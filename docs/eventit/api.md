---
title: Eventit — API Reference
description: Source-aligned API reference for @vielzeug/eventit and @vielzeug/eventit/test.
---

# Eventit API Reference

[[toc]]

## API At a Glance

| Symbol            | Purpose                                 | Execution mode | Common gotcha                                 |
| ----------------- | --------------------------------------- | -------------- | --------------------------------------------- |
| `createBus()`     | Create a typed event bus instance       | Sync           | Use a strict event map to avoid payload drift |
| `bus.wait()`      | Await a one-time event occurrence       | Async          | Handle timeout/cancellation for long waits    |
| `createTestBus()` | Create deterministic test bus utilities | Sync           | Reset emitted events between test cases       |

## Package Entry Points

| Import                   | Purpose                        |
| ------------------------ | ------------------------------ |
| `@vielzeug/eventit`      | Main runtime API and types     |
| `@vielzeug/eventit/core` | Core bundle entry              |
| `@vielzeug/eventit/test` | Test helpers (`createTestBus`) |

## Types

- `EventMap`: `Record<string, unknown>`
- `EventKey<T>`: `keyof T & string`
- `Listener<T>`: `(payload: T) => void`
- `Unsubscribe`: `() => void`
- `BusOptions<T>`:
  - `onEmit(event, payload)` called before listeners run
  - `onError(err, event, payload)` called for listener errors (instead of re-throw)
- `Bus<T>`: typed runtime bus (`on`, `once`, `emit`, `wait`, `events`, `listenerCount`, `dispose`)
- `TestBus<T>`: `Bus<T>` plus `emitted(event)` and `reset()`

### `BusDisposedError`

A typed error used when `wait()` is rejected due to bus disposal:

`BusDisposedError extends Error` with message `Bus is disposed`.

## `createBus()`

Signature: `createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T>`

Creates and returns a new `Bus<T>` instance.

| Parameter | Type            | Description                 |
| --------- | --------------- | --------------------------- |
| `options` | `BusOptions<T>` | Optional hook configuration |

**Returns:** `Bus<T>`

```ts
import { createBus } from '@vielzeug/eventit';

type AppEvents = {
  'user:login': { userId: string };
  'user:logout': void;
};

const bus = createBus<AppEvents>({
  onEmit: (event, payload) => console.debug('[bus]', event, payload),
  onError: (err, event, payload) => console.error('[bus] error in', event, err, payload),
});
```

## Bus Interface

### `bus.disposed`

Type: `readonly boolean`

`true` after `dispose()` has been called. Use this to guard against using a torn-down bus.

```ts
if (!bus.disposed) {
  bus.emit('user:login', payload);
}
```

---

### `bus.on()`

Signature: `on(event, listener, signal?) => Unsubscribe`

Subscribe to an event. The listener runs synchronously on every emit.

| Parameter  | Type             | Description                          |
| ---------- | ---------------- | ------------------------------------ |
| `event`    | `K`              | Event key to subscribe to            |
| `listener` | `Listener<T[K]>` | Callback for each emit               |
| `signal`   | `AbortSignal`    | Optional signal for auto-unsubscribe |

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

Signature: `once(event, listener, signal?) => Unsubscribe`

Subscribe to the next emit of an event. The listener fires exactly once and is automatically removed.

| Parameter  | Type             | Description                  |
| ---------- | ---------------- | ---------------------------- |
| `event`    | `K`              | Event key                    |
| `listener` | `Listener<T[K]>` | One-shot callback            |
| `signal`   | `AbortSignal`    | Optional early-cancel signal |

**Returns:** `Unsubscribe`

```ts
bus.once('session:expired', () => redirectToLogin());
```

---

### `bus.wait()`

Signature: `wait(event, signal?) => Promise<payload>`

Returns a `Promise` that resolves with the payload of the next emit of `event`.

| Parameter | Type          | Description           |
| --------- | ------------- | --------------------- |
| `event`   | `K`           | Event key to await    |
| `signal`  | `AbortSignal` | Optional abort signal |

**Returns:** `Promise<T[K]>`

**Rejects when:**

- The bus is disposed before the event fires — rejects with `BusDisposedError`
- The provided `signal` aborts — rejects with `signal.reason`

```ts
const login = await bus.wait('user:login');

// With timeout
const timedLogin = await bus.wait('user:login', AbortSignal.timeout(5_000));
```

---

### `bus.events()`

Signature: `events(event, signal?) => AsyncGenerator<payload>`

Returns an `AsyncGenerator` that yields payloads for every future emit of `event`. Pull-based — only proceeds when the `for await` loop body is ready.

| Parameter | Type          | Description                       |
| --------- | ------------- | --------------------------------- |
| `event`   | `K`           | Event key to stream               |
| `signal`  | `AbortSignal` | Optional early-termination signal |

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

Signature: `emit(event, payload?) => void`

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

Signature: `dispose() => void`

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

Signature: `[Symbol.dispose]() => void`

Alias for `dispose()`. Enables the `using` keyword (TypeScript 5.2+):

```ts
{
  using bus = createBus<AppEvents>();
  // ...
} // dispose() called automatically
```

---

### `bus.listenerCount()`

Signature: `listenerCount(event?) => number`

Returns the number of active listeners.

| Parameter | Type                     | Description                              |
| --------- | ------------------------ | ---------------------------------------- |
| `event`   | `EventKey<T>` (optional) | Specific event key; omit for total count |

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

Signature: `createTestBus<T extends EventMap>(options?: BusOptions<T>): TestBus<T>`

Creates a `TestBus<T>` (a full `Bus<T>` plus recording helpers).

Behavior:

- Every `emit()` is recorded per event key
- `emitted(event)` returns a snapshot array
- `reset()` clears records without removing listeners
- `dispose()` clears listeners and records
- Accepts full `BusOptions<T>` including `onEmit` and `onError`

| Parameter | Type            | Description                                     |
| --------- | --------------- | ----------------------------------------------- |
| `options` | `BusOptions<T>` | Optional hooks; composed with internal recorder |

**Returns:** `TestBus<T>`

```ts
import { createTestBus } from '@vielzeug/eventit/test';

type AppEvents = {
  'user:login': { userId: string };
};

const bus = createTestBus<AppEvents>();

bus.emit('user:login', { userId: '1' });
console.log(bus.emitted('user:login')); // [{ userId: '1' }]
```

---

### `testBus.emitted()`

Signature: `emitted(event) => payload[]`

Returns a **snapshot** of all payloads emitted for the given event key, in emission order. Each call returns a new array — mutations do not affect the internal records.

```ts
bus.emit('user:login', { userId: '1', email: 'a@example.com' });
bus.emit('user:login', { userId: '2', email: 'b@example.com' });

bus.emitted('user:login');
// => [{ userId: '1', email: 'a@example.com' }, { userId: '2', email: 'b@example.com' }]
```

---

### `testBus.reset()`

Signature: `reset() => void`

Clears all recorded payloads without disposing the bus or removing any listeners.

```ts
bus.reset();
bus.emitted('user:login'); // => []
```

---

### `testBus.dispose()`

Signature: `dispose() => void`

Clears recorded payloads and then calls the underlying `bus.dispose()`, removing all listeners and rejecting pending waits. Idempotent.
