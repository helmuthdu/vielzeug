---
title: Herald — API Reference
description: Complete API reference for @vielzeug/herald.
---

[[toc]]

## API At a Glance

| Symbol                | Purpose                                              | Execution mode | Common gotcha                                                                      |
| --------------------- | ---------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `createBus()`         | Create a typed event bus instance                    | Sync           | Use a strict event map to avoid payload drift                                      |
| `createBehaviorBus()` | Create a bus that replays the last value to new subs | Sync           | `events()` and `wait()` do not replay; `once()` fires immediately if buffer exists |
| `pipeEvents()`        | Forward events from one bus to another               | Sync           | Supports cross-type buses and event renaming                                       |
| `bus.on()`            | Persistent subscription with optional `once` option  | Sync           | Pass `{ signal }` to auto-unsubscribe                                              |
| `bus.emit()`          | Emit an event; returns listener invocation count     | Sync           | Returns `0` if disposed, middleware blocked, or invalid                            |
| `bus.events()`        | Stream future emits as an async generator            | Async          | Subscribes eagerly; use `maxBuffer` to cap the buffer                              |
| `combineSignals()`    | Merge N AbortSignals into one                        | Sync           | Returns the first already-aborted signal early                                     |
| `bus.wait()`          | Await a one-time event occurrence                    | Async          | Pass `{ signal }` for timeout / cancellation                                       |
| `bus.waitAny()`       | Await the first event from many                      | Async          | Result is a discriminated union by event key                                       |
| `bus.onAny()`         | Subscribe to all events                              | Sync           | Fires after event-specific listeners                                               |
| `bus.eventNames()`    | Inspect events with active listeners                 | Sync           | Snapshot reflects current subscriptions                                            |
| `createTestBus()`     | Create deterministic test bus utilities              | Sync           | Reset emitted events between test cases                                            |

## Package Entry Points

| Import                      | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `@vielzeug/herald`          | Main runtime API and types                                 |
| `@vielzeug/herald/devtools` | `debugBus`, `debugBehaviorBus` — debug wrappers (dev only) |
| `@vielzeug/herald/test`     | Test helpers (`createTestBus`, `TestBus<T>` type)          |

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
  name?: string; // optional display name — appears in log prefixes and BusDisposedError messages; avoid sensitive/user-derived values
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

`EventStream<T>` — returned by `bus.events()`. Extends `AsyncGenerator<T>` with `AsyncDisposable`:

```ts
type EventStream<T> = AsyncGenerator<T> & AsyncDisposable;
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
  wait<K extends EventKey<T>>(event: K, opts?: { signal?: AbortSignal }): Promise<T[K]>;
  waitAny<const K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    events: K,
    opts?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>>;
  wildcardCount(): number;
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
  allEmitted(): { [K in EventKey<T>]?: T[K][] };
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

`onAny` listeners count is tracked separately via `wildcardCount()` and are not included in per-event `listenerCount()` results.

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

// Stop early with a break — subscription torn down automatically via AsyncDisposable
await using stream2 = bus.events('count');
for await (const n of stream2) {
  if (n > 100) break;
}
```

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

### `bus.wildcardCount()`

Signature: `wildcardCount() => number`

Returns the number of active `onAny` wildcard listeners. Wildcards are counted separately from event-specific listeners — this is the count that `listenerCount(event)` adds on top of the specific count for each event.

```ts
bus.onAny(logAll);
bus.onAny(trackAll);

bus.wildcardCount(); // 2
bus.listenerCount('user:login'); // 0 specific + 2 wildcard = 2
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
- The returned `BehaviorBus<T>` adds `current(event)`, `reset()`, and `snapshot()` methods.
- The replay buffer is only updated when dispatch actually runs — payloads rejected by `validatePayload` or blocked by middleware that omits `next()` are never buffered.
- **`once()` with a buffered value:** if a current value exists, the listener fires immediately (synchronously) and is never registered for future emits. Use `on()` if you need to receive the _next_ emit rather than the current state.

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

---

### `behaviorBus.snapshot()`

Signature: `snapshot() => Partial<T>`

Returns a plain object containing the most recently emitted value for every currently buffered event. Events with no value in the buffer are omitted from the result.

Useful for serializing the current state of all channels at once, for debugging, or for hydrating a new bus from a snapshot.

```ts
type UIEvents = { theme: 'light' | 'dark'; zoom: number; sidebar: boolean };

