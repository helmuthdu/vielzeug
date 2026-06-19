---
title: Flux — API Reference
description: Complete API reference for @vielzeug/flux.
---

[[toc]]

## API Overview

| Symbol                    | Purpose                                    | Mode  | Gotcha                                    |
| ------------------------- | ------------------------------------------ | ----- | ----------------------------------------- |
| `flux()`                  | Cold stream factory                        | Sync  | Producer runs once per subscriber         |
| `createSubject()`         | Hot multicasting subject                   | Sync  | No replay; late subscribers miss values   |
| `createBehaviorSubject()` | Subject replaying latest value             | Sync  | Initial value required                    |
| `of()`                    | Emit static values synchronously           | Sync  | Completes immediately                     |
| `from()`                  | Iterable / Promise / AsyncIterable         | Mixed | Error path must be handled                |
| `fromEvent()`             | DOM / EventTarget events                   | Async | Call `unsub()` to remove listener         |
| `interval()`              | Periodic counter                           | Async | Does not auto-complete                    |
| `timer()`                 | Delayed single emission                    | Async | Completes after emission                  |
| `switchMap()`             | Map to inner flux, cancel on new emission  | Mixed | Cancels in-flight inner subscriptions     |
| `debounce()`              | Emit after silence period                  | Async | Pending value dropped on source complete  |
| `timeout()`               | Error on inactivity                        | Async | Timer resets on each emission             |
| `shareReplay()`           | Replay latest N to late subscribers        | Sync  | Holds strong reference to buffer          |
| `toPromise()`             | Resolve with last value                    | Async | Rejects if source errors                  |
| `toArray()`               | Collect all values to array                | Async | Rejects if source errors                  |
| `fromSignal()`            | Ripple signal → Flux (emits immediately)   | Sync  | Emits current value on subscribe          |
| `toSignal()`              | Flux → Ripple signal                       | Async | Call `sig.dispose()` to stop tracking     |

---

## Package Entry Point

| Import          | Purpose                |
| --------------- | ---------------------- |
| `@vielzeug/flux` | All exports and types |

---

## Core

### `flux()`

```ts
flux<T>(producer: Producer<T>, options?: FluxOptions): Flux<T>;
```

Creates a cold `Flux`. The `producer` runs once per subscriber and returns a cleanup function.

**Parameters:**

| Parameter  | Type                | Description                                           |
| ---------- | ------------------- | ----------------------------------------------------- |
| `producer` | `Producer<T>`       | Called on each `subscribe()`; returns cleanup or void |
| `options`  | `FluxOptions`       | Optional configuration (currently reserved)           |

**Returns:** `Flux<T>`

**Example:**

```ts
import { flux } from '@vielzeug/flux';

const source$ = flux<number>((observer) => {
  const id = setInterval(() => observer.next(Date.now()), 1000);
  return () => clearInterval(id);
});

const unsub = source$.subscribe(console.log);
setTimeout(unsub, 5000); // stop after 5 seconds
```

---

## Subjects

### `createSubject()`

```ts
createSubject<T>(): Subject<T>;
```

Returns a hot multicasting `Subject`. Emits to all current subscribers; late subscribers miss past values.

**Returns:** `Subject<T>`

**Methods:**

| Method       | Signature                    | Description                          |
| ------------ | ---------------------------- | ------------------------------------ |
| `emit()`     | `(value: T) => void`         | Push a value to all subscribers      |
| `complete()` | `() => void`                 | Complete all subscriptions           |
| `error()`    | `(err: unknown) => void`     | Error all subscriptions              |
| `dispose()`  | `() => void`                 | Permanently shut down the subject    |

**Example:**

```ts
import { createSubject } from '@vielzeug/flux';

const click$ = createSubject<MouseEvent>();
button.addEventListener('click', (e) => click$.emit(e));
```

---

### `createBehaviorSubject()`

```ts
createBehaviorSubject<T>(initial: T, options?: BehaviorSubjectOptions<T>): BehaviorSubject<T>;
```

Like `createSubject`, but replays the most recent value to every new subscriber.

**Parameters:**

| Parameter | Type                        | Description                          |
| --------- | --------------------------- | ------------------------------------ |
| `initial` | `T`                         | Value emitted immediately on subscribe|
| `options` | `BehaviorSubjectOptions<T>` | Optional `equals` comparator         |

