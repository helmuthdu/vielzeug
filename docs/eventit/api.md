---
title: Eventit — API Reference
description: Complete API reference for eventit with type signatures and parameter documentation.
---

# Eventit API Reference

[[toc]]

## Types

### EventMap

```ts
type EventMap = Record<string, unknown>;
```

Base constraint for event map types. Every key is an event name; the value is its payload type (use `void` for signal events with no payload).

---

### EventKey

```ts
type EventKey<T extends EventMap> = string & keyof T;
```

A string that must be a key of the provided event map.

---

### Listener

```ts
type Listener<T> = (payload: T) => void;
```

Callback function that receives the event payload.

**Parameters:**

- **payload** — Event payload as declared in the event map.

---

### Unsubscribe

```ts
type Unsubscribe = () => void;
```

Function returned by `on` and `once`. Call it to remove that specific listener.

---

### EventBusOptions

```ts
type EventBusOptions<T extends EventMap = EventMap> = {
  onError?: (err: unknown, event: EventKey<T>) => void;
  onEmit?:  (event: EventKey<T>, payload: unknown) => void;
};
```

**Properties:**

- **onError** _(optional)_ — Custom error handler for listener errors. When provided, a throwing listener is reported via this callback and execution continues with the remaining listeners. When absent, errors are re-thrown from `emit`.
- **onEmit** _(optional)_ — Called on every `emit`, before any listeners run. Receives the event key (typed as a union of valid event names) and the raw payload. Useful for logging, debugging, and testing.

---

### EventBus

```ts
type EventBus<T extends EventMap> = {
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe;
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe;
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  clear(event?: EventKey<T>): void;
  dispose(): void;
};
```

The public interface returned by `eventBus`.

---

### TestBus

```ts
type TestBus<T extends EventMap> = {
  bus: EventBus<T>;
  emitted: Map<EventKey<T>, unknown[]>;
  reset(): void;
  dispose(): void;
};
```

The object returned by `testEventBus`. See [Testing Utilities](#testing-utilities) below.

---

## eventBus

```ts
function eventBus<T extends EventMap>(options?: EventBusOptions<T>): EventBus<T>
```

Creates and returns a new typed event bus.

**Type Parameters:**

- **T** — Event map type that declares event names and payload shapes.

**Parameters:**

- **options** _(optional)_ — `EventBusOptions<T>` to configure error handling and emit observability.

**Returns:** `EventBus<T>`

**Example:**

```ts
type Events = {
  tick: { timestamp: number };
  stop: void;
};

const bus = eventBus<Events>();

const busWithOptions = eventBus<Events>({
  onError: (err, event) => console.error(`[bus] error in ${event}:`, err),
  onEmit:  (event, payload) => console.debug(`[bus] emit ${event}`, payload),
});
```

---

## EventBus Interface

### `on`

```ts
on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe
```

Registers a persistent listener for `event`. Returns an unsubscribe function.

**Parameters:**

- **event** — Event name (key of event map).
- **listener** — Callback receiving the event payload.

**Returns:** `Unsubscribe` — call to remove this specific listener.

---

### `once`

```ts
once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe
```

Registers a listener that fires exactly once on the next emission, then unsubscribes automatically.

**Parameters:**

- **event** — Event name.
- **listener** — Callback receiving the payload.

**Returns:** `Unsubscribe` — call to cancel before the event fires.

---

### `emit`

```ts
// for events with a payload:
emit<K extends EventKey<T>>(event: K, payload: T[K]): void
// for void events:
emit<K extends EventKey<T>>(event: K): void
```

Calls all registered listeners for `event` synchronously, in registration order.

- If `onError` is set, catching listener errors and continuing.
- If `onError` is not set, any listener error propagates to the caller.

---

### `clear`

```ts
clear(event?: EventKey<T>): void
```

Removes listeners.

- With `event` — removes all listeners for that specific event.
- Without `event` — removes all listeners for all events.

---

### `dispose`

```ts
dispose(): void
```

Permanently tears down the bus. After calling `dispose`:

- All listeners are removed.
- `emit` becomes a no-op — subsequent calls are silently ignored.
- `on` and `once` return a no-op unsubscribe; the listener is never stored.

Useful for component or module teardown where the bus should never fire again.

---

## Testing Utilities

### testEventBus

```ts
function testEventBus<T extends EventMap>(
  options?: Omit<EventBusOptions<T>, 'onEmit'>
): TestBus<T>
```

Creates a test-friendly event bus that records all emitted payloads via the `onEmit` hook.

**Returns:** `TestBus<T>` with:

- **bus** — A full `EventBus<T>`. Listeners registered on `bus` fire normally.
- **emitted** — `Map<EventKey<T>, unknown[]>`. Each key maps to an array of payloads in emission order.
- **reset** — Clears `emitted` records without disposing or affecting registered listeners.
- **dispose** — Clears all listeners, disposes the bus, and resets `emitted`.

> `onEmit` is reserved internally for recording; pass `onError` via `options` if needed.

**Example:**

```ts
import { testEventBus } from '@vielzeug/eventit';

type Events = { score: number; reset: void };

test('records emitted payloads', () => {
  const { bus, emitted, reset, dispose } = testEventBus<Events>();

  bus.emit('score', 10);
  bus.emit('score', 20);
  bus.emit('reset');

  expect(emitted.get('score')).toEqual([10, 20]);
  expect(emitted.has('reset')).toBe(true);

  reset();   // clear records, listeners still work
  dispose(); // tear everything down
});
```
