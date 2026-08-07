---
title: Herald — API Reference
description: Reference for typed temporal event delivery, lifecycle ownership, and compatible event piping.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createBus()` | Create typed temporal event bus | Sync | `emit()` and middleware are synchronous |
| `pipeEvents()` | Forward compatible source events | Sync | Payloads must be assignable to target event |
| `combineSignals()` | Abort when any input aborts | Sync | Public composition has no manual teardown |
| `createTestBus()` | Record dispatched test events | Sync | Available from `/testing` only |
| `debugBus()` | Create console-debug instrumented bus | Sync | Available from `/devtools` only |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/herald` | Runtime bus, pipes, public types, and errors |
| `@vielzeug/herald/testing` | `createTestBus()` and `TestBus` |
| `@vielzeug/herald/devtools` | `debugBus()` |

## Core Functions

### `createBus()`

```ts
function createBus<T extends EventMap = Record<string, unknown>>(
  options?: BusOptions<T>,
): Bus<T>;
```

Creates a synchronous bus for future event delivery.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `BusOptions<T>` | Optional middleware, validation, error handling, logging, and listener threshold configuration. |

**Returns:** `Bus<T>`.

```ts
import { createBus } from '@vielzeug/herald';

interface Events {
  count: number;
  ready: void;
}

const bus = createBus<Events>();
bus.emit('count', 1);
bus.emit('ready');
bus.dispose();
```

---

### `pipeEvents()`

```ts
function pipeEvents<S extends EventMap, T extends EventMap>(
  source: Bus<S>,
  target: Bus<T>,
  entries: readonly [PipeEntry<S, T>, ...PipeEntry<S, T>[]],
  options?: { signal?: AbortSignal },
): Unsubscribe;
```

Forwards listed compatible events until manually stopped, either bus disposes, or `options.signal` aborts.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `Bus<S>` | Bus that emits source events. |
| `target` | `Bus<T>` | Bus that receives compatible events. |
| `entries` | non-empty `PipeEntry` tuple | Same-name keys or compatible `{ from, to }` mappings. |
| `options.signal` | `AbortSignal` | Optional pipe lifetime signal. |

**Returns:** Idempotent `Unsubscribe` function.

```ts
import { createBus, pipeEvents } from '@vielzeug/herald';

interface SourceEvents {
  'auth:login': { id: string };
}

interface TargetEvents {
  'user:authenticated': { id: string };
}

const source = createBus<SourceEvents>();
const target = createBus<TargetEvents>();
const stop = pipeEvents(source, target, [{ from: 'auth:login', to: 'user:authenticated' }]);

stop();
source.dispose();
target.dispose();
```

---

### `combineSignals()`

```ts
function combineSignals(first: AbortSignal, ...rest: AbortSignal[]): AbortSignal;
```

Returns a signal aborted with first input signal's reason.

**Returns:** `AbortSignal`.

```ts
import { combineSignals } from '@vielzeug/herald';

const signal = combineSignals(AbortSignal.timeout(1_000), controller.signal);
```

Input listeners remain until an input aborts. Bus APIs that accept `{ signal }` clean their internal signal composition when their owned operation ends.

## Types

### `EventMap` and `EventKey`

```ts
type EventMap = object;
type EventKey<T extends EventMap> = Extract<keyof T, string>;
```

`EventMap` accepts interfaces and type aliases. Only string keys are event names.

---

### `BusOptions`

```ts
type BusOptions<T extends EventMap> = {
  logger?: BusLogger;
  maxListeners?: number;
  middleware?: readonly Middleware<T>[];
  name?: string;
  onError?: (context: EmissionErrorContext<T>) => void;
  validatePayload?: <K extends EventKey<T>>(event: K, payload: T[K]) => void;
};
```

| Field | Description |
| --- | --- |
| `logger` | Optional debug and warning output. |
| `maxListeners` | Warn when one event exceeds this active-listener count. |
| `middleware` | Synchronous dispatch middleware. |
| `name` | Display name in debug logs and disposal errors. |
| `onError` | Handles listener and validation errors instead of rethrowing. |
| `validatePayload` | Runs before middleware and listeners. |

