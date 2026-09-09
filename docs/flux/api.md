---
title: Flux — API Reference
description: Complete reference for @vielzeug/flux streams, operators, channels, and structural bridges.
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
| `switchMap()` / `mergeMap()` / `concatMap()` | Flatten streams | Mixed | `mergeMap()` concurrency and queue are bounded; `concatMap()` queue is bounded |
| `take()` / `takeUntil()` | Stop values | Mixed | Notifier emission completes output |
| `debounce()` / `timeout()` / `retry()` | Control time and failures | Async | `timeout()` measures inactivity |
| `merge()` / `concat()` / `combineLatest()` | Combine streams | Mixed | `combineLatest()` waits for every source |
| `toArray()` / `first()` / `last()` | Consume finite values | Async | Bound `toArray()` with `maxItems` |
| `toAsyncIterable()` | Use `for await` | Async | Capacity and overflow required |
| `createChannel()` | Imperative multicast boundary | Sync | Dispose to complete subscribers |
| `fromStore()` | Bridge snapshot-based state | Lazy | Snapshot and subscribe are both required |
| `fromSubscribe()` | Bridge callback-delivered values | Lazy | Registration must return teardown |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/flux` | Core streams, operators, consumers, errors, and types |
| `@vielzeug/flux/async` | `toAsyncIterable()` only |
| `@vielzeug/flux/subjects` | `createChannel()` and channel types |

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
fromEvent<T = Event>(
  target: {
    addEventListener(type: string, listener: (event: T) => void): void;
    removeEventListener(type: string, listener: (event: T) => void): void;
  },
  type: string,
): Stream<T>
```

Emits target events until subscription ends.

```ts
import { fromEvent } from '@vielzeug/flux';

fromEvent<MouseEvent>(document, 'click').subscribe(console.log);
```

---

### `interval()`

```ts
interval(every: number): Stream<number>
```

Emits incrementing values starting at zero.

| Parameter | Type | Description |
| --- | --- | --- |
| `every` | `number` | Interval duration from 0 through 2,147,483,647 milliseconds |

---

### `timer()`

```ts
timer(options: TimerOptions): Stream<number>
```

Emits zero after `delay`; optionally continues at `interval`.

| Option | Type | Description |
| --- | --- | --- |
| `delay` | `number` | Initial delay from 0 through 2,147,483,647 milliseconds |
| `interval` | `number` | Optional repeat duration from 0 through 2,147,483,647 milliseconds |

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
mergeMap<A, B>(project: (value: A) => Stream<B>, options: FlattenOptions): Operator<A, B>
```

Runs inner streams with bounded concurrency and queue capacity. Exceeding capacity errors output with `FluxCapacityError`.

| Option | Type | Description |
| --- | --- | --- |
| `concurrency` | `number \| Infinity` | Maximum concurrently active inner subscriptions |
| `capacity` | `number` | Positive maximum queued source values (required when `concurrency` is finite) |

---

### `concatMap()`

```ts
concatMap<A, B>(project: (value: A) => Stream<B>, options: { capacity: number }): Operator<A, B>
```

Runs inner streams in order (`concurrency: 1`). Exceeding capacity errors output with `FluxCapacityError`.

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
debounce<T>(duration: number): Operator<T, T>
```

Emits latest value after configured silence. Pending value flushes on source completion.

| Parameter | Type | Description |
| --- | --- | --- |
| `duration` | `number` | Silence duration from 0 through 2,147,483,647 milliseconds |

---

### `timeout()`

```ts
timeout<T>(duration: number): Operator<T, T>
```

Errors with `FluxTimeoutError` when source is silent too long.

| Parameter | Type | Description |
| --- | --- | --- |
| `duration` | `number` | Inactivity duration from 0 through 2,147,483,647 milliseconds |

---

### `retry()`

```ts
retry<T>(options: RetryOptions): Operator<T, T>
```

Resubscribes after source errors until attempts are exhausted.

