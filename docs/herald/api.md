---
title: Herald — API Reference
description: Complete API reference for @vielzeug/herald.
---

[[toc]]

## API At a Glance

| Symbol                | Purpose                                              | Execution mode | Common gotcha                                           |
| --------------------- | ---------------------------------------------------- | -------------- | ------------------------------------------------------- |
| `createBus()`         | Create a typed event bus instance                    | Sync           | Use a strict event map to avoid payload drift           |
| `createBehaviorBus()` | Create a bus that replays the last value to new subs | Sync           | `events()` and `wait()` do not replay                   |
| `pipeEvents()`        | Forward events from one bus to another               | Sync           | Supports cross-type buses and event renaming            |
| `bus.on()`            | Persistent subscription with optional `once` option  | Sync           | Pass `{ signal }` to auto-unsubscribe                   |
| `bus.emit()`          | Emit an event; returns listener invocation count     | Sync           | Returns `0` if disposed, middleware blocked, or invalid |
| `bus.events()`        | Stream future emits as an async generator            | Async          | Chain `.filter()` / `.map()` / `.take()` for transforms |
| `combineSignals()`    | Merge two AbortSignals into one                      | Sync           | Returns the first signal to abort                       |
| `bus.wait()`          | Await a one-time event occurrence                    | Async          | Pass `{ signal }` for timeout / cancellation            |
| `bus.waitAny()`       | Await the first event from many                      | Async          | Result is a discriminated union by event key            |
| `bus.onAny()`         | Subscribe to all events                              | Sync           | Fires after event-specific listeners                    |
| `bus.eventNames()`    | Inspect events with active listeners                 | Sync           | Snapshot reflects current subscriptions                 |
| `createTestBus()`     | Create deterministic test bus utilities              | Sync           | Reset emitted events between test cases                 |

## Package Entry Points

| Import                      | Purpose                               |
| --------------------------- | ------------------------------------- |
| `@vielzeug/herald`          | Main runtime API and types            |
| `@vielzeug/herald/devtools` | `debugBus` — debug wrapper (dev only) |
| `@vielzeug/herald/test`     | Test helpers (`createTestBus`)        |

## Types

`EventMap`, `EventKey<T>`, `Listener<T>`, `Unsubscribe` — simple type aliases:

```ts
type EventMap = Record<string, unknown>;
type EventKey<T extends EventMap> = keyof T & string;
type Listener<T> = (payload: T) => void;
type Unsubscribe = () => void;
```

`BusOptions<T>` — options object passed to `createBus()` and `createBehaviorBus()`:

```ts
type SubscribeOptions = {
  once?: boolean; // auto-remove after first invocation
  signal?: AbortSignal; // auto-remove when signal aborts
};

type EmissionErrorContext<T extends EventMap = EventMap> = {
  err: unknown; // the thrown error
  event: EventKey<T>; // event key that triggered the failing listener
  payload: unknown; // payload passed to the listener
  timestamp: number; // ms since epoch at emit() call time
};

type BusLogger = {
  debug?: (msg: string) => void; // omit to silence debug output
  warn?: (msg: string) => void; // omit to silence warn output
};

type BusOptions<T extends EventMap> = {
  logger?: BusLogger;
  maxListeners?: number;
  middleware?: readonly Middleware<T>[];
  name?: string; // optional display name — appears in log prefixes and BusDisposedError messages
  onError?: (context: EmissionErrorContext<T>) => void;
  validatePayload?: <K extends EventKey<T>>(event: K, payload: T[K]) => void;
};
```

`Middleware<T>` — a function called in sequence on every `emit()`, before listeners run. Call `next()` to continue; omit it to block dispatch:

```ts
type Middleware<T extends EventMap = EventMap> = (event: EventKey<T>, payload: unknown, next: () => void) => void;
```

`PipeableKey<S, T>` — keys shared between two event maps with compatible payload types:

```ts
type PipeableKey<S extends EventMap, T extends EventMap> = {
  [K in EventKey<S> & EventKey<T>]: S[K] extends T[K] ? K : never;
}[EventKey<S> & EventKey<T>];
```