const bus = createBehaviorBus<UIEvents>({ theme: 'light', zoom: 1 });

bus.snapshot();
// → { theme: 'light', zoom: 1 }  (sidebar not buffered — omitted)

bus.emit('theme', 'dark');
bus.snapshot();
// → { theme: 'dark', zoom: 1 }

bus.reset('theme');
bus.snapshot();
// → { zoom: 1 }
```

## `pipeEvents()`

Signature: `pipeEvents<S, T>(source, target, entries, opts?) => Unsubscribe`

Forwards a selected subset of events from a source bus to a target bus. Source and target may have different event map types — only the listed keys must be compatible.

| Parameter | Type                                               | Description                                                                      |
| --------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `source`  | `Bus<S>`                                           | The bus to listen on                                                             |
| `target`  | `Bus<T>`                                           | The bus to forward events to                                                     |
| `entries` | `readonly [PipeEntry<S, T>, ...PipeEntry<S, T>[]]` | One or more string keys or `{ from, to }` renames — throws `RangeError` if empty |
| `opts`    | `{ signal?: AbortSignal }` (optional)              | Optional signal to stop forwarding early                                         |

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
pipeEvents(appBus, auditBus, ['user:login'], { signal: controller.signal });
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

### `testBus.allEmitted()`

Signature: `allEmitted() => { [K in EventKey<T>]?: T[K][] }`

Returns a snapshot object containing all recorded payloads for every event that has been emitted at least once. Keys absent from the result have never been emitted. Each call returns a new object — mutations do not affect internal records.

Useful for asserting that **no other events** were emitted beyond the ones being tested.

```ts
bus.emit('user:login', { userId: '1' });
bus.emit('theme:change', 'dark');

bus.allEmitted();
// => { 'user:login': [{ userId: '1' }], 'theme:change': ['dark'] }
```

---

### `testBus.dispose()`

Signature: `dispose() => void`

Clears recorded payloads and then calls the underlying `bus.dispose()`, removing all listeners and rejecting pending waits. Idempotent.

---

### `testBus.removeAllListeners()`

Signature: `removeAllListeners(event) => void`

Unsubscribes all listeners registered via `on()` for the given event key. Emission records are preserved — call `reset()` separately to clear them.

```ts
bus.on('user:login', handlerA);
bus.on('user:login', handlerB);
bus.emit('user:login', { userId: '1' });

bus.removeAllListeners('user:login');
bus.emit('user:login', { userId: '2' }); // neither handler fires

bus.emitted('user:login'); // => [{ userId: '1' }, { userId: '2' }] — records intact
```

::: tip Test-only utility
`removeAllListeners` is available on `TestBus` only — it is not part of the standard `Bus<T>` interface. Use unsubscribe handles or `{ signal }` options for lifecycle-managed cleanup in production code.
:::

## `combineSignals()`

Signature: `combineSignals(first: AbortSignal, ...rest: AbortSignal[]) => AbortSignal`

Returns a signal that aborts as soon as any of the provided signals abort. With a single argument, returns it directly (no allocation). Registers and cleans up its own event listeners — no leaks when no signal fires.

| Parameter | Type            | Description                                           |
| --------- | --------------- | ----------------------------------------------------- |
| `first`   | `AbortSignal`   | First signal; returned directly if no others provided |
| `...rest` | `AbortSignal[]` | Additional signals to race                            |

**Returns:** `AbortSignal` — aborts when any input aborts.

```ts
import { combineSignals, createBus } from '@vielzeug/herald';

const bus = createBus<AppEvents>();
const timeoutSignal = AbortSignal.timeout(5_000);

// Unsubscribe when the bus disposes OR after 5 seconds
const signal = combineSignals(bus.disposalSignal, timeoutSignal);
bus.on('user:login', handler, { signal });

// Three signals — no nesting required
const signal3 = combineSignals(userSignal, timeoutSignal, bus.disposalSignal);
```

::: tip Why `combineSignals` over `AbortSignal.any()`?
`AbortSignal.any([a, b])` is a platform equivalent, but it retains a strong reference to both signals until one fires. If neither signal ever fires, the internal `'abort'` listeners are never removed — a potential memory leak in long-lived buses.

`combineSignals(a, b)` uses `once: true` listeners that clean up immediately as soon as either signal fires, making it the safer choice for `disposalSignal`-scoped subscriptions.
:::

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