**Returns:** `BehaviorSubject<T>`

**Additional members:**

| Member   | Type | Description                        |
| -------- | ---- | ---------------------------------- |
| `value`  | `T`  | Read the current value (getter)    |

**Example:**

```ts
import { createBehaviorSubject } from '@vielzeug/flux';

const theme$ = createBehaviorSubject<'light' | 'dark'>('light');
theme$.subscribe((t) => document.body.dataset.theme = t);
theme$.emit('dark');
```

---

## Creation Operators

### `of()`

```ts
of<T>(...values: T[]): Flux<T>;
```

Emits all `values` synchronously then completes.

---

### `from()`

```ts
from<T>(source: Iterable<T> | AsyncIterable<T> | Promise<T>): Flux<T>;
```

Converts an iterable, async iterable, or promise to a `Flux`. Errors from the source are forwarded to `observer.error`.

---

### `fromEvent()`

```ts
fromEvent<T>(target: EventTarget, eventName: string): Flux<T>;
```

Emits every time `target` fires `eventName`. Removes the listener when unsubscribed.

---

### `interval()`

```ts
interval(ms: number): Flux<number>;
```

Emits an incrementing integer (starting at `0`) every `ms` milliseconds. Does not complete; must be unsubscribed or combined with `take()`.

---

### `timer()`

```ts
timer(delay: number, intervalMs?: number): Flux<number>;
```

Emits `0` after `delay` ms, then (if `intervalMs` given) emits incrementing values every `intervalMs` ms.

---

### `empty()`

```ts
empty<T>(): Flux<T>;
```

Completes immediately without emitting any values.

---

### `never()`

```ts
never<T>(): Flux<T>;
```

Never emits, never completes, never errors.

---

### `throwError()`

```ts
throwError<T>(error: unknown): Flux<T>;
```

Errors immediately with the given `error`.

---

## Transformation Operators

### `map()`

```ts
map<T, U>(fn: (value: T) => U): Operator<T, U>;
```

Applies `fn` to each value.

---

### `filter()`

```ts
filter<T>(predicate: (value: T) => boolean): Operator<T, T>;
```

Emits only values for which `predicate` returns `true`.

---

### `scan()`

```ts
scan<T, U>(accumulator: (acc: U, value: T) => U, seed: U): Operator<T, U>;
```

Applies `accumulator` on each value; emits the running result.

---

### `switchMap()`

```ts
switchMap<T, U>(fn: (value: T) => Flux<U>): Operator<T, U>;
```

For each emission maps to an inner `Flux`; cancels the previous inner subscription when a new outer value arrives.

---

### `flatMap()`

```ts
flatMap<T, U>(fn: (value: T) => Flux<U>): Operator<T, U>;
```

Maps to inner fluxes and merges them concurrently.

---

### `concatMap()`

```ts
concatMap<T, U>(fn: (value: T) => Flux<U>): Operator<T, U>;
```

Maps to inner fluxes and subscribes to them sequentially, waiting for each to complete.

---

### `distinctUntilChanged()`

```ts
distinctUntilChanged<T>(comparator?: (a: T, b: T) => boolean): Operator<T, T>;
```

Suppresses consecutive duplicate values. Uses `Object.is` by default.

---

### `startWith()`

```ts
startWith<T>(...values: T[]): Operator<T, T>;
```

Prepends `values` before the first source emission.

---

### `bufferCount()`

```ts
bufferCount<T>(size: number, every?: number): Operator<T, T[]>;
```

Collects emissions into arrays of length `size`. Starts a new buffer every `every` emissions (default: `size`, non-overlapping). A partial buffer is flushed when the source completes. Values of `size < 1` are treated as `1`.

---

### `pairwise()`

```ts
pairwise<T>(): Operator<T, [T, T]>;
```

Emits `[previous, current]` tuples. No emission until the second source value arrives.

---

## Filtering Operators

### `take()`

```ts
take<T>(count: number): Operator<T, T>;
```

Emits the first `count` values, then completes.

---

### `skip()`

```ts
skip<T>(count: number): Operator<T, T>;
```

Skips the first `count` values.

---

### `first()`

```ts
first<T>(): Operator<T, T>;
```

Emits only the first value, then completes.

---

### `last()`