`PipeEntry<S, T>` — a single entry for `pipeEvents`, either a key string or a `{ from, to }` rename:

```ts
type PipeEntry<S extends EventMap, T extends EventMap> = PipeableKey<S, T> | { from: EventKey<S>; to: EventKey<T> };
```

`EventStream<T>` — returned by `bus.events()`. Extends `AsyncGenerator<T>` with `AsyncDisposable` and chainable `filter` / `map` / `take` operators:

```ts
type EventStream<T> = AsyncGenerator<T> &
  AsyncDisposable & {
    filter<U extends T>(pred: (value: T) => value is U): EventStream<U>;
    filter(pred: (value: T) => boolean): EventStream<T>;
    map<U>(fn: (value: T) => U): EventStream<U>;
    take(n: number): EventStream<T>; // yield at most n values, then close
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
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): number;
  eventNames(): EventKey<T>[];
  events<K extends EventKey<T>>(event: K, options?: { maxBuffer?: number; signal?: AbortSignal }): EventStream<T[K]>;
  listenerCount(event?: EventKey<T>): number;
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): Unsubscribe;
  onAny(listener: (event: EventKey<T>, payload: unknown) => void, opts?: SubscribeOptions): Unsubscribe;
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: { signal?: AbortSignal }): Unsubscribe;
  removeAllListeners(event?: EventKey<T>): void;
  wait<K extends EventKey<T>>(event: K, opts?: { signal?: AbortSignal }): Promise<T[K]>;
  waitAny<const K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    events: K,
    opts?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>>;
};
```

