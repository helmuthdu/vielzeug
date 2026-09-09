---
title: Herald — API Reference
description: Reference for typed synchronous events, subscriptions, waits, tracing, lifecycle, and test helpers.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `createBus()` | Create a typed temporal event bus | Sync | Events are not retained or replayed |
| `emit()` | Deliver one event | Sync | Returns `void`; rethrows the first listener failure after dispatch |
| `on()` / `once()` | Subscribe to one event | Sync | Keep the unsubscribe function or pass a signal |
| `onAny()` | Subscribe to every event | Sync | Payload is `unknown` |
| `wait()` / `waitAny()` | Await future one-shot events | Async | Disposal and external abort reject the promise |
| `tap()` | Observe bus runtime activity | Sync | Tap-handler failures are swallowed |
| `createTestBus()` | Record emitted payloads | Sync | Import from `/testing` |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/herald` | Bus factory, errors, and public bus types |
| `@vielzeug/herald/testing` | `createTestBus()` and `TestBus` |

## `createBus()`

```ts
function createBus<T extends EventMap = Record<string, unknown>>(
  options?: BusOptions<T>,
): Bus<T>
```

Creates a synchronous bus for future event delivery. Construction has no external side effects.

```ts
import { createBus } from '@vielzeug/herald';

interface Events {
  count: number;
  ready: void;
}

const bus = createBus<Events>({ maxListeners: 20, name: 'worker' });
bus.emit('count', 1);
bus.emit('ready');
bus.dispose();
```

### `BusOptions`

```ts
type BusOptions<T extends EventMap = EventMap> = {
  maxListeners?: number;
  name?: string;
};
```

| Field | Description |
| --- | --- |
| `maxListeners` | Development warning threshold applied separately to one event's listeners and wildcard listeners. Omit to disable the check. |
| `name` | Display name included in disposal errors and listener-threshold warnings. |

## `Bus`

```ts
type Bus<T extends EventMap> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  eventNames(): EventKey<T>[];
  listenerCount(event?: EventKey<T>): number;
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, options?: SubscribeOptions): Unsubscribe;
  onAny(listener: (event: EventKey<T>, payload: unknown) => void, options?: SubscribeOptions): Unsubscribe;
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, options?: { signal?: AbortSignal }): Unsubscribe;
  tap(handler: (event: HeraldEvent<T>) => void, options?: { signal?: AbortSignal }): Unsubscribe;
  wait<K extends EventKey<T>>(event: K, options?: { signal?: AbortSignal }): Promise<T[K]>;
  waitAny<const K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    events: K,
    options?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>>;
  wildcardCount(): number;
};
```

### `emit()`

Calls a snapshot of event-specific listeners synchronously, then wildcard listeners, then emits an `emit` trace event. It always returns `void`. Synchronous listener failures produce `error` trace events without stopping delivery; after dispatch, the first failure is rethrown.

After disposal, emission is a no-op.

### `on()` and `once()`

```ts
type Listener<T> = (payload: T) => void;
type SubscribeOptions = { once?: boolean; signal?: AbortSignal };
type Unsubscribe = () => void;
```

`on()` returns an idempotent unsubscribe function. `{ once: true }` is equivalent to `once()`. Once-listeners unsubscribe before invocation. An already-aborted signal creates no subscription.

### `onAny()`

Receives `(event, payload)` after event-specific listeners. It supports both `signal` and `once`. Wildcard listeners are excluded from `listenerCount()` and reported by `wildcardCount()`.

### `wait()`

Resolves with the next payload for one event. It rejects with the external signal's reason when aborted, or `BusDisposedError` when bus disposal wins. Earlier emissions are not replayed.

### `waitAny()`

Requires at least two event keys at compile time and runtime. It resolves once with a typed `{ event, payload }` discriminated union and removes every losing subscription.

```ts
const result = await bus.waitAny(['count', 'ready']);
if (result.event === 'count') console.log(result.payload);
```

### Listener inspection

- `listenerCount(event)` returns specific listeners for one key.
- `listenerCount()` returns all specific listeners.
- `wildcardCount()` returns `onAny()` listeners.
- `eventNames()` returns keys with active specific listeners.

### `tap()`

Observes runtime activity without affecting delivery. It returns an idempotent unsubscribe function and accepts an ownership signal. Tap-handler errors are swallowed.

```ts
const stop = bus.tap((event) => {
  if (event.type === 'error') recordListenerFailure(event.error);
});
```

### Disposal

`dispose()` is permanent and idempotent. It emits a final `dispose` trace event, aborts `disposalSignal` with `BusDisposedError`, rejects pending waits, removes subscriptions, and clears taps. `[Symbol.dispose]()` delegates to it.

## Runtime Events

```ts
type HeraldEvent<T extends EventMap = EventMap> =
  | { readonly event: EventKey<T>; readonly listeners: number; readonly payload: unknown; readonly type: 'emit' }
  | { readonly event: EventKey<T>; readonly type: 'subscribe' }
  | { readonly event: EventKey<T>; readonly type: 'unsubscribe' }
  | { readonly type: 'subscribe-any' }
  | { readonly type: 'unsubscribe-any' }
  | { readonly error: unknown; readonly event: EventKey<T>; readonly type: 'error' }
  | { readonly type: 'dispose' };
```

`listeners` on an `emit` event counts every specific and wildcard listener invoked, including listeners that threw. Runtime events intentionally contain no timestamp; observers can add one using their own clock.

## Shared Types

```ts
type EventMap = object;
type EventKey<T extends EventMap> = Extract<keyof T, string>;

type WaitAnyResult<T extends EventMap, K extends readonly EventKey<T>[]> = {
  [I in keyof K]: K[I] extends EventKey<T>
    ? { event: K[I]; payload: T[K[I]] }
    : never;
}[number];
```

Interfaces and object type aliases are valid event maps. Only string keys participate in the bus API.

## Testing

### `createTestBus()`

```ts
import { createTestBus } from '@vielzeug/herald/testing';

function createTestBus<T extends EventMap = Record<string, unknown>>(
  options?: BusOptions<T>,
): TestBus<T>
```

Creates a regular bus that records dispatches before listeners run.

### `TestBus`

```ts
type TestBus<T extends EventMap> = Bus<T> & {
  allEmitted(): { [K in EventKey<T>]?: T[K][] };
  emitted<K extends EventKey<T>>(event: K): T[K][];
  emittedCount<K extends EventKey<T>>(event: K): number;
  reset(): void;
};
```

`emitted()` and `allEmitted()` return array snapshots. `reset()` clears records without affecting subscriptions. Disposal clears records and the underlying bus. To prevent prototype mutation in the returned plain object, `allEmitted()` omits records named `__proto__`, `constructor`, or `prototype`; `emitted(event)` remains available for those keys.

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `BusDisposedError` | Bus disposal aborts `disposalSignal` or interrupts `wait()` / `waitAny()` | Configured bus name appears in the message |
| `HeraldConfigError` | Runtime `waitAny()` input contains fewer than two keys | Extends `HeraldError` |
| `HeraldError` | Base class for Herald-originated errors | Use `instanceof HeraldError` |