| Option | Type | Description |
| --- | --- | --- |
| `attempts` | `number` | Non-negative retry count |
| `delay` | `number \| (attempt: number) => number` | Optional delay/backoff returning 0 through 2,147,483,647 milliseconds |

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

Collects finite output. Rejects on source error, the supplied signal's abort reason, or `maxItems` overflow.

| Option | Type | Description |
| --- | --- | --- |
| `maxItems` | `number` | Non-negative maximum toArrayed values |
| `signal` | `AbortSignal` | Optional cancellation signal |

---

### `first()`

```ts
first<T>(source: Stream<T>, options?: ValueOptions<T>): Promise<T>
```

Resolves first value and cancels source. Rejects on source error, the supplied signal's abort reason, or empty completion (`FluxEmptyError`); pass `defaultValue` to resolve instead.

---

### `last()`

```ts
last<T>(source: Stream<T>, options?: ValueOptions<T>): Promise<T>
```

Resolves last value on completion. Rejects on source error, the supplied signal's abort reason, or empty completion (`FluxEmptyError`); pass `defaultValue` to resolve instead.

## Async Conversion

### `toAsyncIterable()`

```ts
toAsyncIterable<T>(source: Stream<T>, options: AsyncIterableOptions): AsyncIterable<T>
```

Converts a push stream to an async iterable with a bounded queue. External cancellation rejects pending iteration with `signal.reason`; explicit iterator `return()` completes normally. Overflow `"error"` rejects with `FluxCapacityError`; unsupported policies throw `RangeError` before subscription.

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

Creates an imperative multicast boundary. Disposal completes subscribers and releases replay and pending values.

> **`initial` + `replay` interaction:** When `initial` is set and `replay` is omitted, `replay` defaults to `1` so the initial value is retained. Setting `replay: 0` with `initial` throws `RangeError` — the initial value would be immediately dropped.

| Option | Type | Description |
| --- | --- | --- |
| `initial` | `T` | Optional initial replay value |
| `replay` | `number` | Non-negative retained value count |

## Structural adapters

### `fromStore()`

```ts
fromStore<T>(source: {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
}): Stream<T>
```

Bridges snapshot-based state without package-specific dependencies. It emits the current snapshot, subscribes, rechecks for a subscription-time change, and reads the latest snapshot after each notification. Snapshot failure terminates without subscribing.

### `fromSubscribe()`

```ts
fromSubscribe<T>(subscribe: (listener: (value: T) => void) => () => void): Stream<T>
```

Bridges callback-delivered event values. Registration runs once per Flux subscription and its teardown runs when that subscription closes.

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

type Producer<T> = (sink: Sink<T>, signal: AbortSignal) => Teardown | undefined;
type Operator<A = unknown, B = unknown> = (source: Stream<A>) => Stream<B>;

interface Stream<T> {
  subscribe(observer: Observer<T> | ((value: T) => void), options?: SubscribeOptions): Subscription;
}

type OverflowPolicy = 'drop-newest' | 'drop-oldest' | 'error';
type AsyncIterableOptions = { capacity: number; overflow: OverflowPolicy; signal?: AbortSignal };
type TimerOptions = { delay: number; interval?: number };
type FlattenOptions = { concurrency: number; capacity: number };
type RetryOptions = { attempts: number; delay?: number | ((attempt: number) => number) };
type ToArrayOptions = { maxItems: number; signal?: AbortSignal };
type ValueOptions<T> = { signal?: AbortSignal; defaultValue?: T };
type ChannelOptions<T> = { initial?: T; replay?: number };
type Channel<T> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  send(value: T): void;
  readonly stream: Stream<T>;
};
```

## Errors

### `FluxError`

Base Flux error. Use `instanceof FluxError` to narrow unknown values.

### `FluxTimeoutError`

Raised by `timeout()`. `ms` contains configured inactivity duration.

### `FluxEmptyError`

Raised by `first()` and `last()` when the source completes without emitting any value.

### `FluxCapacityError`

Raised when a bounded buffer (`mergeMap`, `concatMap`, `toArray`, async iteration) overflows. `capacity` contains the configured limit.