```ts
last<T>(): Operator<T, T>;
```

Emits only the last value (on source completion).

---

### `takeWhile()`

```ts
takeWhile<T>(predicate: (value: T) => boolean): Operator<T, T>;
```

Emits values while `predicate` returns `true`; completes when it first returns `false`.

---

### `takeUntil()`

```ts
takeUntil<T>(notifier: AbortSignal | Flux<unknown>): Operator<T, T>;
```

Completes when `notifier` aborts (if `AbortSignal`) or emits (if `Flux`).

---

### `debounce()`

```ts
debounce<T>(ms: number): Operator<T, T>;
```

Emits the last value after `ms` ms of silence. The timer resets on every emission. **Note:** a pending value is dropped if the source completes before the timer fires.

---

### `throttle()`

```ts
throttle<T>(ms: number): Operator<T, T>;
```

Emits the first value in each `ms`-millisecond window; subsequent values in the window are dropped.

---

### `sample()`

```ts
sample<T>(notifier: Flux<unknown>): Operator<T, T>;
```

Emits the latest source value each time `notifier` emits. Does not emit if no source value has arrived since the last sample.

---

## Combination Operators

### `merge()`

```ts
merge<T>(...sources: Flux<T>[]): Flux<T>;
```

Subscribes to all `sources` simultaneously and emits their values as they arrive.

---

### `concat()`

```ts
concat<T>(...sources: Flux<T>[]): Flux<T>;
```

Subscribes to `sources` sequentially — each source must complete before the next starts.

---

### `combineLatest()`

```ts
combineLatest<T extends unknown[]>(...sources: { [K in keyof T]: Flux<T[K]> }): Flux<T>;
```

Emits a tuple of the latest value from each source whenever any source emits. Does not emit until all sources have emitted at least once.

---

### `withLatestFrom()`

```ts
withLatestFrom<T, U>(other: Flux<U>): Operator<T, [T, U]>;
```

Combines each source emission with the latest value from `other`. Does not emit if `other` has not yet emitted.

---

### `race()`

```ts
race<T>(...sources: Flux<T>[]): Flux<T>;
```

Subscribes to all sources; once any emits its first value, unsubscribes from all others and continues with the winner.

---

### `zip()`

```ts
zip<T extends unknown[]>(...sources: { [K in keyof T]: Flux<T[K]> }): Flux<T>;
```

Pairs emissions by index — emits `[a1, b1]`, then `[a2, b2]`, etc.

---

### `forkJoin()`

```ts
forkJoin<T extends unknown[]>(...sources: { [K in keyof T]: Flux<T[K]> }): Flux<T>;
```

Waits for all sources to complete, then emits a single tuple of the last value from each.

---

## Utility Operators

### `tap()`

```ts
tap<T>(fn: (value: T) => void): Operator<T, T>;
```

Runs a side effect on each value without modifying it.

---

### `delay()`

```ts
delay<T>(ms: number): Operator<T, T>;
```

Delays each emission by `ms` milliseconds.

---

### `timeout()`

```ts
timeout<T>(ms: number): Operator<T, T>;
```

Errors with `FluxTimeoutError` if no value arrives within `ms` ms since the last emission (or subscription). The timer resets on each emission — this is an inactivity timeout, not a total-duration timeout.

---

### `catchError()`

```ts
catchError<T>(fn: (error: unknown) => Flux<T>): Operator<T, T>;
```

Intercepts errors and replaces the failed stream with the `Flux` returned by `fn`.

---

### `retry()`

```ts
retry<T>(count: number): Operator<T, T>;
```

On error, re-subscribes to the source up to `count` times. Propagates the error after all retries are exhausted.

---

### `finalize()`

```ts
finalize<T>(fn: () => void): Operator<T, T>;
```

Calls `fn` when the stream completes, errors, or is unsubscribed — whichever comes first.

---

### `share()`

```ts
share<T>(options?: ShareOptions): Operator<T, T>;
```

Multicasts one source execution to all subscribers. Re-subscribes to the source when the first subscriber arrives after a previous complete.

---

### `shareReplay()`

```ts
shareReplay<T>(bufferSize: number, options?: ShareOptions): Operator<T, T>;
```

Like `share`, but replays the last `bufferSize` emissions to late subscribers.

---

### `toPromise()`

