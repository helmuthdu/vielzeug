---
title: Relay — API Reference
description: Complete API reference for @vielzeug/relay.
---

[[toc]]

## API At a Glance

| Symbol             | Purpose                                 | Execution mode | Common gotcha                                 |
| ------------------ | --------------------------------------- | -------------- | --------------------------------------------- |
| `createBus()`      | Create a typed event bus instance       | Sync           | Use a strict event map to avoid payload drift |
| `pipeEvents()`     | Forward events from one bus to another  | Sync           | Teardown is automatic when the target disposes |
| `bus.wait()`       | Await a one-time event occurrence       | Async          | Handle timeout/cancellation for long waits    |
| `bus.waitAny()`    | Await the first event from many         | Async          | Result is a discriminated union by event key  |
| `bus.eventNames()` | Inspect events with active listeners    | Sync           | Snapshot reflects current subscriptions       |
| `createTestBus()`  | Create deterministic test bus utilities | Sync           | Reset emitted events between test cases       |

## Package Entry Points

| Import                   | Purpose                        |
| ------------------------ | ------------------------------ |
| `@vielzeug/relay`      | Main runtime API and types     |
| `@vielzeug/relay/test` | Test helpers (`createTestBus`) |

## Types

`EventMap`, `EventKey<T>`, `Listener<T>`, `Unsubscribe` — simple type aliases:

```ts
type EventMap = Record<string, unknown>;
type EventKey<T extends EventMap> = keyof T & string;
type Listener<T> = (payload: T) => void;
type Unsubscribe = () => void;
```

`BusOptions<T>` — options object passed to `createBus()`:

```ts
type BusOptions<T extends EventMap> = {
  debug?: boolean;
  onDispatch?: <K extends EventKey<T>>(event: K, payload: T[K]) => void;
  onError?: <K extends EventKey<T>>(err: unknown, event: K, payload: T[K]) => void;
};
```

`WaitAnyResult<T, K>` — discriminated-union result returned by `waitAny()`:

```ts
type WaitAnyResult<T extends EventMap, K extends readonly EventKey<T>[]> = {
  [I in keyof K]: K[I] extends EventKey<T> ? { event: K[I]; payload: T[K[I]] } : never;
}[number];
```

