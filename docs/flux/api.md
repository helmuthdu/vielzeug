---
title: Flux — API Reference
description: Complete reference for @vielzeug/flux streams, operators, channels, and adapters.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `stream()` | Create cold stream | Lazy | Return one teardown function |
| `pipe()` | Compose operators | Lazy | Source is first argument |
| `of()` / `from()` | Convert known values | Sync / mixed | `from()` promise cannot be aborted |
| `fromEvent()` | Adapt event target | Async | Unsubscribe removes listener |
| `interval()` / `timer()` | Create timed values | Async | Use `take()` or unsubscribe for intervals |
| `map()` / `filter()` / `scan()` | Transform values | Sync | Callback throws terminate stream |
| `switchMap()` / `mergeMap()` / `concatMap()` | Flatten streams | Mixed | `concatMap()` queue is bounded |
| `take()` / `takeUntil()` | Stop values | Mixed | Notifier emission completes output |
| `debounce()` / `timeout()` / `retry()` | Control time and failures | Async | `timeout()` measures inactivity |
| `merge()` / `concat()` / `combineLatest()` | Combine streams | Mixed | `combineLatest()` waits for every source |
| `toArray()` / `first()` / `last()` | Consume finite values | Async | Bound `toArray()` with `maxItems` |
| `toAsyncIterable()` | Use `for await` | Async | Capacity and overflow required |
| `createChannel()` | Imperative multicast boundary | Sync | Dispose to complete subscribers |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/flux` | Core streams, operators, consumers, errors, and types |
| `@vielzeug/flux/async` | `toAsyncIterable()` only |
| `@vielzeug/flux/subjects` | `createChannel()` and channel types |
| `@vielzeug/flux/ripple` | Ripple signal adapters |
| `@vielzeug/flux/courier` | Courier query and SSE adapters |
| `@vielzeug/flux/herald` | Herald bus adapters |
| `@vielzeug/flux/pulse` | Pulse event and presence adapters |

## Core

### `stream()`

```ts
stream<T>(producer: Producer<T>): Stream<T>
```

Creates cold reusable work. Producer runs once for every subscription.

| Parameter | Type | Description |
| --- | --- | --- |
| `producer` | `Producer<T>` | Emits through sink and returns optional teardown |

**Returns:** `Stream<T>`.

```ts
import { stream } from '@vielzeug/flux';

const ticks = stream<number>((sink) => {
  const id = setInterval(() => sink.next(Date.now()), 1_000);
  return () => clearInterval(id);
});
```

---

### `pipe()`

```ts
pipe<Input, Operators>(source: Stream<Input>, ...operators: Operators): Stream<Output>
```

Applies operators left to right while inferring output value type.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `Stream<Input>` | Source stream |
| `operators` | `Operator[]` | Operators applied in order |

**Returns:** transformed `Stream<Output>`.

```ts
import { map, of, pipe } from '@vielzeug/flux';

const labels = pipe(of(1, 2), map((value) => `#${value}`));
```

## Creation

### `of()`

```ts
of<T>(...values: T[]): Stream<T>
```

Emits every value synchronously, then completes.

```ts
import { of } from '@vielzeug/flux';

of(1, 2, 3).subscribe(console.log);
```

---

### `from()`

```ts
from<T>(source: Iterable<T> | AsyncIterable<T> | Promise<T>): Stream<T>
```

Converts iterable, async iterable, or promise into a stream. Cancellation stops iterable consumption and calls `return()` when available.

```ts
import { from } from '@vielzeug/flux';

from(Promise.resolve('ready')).subscribe({ error: console.error, next: console.log });
```

---

### `fromEvent()`

```ts
fromEvent<T = Event>(target, type: string): Stream<T>
```

Emits target events until subscription ends.

```ts
import { fromEvent } from '@vielzeug/flux';