`BehaviorBus<T>` — extends `Bus<T>` with last-value replay. Full docs in the [`createBehaviorBus()`](#createbehaviorbus) section.

```ts
type BehaviorInitial<T extends EventMap> = { [K in EventKey<T>]?: T[K] };

type BehaviorBus<T extends EventMap> = Bus<T> & {
  current<K extends EventKey<T>>(event: K): T[K] | undefined;
  reset(event?: EventKey<T>): void;
};
```

`TestBus<T>` — extends `Bus<T>` with emission recording. Full docs in the [Testing Utilities](#testing-utilities) section.

```ts
type TestBus<T extends EventMap> = Bus<T> & {
  emitted<K extends EventKey<T>>(event: K): T[K][];
  emittedCount<K extends EventKey<T>>(event: K): number;
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
import { createBus } from '@vielzeug/herald';

type AppEvents = {
  'user:login': { userId: string };
  'user:logout': void;
};

const bus = createBus<AppEvents>({
  logger: { debug: myLogger.debug, warn: myLogger.warn }, // provide debug to enable logging; pass {} to silence all
  onError: ({ err, event, payload }) => console.error('[bus] error in', event, err, payload),
  middleware: [
    (event, _payload, next) => {
      // run before listeners; omit next() to block dispatch
      console.debug('[mw]', event);
      next();
    },
  ],
  validatePayload: (event, payload) => {
    // throw to reject the emit before any middleware or listener runs
    if (event === 'count' && typeof payload !== 'number') throw new TypeError('must be number');
  },
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
otherBus.on('count', syncState, { signal: bus.disposalSignal });

// Cancel a fetch when the bus is disposed
fetch('/api/stream', { signal: bus.disposalSignal });

// Combine with a timeout
const signal = AbortSignal.any([bus.disposalSignal, AbortSignal.timeout(10_000)]);
```

The signal is already aborted when `bus.disposed` is `true`.

---

### `bus.on()`

Signature: `on(event, listener, opts?) => Unsubscribe`

Subscribe to an event. The listener runs synchronously on every emit.

| Parameter  | Type               | Description                                         |
| ---------- | ------------------ | --------------------------------------------------- |
| `event`    | `K`                | Event key to subscribe to                           |
| `listener` | `Listener<T[K]>`   | Callback for each emit                              |
| `opts`     | `SubscribeOptions` | Optional `{ signal?, once? }` for lifecycle control |

**Returns:** `Unsubscribe` — call to remove the listener manually.

If `opts.signal` is already aborted, `on()` returns a no-op unsubscribe immediately without adding the listener.

::: tip Multiple registrations
Registering the same listener function twice creates **two independent subscriptions**. The listener will fire twice per emit and each registration has its own unsubscribe handle. There is no deduplication.
:::

```ts
const unsub = bus.on('user:login', ({ userId }) => {
  console.log('login:', userId);
});
unsub();

// Auto-unsubscribe via AbortSignal
const controller = new AbortController();
bus.on('theme:change', applyTheme, { signal: controller.signal });
controller.abort(); // listener removed

// One-shot subscription inline
bus.on('session:expired', redirectToLogin, { once: true });

// Both options combined
bus.on('cart:updated', syncState, { once: true, signal: controller.signal });
```

---

### `bus.once()`

Signature: `once(event, listener, opts?) => Unsubscribe`

Convenience wrapper around `bus.on(event, listener, { once: true, signal: opts?.signal })`. The listener fires exactly once and is automatically removed.

| Parameter  | Type                       | Description                        |
| ---------- | -------------------------- | ---------------------------------- |
| `event`    | `K`                        | Event key                          |
| `listener` | `Listener<T[K]>`           | One-shot callback                  |
| `opts`     | `{ signal?: AbortSignal }` | Optional `signal` for early cancel |

**Returns:** `Unsubscribe`

```ts
bus.once('session:expired', () => redirectToLogin());

// Cancel before it fires
const controller = new AbortController();
bus.once('session:expired', redirectToLogin, { signal: controller.signal });
controller.abort();
```

---

### `bus.onAny()`

Signature: `onAny(listener, opts?) => Unsubscribe`

Subscribe to **all** events. The listener is called after event-specific listeners on every emit.

| Parameter  | Type                                             | Description                                         |
| ---------- | ------------------------------------------------ | --------------------------------------------------- |
| `listener` | `(event: EventKey<T>, payload: unknown) => void` | Wildcard callback                                   |
| `opts`     | `SubscribeOptions`                               | Optional `{ signal?, once? }` for lifecycle control |

**Returns:** `Unsubscribe`

`onAny` listeners are cleared by `removeAllListeners()` (no argument) but not by `removeAllListeners('event')`.

```ts
const unsub = bus.onAny((event, payload) => {
  analytics.track(event, payload);
});

unsub(); // remove when done

// With AbortSignal
const controller = new AbortController();
bus.onAny(logger, { signal: controller.signal });
controller.abort();

// Fire exactly once
bus.onAny(logFirstEvent, { once: true });
```

---

### `bus.wait()`

Signature: `wait(event, opts?) => Promise<payload>`

Returns a `Promise` that resolves with the payload of the next emit of `event`.

| Parameter | Type                       | Description                |
| --------- | -------------------------- | -------------------------- |
| `event`   | `K`                        | Event key to await         |
| `opts`    | `{ signal?: AbortSignal }` | Optional `signal` to abort |

**Returns:** `Promise<T[K]>`

**Rejects when:**

- The bus is disposed before the event fires — rejects with `BusDisposedError`
- The provided `signal` aborts — rejects with `signal.reason`

```ts
const login = await bus.wait('user:login');

// With timeout
const timedLogin = await bus.wait('user:login', { signal: AbortSignal.timeout(5_000) });
```

---

### `bus.waitAny()`

Signature: `waitAny(events, opts?) => Promise<{ event, payload }>`

Waits for the first emitted event among a list of event keys.

| Parameter | Type                       | Description                |
| --------- | -------------------------- | -------------------------- |
| `events`  | `readonly K[]`             | Event keys to race         |
| `opts`    | `{ signal?: AbortSignal }` | Optional `signal` to abort |

**Returns:** `Promise<WaitAnyResult<T, K>>`

**Throws synchronously:** `RangeError` if fewer than 2 event keys are provided.

**Rejects when:**

- The bus is disposed before any listed event fires — rejects with `BusDisposedError`
- The provided `signal` aborts — rejects with `signal.reason`

```ts
const winner = await bus.waitAny(['user:login', 'user:logout']);

if (winner.event === 'user:login') {
  console.log(winner.payload.userId);
}
```

---

### `bus.events()`

Signature: `events(event, options?) => EventStream<payload>`

Returns an `EventStream<T[K]>` — an `AsyncGenerator` extended with `AsyncDisposable` and chainable `.filter()`, `.map()`, and `.take()` operators — that yields payloads for every future emit of `event`.

- `event: K` — event key to stream
- `options?: { signal?: AbortSignal; maxBuffer?: number }` — optional early termination and buffering

::: warning Synchronous validation
`events()` validates `maxBuffer` **synchronously** at call time. If `maxBuffer` is `0` or negative, a `RangeError` is thrown immediately — not on the first `await`.
:::

::: tip Eager subscription
`events()` subscribes **when called**, not when the first `for await` iteration begins. Events emitted before iteration starts are buffered and yielded immediately on the first iteration.
:::

**Terminates when:**

- The bus is disposed — generator returns cleanly (no exception thrown)
- The provided `signal` aborts — generator returns cleanly (no exception thrown)

**`AsyncDisposable` support:** Use the `await using` keyword for guaranteed cleanup:

```ts
// Standard iteration
for await (const payload of bus.events('cart:updated')) {
  renderCart(payload.items);
  // loop exits cleanly when bus is disposed or signal aborts
}

// Stop early with a signal
const ctl = new AbortController();
for await (const payload of bus.events('data:loaded', { signal: ctl.signal, maxBuffer: 50 })) {
  if (payload.count === 0) ctl.abort();
}

// await using — cleanup guaranteed even on break or throw
await using stream = bus.events('user:login');
for await (const { userId } of stream) {
  if (userId === targetId) break; // subscription torn down automatically
}

// .filter() — yields only values that pass the predicate
for await (const n of bus.events('count').filter((n) => n > 0)) { ... }

// .map() — transforms each yielded value
for await (const label of bus.events('count').map((n) => `count: ${n}`)) { ... }

// .filter().map() — operators chain freely
for await (const s of bus.events('count').filter((n) => n % 2 === 0).map((n) => n * 2)) { ... }

// .take(n) — yield at most n values, then close automatically
for await (const n of bus.events('count').take(5)) { ... }

// .filter().take() — chain freely
for await (const n of bus.events('count').filter((n) => n > 0).take(3)) { ... }
```

::: warning Sibling streams
Calling `.filter()` or `.map()` on the **same base stream** twice creates two sibling streams that share one subscription. Disposing one sibling closes the shared subscription and terminates the other. For independent lifecycles, call `bus.events()` separately.
:::

---

### `bus.emit()`

Signature: `emit(event, payload?) => number`

Emit an event, calling all registered listeners synchronously in subscription order. Returns the number of listeners that were invoked.

- For `void` events, no second argument is accepted.
- For payload events, the second argument is required and type-checked.
- Returns `0` when: the bus is disposed, a `middleware` function blocked dispatch, or `validatePayload` threw an error (with `onError` configured).

```ts
const count = bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
bus.emit('user:logout'); // void — no argument
console.log(count); // number of listeners invoked
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

When called with an event key, the count includes **both** event-specific listeners **and** any `onAny` wildcard listeners — since wildcards fire on every emission of every event. When called without an argument, wildcards are counted once in the total.

```ts
bus.on('user:login', handler1);
bus.on('user:login', handler2);
bus.on('user:logout', handler3);
bus.onAny(wildcardHandler);

bus.listenerCount('user:login'); // 3 — 2 specific + 1 wildcard
bus.listenerCount('user:logout'); // 2 — 1 specific + 1 wildcard
bus.listenerCount(); // 4 — 3 specific + 1 wildcard (wildcard counted once)

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

## `BusOptions` — middleware

`BusOptions.middleware` accepts an array of `Middleware<T>` functions that run on every `emit()`, after `validatePayload` and before listeners. Each middleware receives `(event, payload, next)` — call `next()` to continue the chain; omit it to block dispatch entirely.

```ts
import { createBus } from '@vielzeug/herald';

const bus = createBus<AppEvents>({
  middleware: [
    // Logging middleware — logs every event then continues
    (event, payload, next) => {
      console.debug(`[mw] ${event}`, payload);
      next();
    },
    // Rate-limiting middleware — blocks dispatch under certain conditions
    (event, _payload, next) => {
      if (!rateLimiter.allow(event)) return; // omit next() to block listeners
      next();
    },
  ],
});

bus.on('user:login', handler);
bus.emit('user:login', { userId: '1', email: 'a@b.com' });
// → [mw] user:login { userId: '1', ... }
// → handler fires (if rate limiter allows)
```

`emit()` returns `0` when any middleware omits `next()`.

## `BusOptions` — validatePayload

`BusOptions.validatePayload` is called on every `emit()` **before** middleware and listeners. Throw to reject the payload entirely — no middleware or listener will run.

| Throw with `onError` | Error forwarded to `onError`; `emit()` returns `0`. |
| Throw without `onError` | Error propagates to the `emit()` caller. |

```ts
const bus = createBus<AppEvents>({
  validatePayload: (event, payload) => {
    if (event === 'count' && typeof payload !== 'number') {
      throw new TypeError(`"count" payload must be a number, got ${typeof payload}`);
    }
  },
  onError: ({ err, event }) => logger.warn('rejected emit', event, err),
});

bus.on('count', vi.fn());
bus.emit('count', 'oops'); // → onError called; listener never fires; returns 0
bus.emit('count', 42); // → listener fires; returns 1
```

## `createBehaviorBus()`

Signature: `createBehaviorBus<T extends EventMap>(initial?, options?) => BehaviorBus<T>`

Creates a bus that replays the last known value to new subscribers. Useful for state-like events where late subscribers should receive the current value immediately.

| Parameter | Type                 | Description                                    |
| --------- | -------------------- | ---------------------------------------------- |
| `initial` | `BehaviorInitial<T>` | Optional map of event names to starting values |
| `options` | `BusOptions<T>`      | Standard bus options (hooks, logger, etc.)     |

**Returns:** `BehaviorBus<T>`

**Replay rules:**

- `on()` and `once()` — replay the current value synchronously to new subscribers.
- `events()`, `wait()`, `waitAny()` — no replay; behave like a regular bus.
- The returned `BehaviorBus<T>` adds a `current(event)` method.

```ts
import { createBehaviorBus } from '@vielzeug/herald';

type UIEvents = { theme: 'light' | 'dark'; zoom: number };

const bus = createBehaviorBus<UIEvents>({ theme: 'light', zoom: 1 });

// New subscribers receive the current value immediately
bus.on('theme', applyTheme); // called with 'light' right now
bus.emit('theme', 'dark');

bus.on('theme', applyTheme); // called with 'dark' right now

// Read current value without subscribing
bus.current('theme'); // 'dark'
bus.current('zoom'); // 1 (from initial)
```

### `behaviorBus.current()`

Signature: `current(event) => T[K] | undefined`

Returns the last emitted value for the given event, or `undefined` if no value has been emitted and no initial value was provided.

```ts
bus.current('theme'); // 'dark'
bus.current('unknown' as never); // undefined
```

---

### `behaviorBus.reset()`

Signature: `reset(event?) => void`

Clears the replay buffer for a specific event, or for all events when called without arguments. After reset, new subscribers will not receive a replayed value until the next `emit()`.

Does not affect active subscriptions or the disposed state of the bus.

```ts
bus.emit('theme', 'dark');
bus.current('theme'); // 'dark'

bus.reset('theme'); // clear only 'theme'
bus.current('theme'); // undefined

bus.reset(); // clear all buffers
```

## `pipeEvents()`

Signature: `pipeEvents<S, T>(source, target, entries, signal?) => Unsubscribe`

Forwards a selected subset of events from a source bus to a target bus. Source and target may have different event map types — only the listed keys must be compatible.

| Parameter | Type                                               | Description                                       |
| --------- | -------------------------------------------------- | ------------------------------------------------- |
| `source`  | `Bus<S>`                                           | The bus to listen on                              |
| `target`  | `Bus<T>`                                           | The bus to forward events to                      |
| `entries` | `readonly [PipeEntry<S, T>, ...PipeEntry<S, T>[]]` | One or more string keys or `{ from, to }` renames |
| `signal`  | `AbortSignal` (optional)                           | Optional signal to stop forwarding early          |

**Returns:** `Unsubscribe` — call to stop forwarding manually.

Forwarding stops automatically when the **target bus is disposed**. Source disposal is handled via the source bus's own subscription lifecycle.

```ts
import { createBus, pipeEvents } from '@vielzeug/herald';

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

// Rename events during forwarding
type AuthEvents = { 'auth:login': { userId: string }; 'auth:logout': void };
type AppEventsTarget = { 'user:authenticated': { userId: string }; 'user:signed-out': void };

const authBus = createBus<AuthEvents>();
const targetBus = createBus<AppEventsTarget>();

pipeEvents(authBus, targetBus, [
  { from: 'auth:login', to: 'user:authenticated' },
  { from: 'auth:logout', to: 'user:signed-out' },
]);
```

## Testing Utilities

Import from `@vielzeug/herald/test`.

### `createTestBus()`

Signature: `createTestBus<T extends EventMap>(options?: BusOptions<T>): TestBus<T>`

Creates a `TestBus<T>` (a full `Bus<T>` plus recording helpers).

Behavior:

- Every `emit()` is recorded per event key
- `emitted(event)` returns a snapshot array
- `reset()` clears records without removing listeners
- `dispose()` clears listeners and records
- Accepts full `BusOptions<T>` including `onError`

| Parameter | Type            | Description                                     |
| --------- | --------------- | ----------------------------------------------- |
| `options` | `BusOptions<T>` | Optional hooks; composed with internal recorder |

**Returns:** `TestBus<T>`

```ts
import { createTestBus } from '@vielzeug/herald/test';

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

### `testBus.emittedCount()`

Signature: `emittedCount(event) => number`

Returns the number of times the given event has been emitted. Shorthand for `emitted(event).length`.

```ts
bus.emit('user:login', { userId: '1' });
bus.emit('user:login', { userId: '2' });

bus.emittedCount('user:login'); // 2
bus.emittedCount('user:logout'); // 0
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

## `combineSignals()`

Signature: `combineSignals(a: AbortSignal, b?: AbortSignal) => AbortSignal`

Returns a signal that aborts as soon as either `a` or `b` aborts. If only `a` is provided, returns `a` directly. Registers and cleans up its own event listeners — no leaks when neither signal fires.

| Parameter | Type                     | Description                             |
| --------- | ------------------------ | --------------------------------------- |
| `a`       | `AbortSignal`            | First signal                            |
| `b`       | `AbortSignal` (optional) | Second signal; omit to pass `a` through |

**Returns:** `AbortSignal` — aborts when either input aborts.

```ts
import { combineSignals, createBus } from '@vielzeug/herald';

const bus = createBus<AppEvents>();
const timeoutSignal = AbortSignal.timeout(5_000);

// Unsubscribe when the bus disposes OR after 5 seconds
const signal = combineSignals(bus.disposalSignal, timeoutSignal);
bus.on('user:login', handler, { signal });
```

## Errors

### `BusDisposedError`

```ts
class BusDisposedError extends Error {
  override name = 'BusDisposedError';
  // message: 'Bus is disposed' or 'Bus "<name>" is disposed' when name option is set
}
```

Thrown as the rejection reason when a pending `wait()` or `waitAny()` call is interrupted by `bus.dispose()`. Also used as the abort reason on `bus.disposalSignal`.

When the bus was created with a `name` option, the message includes the name: `Bus "myBus" is disposed`.

Use `instanceof` to distinguish from signal aborts and other rejections:

```ts
import { BusDisposedError } from '@vielzeug/herald';

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