`Bus<T>` — the runtime bus interface. Individual method docs are in the [Bus Interface](#bus-interface) section.

```ts
type Bus<T extends EventMap> = {
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose](): void;
  dispose(): void;
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  eventNames(): EventKey<T>[];
  events<K extends EventKey<T>>(event: K, options?: { maxBuffer?: number; signal?: AbortSignal }): AsyncGenerator<T[K]>;
  listenerCount(event?: EventKey<T>): number;
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  removeAllListeners(event?: EventKey<T>): void;
  wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]>;
  waitAny<const K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    events: K,
    signal?: AbortSignal,
  ): Promise<WaitAnyResult<T, K>>;
};
```

`TestBus<T>` — extends `Bus<T>` with emission recording. Full docs in the [Testing Utilities](#testing-utilities) section.

```ts
type TestBus<T extends EventMap> = Bus<T> & {
  emitted<K extends EventKey<T>>(event: K): T[K][];
  reset(): void;
};
```

## `createBus()`

Signature: `createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T>`

Creates and returns a new `Bus<T>` instance.

| Parameter | Type            | Description                 |
| --------- | --------------- | --------------------------- |
| `options` | `BusOptions<T>` | Optional hook configuration |

**Returns:** `Bus<T>`

```ts
import { createBus } from '@vielzeug/relay';

type AppEvents = {
  'user:login': { userId: string };
  'user:logout': void;
};

const bus = createBus<AppEvents>({
  debug: true, // log subscribe/emit/dispose to console.debug
  onDispatch: (event, payload) => console.debug('[bus]', event, payload),
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

### `bus.disposalSignal`

Type: `readonly AbortSignal`

An `AbortSignal` that fires when the bus is disposed. Use it to tie external lifecycles to the bus lifetime without polling `bus.disposed`.

```ts
// Automatically unsubscribe from another bus when this bus is torn down
otherBus.on('count', syncState, bus.disposalSignal);

// Cancel a fetch when the bus is disposed
fetch('/api/stream', { signal: bus.disposalSignal });

// Combine with a timeout
const signal = AbortSignal.any([bus.disposalSignal, AbortSignal.timeout(10_000)]);
```

The signal is already aborted when `bus.disposed` is `true`.

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

::: tip Multiple registrations
Registering the same listener function twice creates **two independent subscriptions**. The listener will fire twice per emit and each registration has its own unsubscribe handle. There is no deduplication.
:::

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

### `bus.waitAny()`

Signature: `waitAny(events, signal?) => Promise<{ event, payload }>`

Waits for the first emitted event among a list of event keys.

| Parameter | Type           | Description           |
| --------- | -------------- | --------------------- |
| `events`  | `readonly K[]` | Event keys to race    |
| `signal`  | `AbortSignal`  | Optional abort signal |

**Returns:** `Promise<WaitAnyResult<T, K>>`

**Rejects when:**

- The bus is disposed before any listed event fires — rejects with `BusDisposedError`
- The provided `signal` aborts — rejects with `signal.reason`

```ts
const winner = await bus.waitAny(['user:login', 'user:logout'] as const);

if (winner.event === 'user:login') {
  console.log(winner.payload.userId);
}
```

---

### `bus.events()`

Signature: `events(event, options?) => AsyncGenerator<payload>`

Returns an `AsyncGenerator` that yields payloads for every future emit of `event`. Pull-based — only proceeds when the `for await` loop body is ready.

- `event: K` — event key to stream
- `options?: { signal?: AbortSignal; maxBuffer?: number }` — optional early termination and buffering

::: warning Synchronous validation
`events()` validates `maxBuffer` **synchronously** at call time. If `maxBuffer` is `0` or negative, a `RangeError` is thrown immediately — not on the first `await`.
:::

::: tip First-yield timing
The generator starts listening when the `for await` loop begins its first iteration, not when the generator object is created. Events emitted between construction and first iteration are lost.
:::

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
for await (const payload of bus.events('data:loaded', { signal: ctl.signal, maxBuffer: 50 })) {
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

---

### `bus.eventNames()`

Signature: `eventNames() => EventKey<T>[]`

Returns a snapshot of event keys that currently have at least one active listener.

```ts
bus.on('user:login', handler1);
bus.on('user:logout', handler2);

bus.eventNames(); // ['user:login', 'user:logout']
```

---

### `bus.removeAllListeners()`

Signature: `removeAllListeners(event?) => void`

Removes all listeners for one event, or all listeners for all events when called without arguments.

| Parameter | Type                     | Description                                     |
| --------- | ------------------------ | ----------------------------------------------- |
| `event`   | `EventKey<T>` (optional) | Specific event key; omit to clear all listeners |

```ts
bus.removeAllListeners('user:login');
bus.removeAllListeners(); // remove everything
```

## `pipeEvents()`

Signature: `pipeEvents<T extends EventMap>(source, target, events, signal?) => Unsubscribe`

Forwards a selected subset of events from a source bus to a target bus. Both buses must share the same event map type `T`.

| Parameter | Type                                         | Description                                     |
| --------- | -------------------------------------------- | ----------------------------------------------- |
| `source`  | `Bus<T>`                                     | The bus to listen on                            |
| `target`  | `Bus<T>`                                     | The bus to forward events to                    |
| `events`  | `readonly [EventKey<T>, ...EventKey<T>[]]`   | One or more event keys to forward               |
| `signal`  | `AbortSignal` (optional)                     | Optional signal to stop forwarding early        |

**Returns:** `Unsubscribe` — call to stop forwarding manually.

Forwarding stops automatically when the **target bus is disposed**. Source disposal is handled via the source bus's own subscription lifecycle.

```ts
import { createBus, pipeEvents } from '@vielzeug/relay';

const appBus = createBus<AppEvents>();
const auditBus = createBus<AppEvents>();

// Forward only auth events — tears down automatically when auditBus disposes
const unpipe = pipeEvents(appBus, auditBus, ['user:login', 'user:logout']);

// Stop forwarding manually
unpipe();

// Scope to a signal
const controller = new AbortController();
pipeEvents(appBus, auditBus, ['user:login'], controller.signal);
controller.abort(); // forwarding stops
```

---

## Testing Utilities

Import from `@vielzeug/relay/test`.

### `createTestBus()`

Signature: `createTestBus<T extends EventMap>(options?: BusOptions<T>): TestBus<T>`

Creates a `TestBus<T>` (a full `Bus<T>` plus recording helpers).

Behavior:

- Every `emit()` is recorded per event key
- `emitted(event)` returns a snapshot array
- `reset()` clears records without removing listeners
- `dispose()` clears listeners and records
- Accepts full `BusOptions<T>` including `onDispatch` and `onError`

| Parameter | Type            | Description                                     |
| --------- | --------------- | ----------------------------------------------- |
| `options` | `BusOptions<T>` | Optional hooks; composed with internal recorder |

**Returns:** `TestBus<T>`

```ts
import { createTestBus } from '@vielzeug/relay/test';

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

---

## Errors

### `BusDisposedError`

```ts
class BusDisposedError extends Error {
  override name = 'BusDisposedError';
  override message = 'Bus is disposed';
}
```

Thrown as the rejection reason when a pending `wait()` or `waitAny()` call is interrupted by `bus.dispose()`. Also used as the abort reason on `bus.disposalSignal`.

Use `instanceof` to distinguish from signal aborts and other rejections:

```ts
import { BusDisposedError } from '@vielzeug/relay';

try {
  await bus.wait('user:login');
} catch (err) {
  if (err instanceof BusDisposedError) {
    // bus was torn down before the event fired
  } else {
    throw err; // signal abort or unexpected error
  }
}
```