```ts
toPromise<T>(source: Flux<T>): Promise<T>;
```

Returns a `Promise` that resolves with the last value when the source completes, or rejects if it errors. **Note:** `toPromise` is a direct function, not an operator — pass the `Flux` as the first argument.

---

### `toArray()`

```ts
toArray<T>(source: Flux<T>): Promise<T[]>;
```

Returns a `Promise` that resolves with all emitted values when the source completes. **Note:** direct function, not an operator.

---

## Adapters

### `fromSignal()` (Ripple)

```ts
fromSignal<T>(source: ReadonlySignal<T>): Flux<T>;
```

Emits the signal's current value immediately on subscribe, then emits on every change. Requires `@vielzeug/ripple`.

---

### `toSignal()` (Ripple)

```ts
toSignal<T>(source: Flux<T>, opts: ToSignalOptions<T>): Signal<T>;
```

Creates a `Signal` whose value tracks each emission from `source`. Call `sig.dispose()` to stop tracking.

**Parameters — `ToSignalOptions<T>`:**

| Option    | Type          | Default     | Description                                    |
| --------- | ------------- | ----------- | ---------------------------------------------- |
| `initial` | `T`           | (required)  | Value before the first emission                |
| `signal`  | `AbortSignal` | `undefined` | Stops the subscription when aborted            |

---

### `fromBus()` / `toBus()` (Herald)

```ts
fromBus<M, K extends keyof M>(bus: Bus<M>, event: K): Flux<M[K]>;
toBus<M, K extends keyof M>(bus: Bus<M>, event: K): Operator<M[K], M[K]>;
```

Bridge between a `@vielzeug/herald` `Bus` and a `Flux`. Requires `@vielzeug/herald`.

---

### `fromPulse()` / `fromPresence()` (Pulse)

```ts
fromPulse<M, K extends keyof M>(pulse: Pulse<M>, event: K): Flux<M[K]>;
fromPresence<T>(channel: PresenceChannel<T>): Flux<ReadonlyMap<string, T>>;
```

Wrap Pulse channel events as streams. Requires `@vielzeug/pulse`.

---

### `fromSse()` / `fromReadable()` / `fromQuery()` (Courier)

```ts
fromSse<E, K extends keyof E>(source: SseSource<E>, event: K): Flux<E[K]>;
fromReadable<T>(source: AsyncIterable<T>): Flux<T>;
fromQuery<T>(store: { peek(): T; subscribe(fn: () => void): () => void }): Flux<T>;
```

Wrap Courier sources as streams. Requires `@vielzeug/courier`.

---

## Types

```ts
// Core stream type
interface Flux<T> {
  subscribe(observerOrNext: Observer<T> | ((value: T) => void)): Unsubscribe;
  pipe<A>(op1: Operator<T, A>): Flux<A>;
  pipe<A, B>(op1: Operator<T, A>, op2: Operator<A, B>): Flux<B>;
  // ...up to 9 operators
  dispose(): void;
}

// Observer passed to subscribe()
interface Observer<T> {
  next: (value: T) => void;
  complete?: () => void;
  error?: (error: unknown) => void;
}

// Operator — pure function from Flux to Flux
type Operator<T, U> = (source: Flux<T>) => Flux<U>;

// Producer — passed to flux()
type Producer<T> = (observer: Observer<T>) => (() => void) | void;

// Cleanup handle
type Unsubscribe = () => void;

// BehaviorSubject constructor options
interface BehaviorSubjectOptions<T> {
  equals?: (a: T, b: T) => boolean;
}

// share() / shareReplay() options
interface ShareOptions {
  // Currently reserved — pass no options
}

// toSignal() options
interface ToSignalOptions<T> {
  initial: T;
  signal?: AbortSignal;
}
```

---

## Errors

### `FluxError`

Base class for all Flux errors. `instanceof FluxError` matches any Flux-specific error.

### `FluxDisposedError`

Thrown when `emit()` or `subscribe()` is called on a disposed subject.

### `FluxTimeoutError`

Thrown by `timeout(ms)` when no emission arrives within `ms` milliseconds of the last emission.

**Properties:** `ms: number` — the configured timeout duration.

### `FluxBufferOverflowError`

Thrown by `shareReplay` or internal buffer operators when the buffer capacity is exceeded.