---

### `Bus`

```ts
interface Bus<T extends EventMap> {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): number;
  eventNames(): EventKey<T>[];
  events<K extends EventKey<T>>(event: K, options?: { maxBuffer?: number; signal?: AbortSignal }): EventStream<T[K]>;
  listenerCount(event?: EventKey<T>): number;
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, options?: SubscribeOptions): Unsubscribe;
  onAny(listener: (event: EventKey<T>, payload: unknown) => void, options?: SubscribeOptions): Unsubscribe;
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, options?: { signal?: AbortSignal }): Unsubscribe;
  wait<K extends EventKey<T>>(event: K, options?: { signal?: AbortSignal }): Promise<T[K]>;
  waitAny<const K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    events: K,
    options?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>>;
  wildcardCount(): number;
}
```

`emit()` returns listener count or `0` after disposal, blocked middleware, or handled validation rejection.

---

### `BusLogger`, `Listener`, `SubscribeOptions`, and `Unsubscribe`

```ts
type BusLogger = {
  debug?: (message: string) => void;
  warn?: (message: string) => void;
};

type Listener<T> = (payload: T) => void;
type SubscribeOptions = { once?: boolean; signal?: AbortSignal };
type Unsubscribe = () => void;
```

---

### `EmissionErrorContext` and `Middleware`

```ts
type EmissionErrorContext<T extends EventMap> = {
  err: unknown;
  event: EventKey<T>;
  payload: unknown;
  timestamp: number;
};

type Middleware<T extends EventMap> = (
  event: EventKey<T>,
  payload: unknown,
  next: () => void,
) => void;
```

Call middleware `next()` synchronously at most once. Omit it to block dispatch.

---

### `EventStream` and `WaitAnyResult`

```ts
type EventStream<T> = AsyncGenerator<T> & AsyncDisposable;

type WaitAnyResult<T extends EventMap, K extends readonly EventKey<T>[]> = {
  [I in keyof K]: K[I] extends EventKey<T> ? { event: K[I]; payload: T[K[I]] } : never;
}[number];
```

---

### `PipeableKey`, `RenamedPipeEntry`, and `PipeEntry`

```ts
type PipeableKey<S extends EventMap, T extends EventMap> = {
  [K in EventKey<S> & EventKey<T>]: S[K] extends T[K] ? K : never;
}[EventKey<S> & EventKey<T>];

type RenamedPipeEntry<S extends EventMap, T extends EventMap> = {
  [From in EventKey<S>]: {
    [To in EventKey<T>]: S[From] extends T[To] ? { from: From; to: To } : never;
  }[EventKey<T>];
}[EventKey<S>];

type PipeEntry<S extends EventMap, T extends EventMap> =
  | PipeableKey<S, T>
  | RenamedPipeEntry<S, T>;
```

## Testing and Devtools

### `createTestBus()`

```ts
function createTestBus<T extends EventMap = Record<string, unknown>>(
  options?: BusOptions<T>,
): TestBus<T>;
```

Creates a bus that records dispatched payloads.

**Returns:** `TestBus<T>`.

### `TestBus`

```ts
type TestBus<T extends EventMap> = Bus<T> & {
  allEmitted(): { [K in EventKey<T>]?: T[K][] };
  emitted<K extends EventKey<T>>(event: K): T[K][];
  emittedCount<K extends EventKey<T>>(event: K): number;
  reset(): void;
};
```

### `debugBus()`

```ts
function debugBus<T extends EventMap>(
  options?: Omit<BusOptions<T>, 'logger'> & { logger?: { warn?: BusLogger['warn'] } },
): Bus<T>;
```

Creates a bus with `console.debug` logging. Import from `@vielzeug/herald/devtools`.

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `BusDisposedError` | `wait()` or `waitAny()` interrupted by disposal | Bus name appears when configured. |
| `HeraldConfigError` | Invalid stream buffer, empty pipe entries, or fewer than two `waitAny()` events | — |
| `HeraldError` | Base class for Herald-originated errors | `HeraldError.is(error)` narrows subclasses. |