fromEvent<MouseEvent>(document, 'click').subscribe(console.log);
```

---

### `interval()`

```ts
interval(options: IntervalOptions): Stream<number>
```

Emits incrementing values starting at zero.

| Option | Type | Description |
| --- | --- | --- |
| `every` | `number` | Non-negative interval duration in milliseconds |

---

### `timer()`

```ts
timer(options: TimerOptions): Stream<number>
```

Emits zero after `delay`; optionally continues at `interval`.

| Option | Type | Description |
| --- | --- | --- |
| `delay` | `number` | Non-negative initial delay in milliseconds |
| `interval` | `number` | Optional non-negative repeat duration |

## Transformation Operators

### `map()`

```ts
map<A, B>(project: (value: A) => B): Operator<A, B>
```

Maps every value. A thrown callback error terminates output.

---

### `filter()`

```ts
filter<T>(predicate: (value: T) => boolean): Operator<T, T>
```

Forwards values matching predicate.

---

### `scan()`

```ts
scan<T, A>(reducer: (state: A, value: T) => A, initial: A): Operator<T, A>
```

Emits accumulated state after every source value.

---

### `switchMap()`

```ts
switchMap<A, B>(project: (value: A) => Stream<B>): Operator<A, B>
```

Cancels previous inner stream when source emits.

---

### `mergeMap()`

```ts
mergeMap<A, B>(project: (value: A) => Stream<B>): Operator<A, B>
```

Runs every inner stream concurrently.

---

### `concatMap()`

```ts
concatMap<A, B>(project: (value: A) => Stream<B>, options: ConcatMapOptions): Operator<A, B>
```

Runs inner streams in order. Exceeding capacity errors output.

| Option | Type | Description |
| --- | --- | --- |
| `capacity` | `number` | Positive maximum queued source values |

## Control Operators

### `take()`

```ts
take<T>(count: number): Operator<T, T>
```

Forwards `count` values, cancels upstream, then completes. Count must be non-negative integer.

---

### `takeUntil()`

```ts
takeUntil<T>(notifier: AbortSignal | Stream<unknown>): Operator<T, T>
```

Completes when notifier aborts or emits.

---

### `debounce()`

```ts
debounce<T>(options: DebounceOptions): Operator<T, T>
```

Emits latest value after configured silence. Pending value flushes on source completion.

| Option | Type | Description |
| --- | --- | --- |
| `for` | `number` | Non-negative silence duration in milliseconds |

---

### `timeout()`

```ts
timeout<T>(options: TimeoutOptions): Operator<T, T>
```

Errors with `FluxTimeoutError` when source is silent too long.

| Option | Type | Description |
| --- | --- | --- |
| `after` | `number` | Non-negative inactivity duration in milliseconds |

---

### `retry()`

```ts
retry<T>(options: RetryOptions): Operator<T, T>
```

Resubscribes after source errors until attempts are exhausted.

| Option | Type | Description |
| --- | --- | --- |
| `attempts` | `number` | Non-negative retry count |
| `delay` | `number \| (attempt: number) => number` | Optional delay or backoff function |

## Combination

### `merge()`

```ts
merge<T>(...sources: Stream<T>[]): Stream<T>
```

Forwards values from all sources and completes after every source completes.

---

### `concat()`

```ts
concat<T>(...sources: Stream<T>[]): Stream<T>
```

Subscribes to each source only after previous source completes.

---

### `combineLatest()`

```ts
combineLatest<T extends readonly Stream<unknown>[]>(...sources: T): Stream<{ [K in keyof T]: T[K] extends Stream<infer V> ? V : never }>
```

Emits latest tuple after every source emits once. Completes without emission when a source completes before first value.

## Value Consumers

### `toArray()`

```ts
toArray<T>(source: Stream<T>, options: ToArrayOptions): Promise<T[]>
```

Collects finite output. Rejects on source error, abort, or `maxItems` overflow.

| Option | Type | Description |
| --- | --- | --- |
| `maxItems` | `number` | Non-negative maximum toArrayed values |
| `signal` | `AbortSignal` | Optional cancellation signal |

---

### `first()`

```ts
first<T>(source: Stream<T>, options?: ValueOptions): Promise<T>
```

Resolves first value and cancels source. Rejects on source error or abort.

---

### `last()`

```ts
last<T>(source: Stream<T>, options?: ValueOptions): Promise<T | undefined>
```

Resolves last value on completion, or `undefined` when source completes empty.

## Async Conversion

### `toAsyncIterable()`

```ts
toAsyncIterable<T>(source: Stream<T>, options: AsyncIterableOptions): AsyncIterable<T>
```

Converts push stream to async iterable with bounded queue.

| Option | Type | Description |
| --- | --- | --- |
| `capacity` | `number` | Positive queue capacity |
| `overflow` | `OverflowPolicy` | `error`, `drop-oldest`, or `drop-newest` |
| `signal` | `AbortSignal` | Optional cancellation signal |

## Channels

### `createChannel()`

```ts
createChannel<T>(options?: ChannelOptions<T>): Channel<T>
```

Creates imperative multicast boundary. Disposal completes subscribers.

> **`initial` + `replay` interaction:** When `initial` is set and `replay` is omitted, `replay` defaults to `1` so the initial value is retained. Setting `replay: 0` with `initial` throws `RangeError` — the initial value would be immediately dropped.

| Option | Type | Description |
| --- | --- | --- |
| `initial` | `T` | Optional initial replay value |
| `replay` | `number` | Non-negative retained value count |

## Adapters

### `@vielzeug/flux/ripple`

```ts
fromSignal<T>(source: Readable<T>): Stream<T>
toSignal<T>(source: Stream<T>, options: ToSignalOptions<T>): SignalBinding<T>
```

`fromSignal()` emits current value first. `toSignal()` preserves final value then disposes binding when source completes, errors, or supplied signal aborts. On source error, `toSignal()` calls `options.onError` if provided (otherwise logs via `console.error` in dev — in production the log is stripped and the error is silently swallowed), then disposes — the signal freezes at its last value. Pass `onError` to surface source errors in production builds.

### `@vielzeug/flux/courier`

```ts
fromQuery<T extends { key: readonly unknown[]; fetch: (...args: never[]) => Promise<unknown> }>(
  cache: { getSnapshot<T>(key: readonly unknown[]): T | null; subscribe(key: readonly unknown[], listener: () => void): () => void },
  definition: T,
): Stream<AsyncState<Awaited<ReturnType<T['fetch']>>> | null>
```

`fromQuery()` infers data from `definition.fetch` and emits Courier-compatible `AsyncState` snapshots.

### `@vielzeug/flux/herald`

```ts
fromBus<T extends EventMap, K extends EventKey<T>>(bus: Bus<T>, event: K): Stream<T[K]>
toBus<T extends EventMap, K extends EventKey<T>>(bus: Bus<T>, event: K): Operator<T[K], T[K]>
```

### `@vielzeug/flux/pulse`

```ts
fromPulse<T extends MessageMap, K extends EventKey<T>>(pulse: Pulse<T>, event: K): Stream<T[K]>
fromPresence<T>(presence: PresenceChannel<T>): Stream<ReadonlyMap<string, T>>
```

## Types

```ts
type Teardown = () => void;

