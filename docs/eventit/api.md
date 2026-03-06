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

### EventListener

```ts
type EventListener<T> = (payload: T) => void;
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
type EventBusOptions = {
  maxListeners?: number;
  onError?: (err: unknown, event: string) => void;
};
```

**Properties:**

- **maxListeners** _(optional)_ — Maximum listeners per event before a warning is printed. Default: `100`.
- **onError** _(optional)_ — Custom error handler for listener errors. When provided, a throwing listener logs via this callback and execution continues. When absent, errors are re-thrown from `emit`.

---

### EventBus

```ts
type EventBus<T extends EventMap> = {
  on<K extends EventKey<T>>(event: K, listener: EventListener<T[K]>): Unsubscribe;
  once<K extends EventKey<T>>(event: K, listener: EventListener<T[K]>): Unsubscribe;
  off<K extends EventKey<T>>(event: K, listener?: EventListener<T[K]>): void;
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  clear(event?: EventKey<T>): void;
  has<K extends EventKey<T>>(event: K): boolean;
  listenerCount<K extends EventKey<T>>(event: K): number;
};
```

The public interface returned by `createEventBus`.

---

### TestEventBus

```ts
type TestEventBus<T extends EventMap> = {
  bus: EventBus<T>;
  emitted: Map<EventKey<T>, unknown[]>;
  dispose: () => void;
};
```

The object returned by `createTestEventBus`. See [Testing Utilities](#testing-utilities) below.

---

## createEventBus

```ts
function createEventBus<T extends EventMap>(options?: EventBusOptions): EventBus<T>
```

Creates and returns a new typed event bus.

**Type Parameters:**

- **T** — Event map type that declares event names and payload shapes.

**Parameters:**

- **options** _(optional)_ — `EventBusOptions` to configure max listeners and error handling.

**Returns:** `EventBus<T>`

**Example:**

```ts
type Events = {
  tick: { timestamp: number };
  stop: void;
};

const bus = createEventBus<Events>();
const busWithOptions = createEventBus<Events>({
  maxListeners: 20,
  onError: (err, event) => console.error(`[bus] error in ${event}:`, err),
});
```

---

## EventBus Interface

### `on`

```ts
on<K extends EventKey<T>>(event: K, listener: EventListener<T[K]>): Unsubscribe
```

Registers a persistent listener for `event`. Returns an unsubscribe function.

**Parameters:**

- **event** — Event name (key of event map).
- **listener** — Callback receiving the event payload.

**Returns:** `Unsubscribe` — call to remove this specific listener.

---

### `once`

```ts
once<K extends EventKey<T>>(event: K, listener: EventListener<T[K]>): Unsubscribe
```

Registers a listener that fires exactly once on the next emission, then unsubscribes automatically.

**Parameters:**

- **event** — Event name.
- **listener** — Callback receiving the payload.

**Returns:** `Unsubscribe` — call to cancel before the event fires.

---

### `off`

```ts
off<K extends EventKey<T>>(event: K, listener?: EventListener<T[K]>): void
```

Removes listeners for `event`.

- With `listener` — removes only that specific listener.
- Without `listener` — removes **all** listeners for the event.

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

### `has`

```ts
has<K extends EventKey<T>>(event: K): boolean
```

Returns `true` if the event has at least one active listener.

---

### `listenerCount`

```ts
listenerCount<K extends EventKey<T>>(event: K): number
```

Returns the number of currently registered listeners for `event`.

---

## Testing Utilities

### createTestEventBus

```ts
function createTestEventBus<T extends EventMap>(): TestEventBus<T>
```

Creates a test-friendly event bus that wraps a real `EventBus` and records all emitted payloads.

**Returns:** `TestEventBus<T>` with:

- **bus** — A full `EventBus<T>`. Listeners registered on `bus` fire normally.
- **emitted** — `Map<EventKey<T>, unknown[]>`. Each key maps to an array of payloads in emission order.
- **dispose** — Clears all listeners and resets `emitted`. After calling `dispose`, subsequent emits no longer record to `emitted`.

**Example:**

```ts
import { createTestEventBus } from '@vielzeug/eventit';

type Events = { score: number; reset: void };

test('records emitted payloads', () => {
  const { bus, emitted, dispose } = createTestEventBus<Events>();

  bus.emit('score', 10);
  bus.emit('score', 20);
  bus.emit('reset');

  expect(emitted.get('score')).toEqual([10, 20]);
  expect(emitted.has('reset')).toBe(true);

  dispose();
});
```