type Subscription = {
  [Symbol.dispose](): void;
  readonly closed: boolean;
  unsubscribe(): void;
};

type Observer<T> = {
  complete?: () => void;
  error?: (reason: unknown) => void;
  next: (value: T) => void;
};

type SubscribeOptions = { signal?: AbortSignal };

type Sink<T> = {
  complete(): void;
  error(reason: unknown): void;
  next(value: T): void;
};

type Producer<T> = (sink: Sink<T>, signal: AbortSignal) => Teardown | void;
type Operator<A = unknown, B = unknown> = (source: Stream<A>) => Stream<B>;

interface Stream<T> {
  subscribe(observer: Observer<T> | ((value: T) => void), options?: SubscribeOptions): Subscription;
}

type OverflowPolicy = 'drop-newest' | 'drop-oldest' | 'error';
type AsyncIterableOptions = { capacity: number; overflow: OverflowPolicy; signal?: AbortSignal };
type IntervalOptions = { every: number };
type TimerOptions = { delay: number; interval?: number };
type DebounceOptions = { for: number };
type TimeoutOptions = { after: number };
type ConcatMapOptions = { capacity: number };
type RetryOptions = { attempts: number; delay?: number | ((attempt: number) => number) };
type ToArrayOptions = { maxItems: number; signal?: AbortSignal };
type ValueOptions = { signal?: AbortSignal };
type ChannelOptions<T> = { initial?: T; replay?: number };
type ToSignalOptions<T> = { initial: T; onError?: (reason: unknown) => void; signal?: AbortSignal };
type SignalBinding<T> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  readonly signal: Readable<T>;
  readonly value: T;
};
```

## Errors

### `FluxError`

Base Flux error. Use `instanceof FluxError` to narrow unknown values.

### `FluxTimeoutError`

Raised by `timeout()`. `ms` contains configured inactivity duration.
