---
title: Stateit — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/stateit.
---

# Stateit API Reference

[[toc]]

## API At a Glance

| Symbol          | Purpose                                  | Execution mode | Common gotcha                                                 |
| --------------- | ---------------------------------------- | -------------- | ------------------------------------------------------------- |
| `signal()`      | Create reactive primitive values         | Sync           | Write signals inside batch/effect-safe flows                  |
| `computed()`    | Derive memoized values from dependencies | Sync           | Avoid side effects inside computed callbacks                  |
| `store()`       | Create object-like state container       | Sync           | Mutate through provided APIs to keep notifications consistent |

## Signal Primitives

### `signal`

```ts
function signal<T>(initial: T, options?: ReactiveOptions<T>): Signal<T>;
```

Creates a reactive atom. Read `.value` inside an `effect` or `computed` to subscribe. Write `.value = next` to update and notify dependents. Use `.peek()` to read without tracking. Use `.update(fn)` to derive the next value from the current one.

```ts
const count = signal(0);
count.value; // 0 — tracked read
count.value = 1; // notifies dependents
count.update((n) => n + 1); // 2 — shorthand for count.value = count.value + 1
```

**Parameters**

| Parameter        | Type            | Description                                                          |
| ---------------- | --------------- | -------------------------------------------------------------------- |
| `initial`        | `T`             | The starting value                                                   |
| `options.equals` | `EqualityFn<T>` | Custom equality; skip notification when `true`. Default: `Object.is` |

**Returns** — `Signal<T>`

---

### `computed`

```ts
function computed<T>(compute: () => T, options?: ReactiveOptions<T>): ComputedSignal<T>;
```

Creates a lazy derived read-only signal. The `compute` function runs on the first `.value` read (or at construction if `lazy` is not set) and again after any dependency changes (pull-on-read). Call `.dispose()` to detach from dependencies.

```ts
const count = signal(3);
const doubled = computed(() => count.value * 2);
doubled.value; // 6 — compute runs here
count.value = 5;
doubled.value; // 10 — recomputed on read

doubled.dispose(); // stop tracking
// or: using doubled = computed(...) — TC39 using declaration
```

When `options.equals` is provided, downstream subscribers are suppressed if the recomputed value equals the previous value. This resolves diamond-dependency scenarios.

**Parameters**

| Parameter        | Type            | Description                                                           |
| ---------------- | --------------- | --------------------------------------------------------------------- |
| `compute`        | `() => T`       | Computation function; signals read inside are tracked as dependencies |
| `options.equals` | `EqualityFn<T>` | Suppress downstream if result is unchanged. Default: `Object.is`      |

**Returns** — `ComputedSignal<T>`

---

### `writable`

```ts
function writable<T>(input: Signal<T>): Signal<T>;
```

Identity function — returns the input unchanged. Acts as a typed marker at API boundaries where a signal is intentionally meant to be written to. No proxy or wrapper is created.

```ts
const count = signal(0);
const exposed: ReadonlySignal<number> = readonly(count);

// Restore write access where you own the signal
const mutable = writable(count);
mutable.value = 5;
```

**Parameters**

| Parameter | Type        | Description                       |
| --------- | ----------- | --------------------------------- |
| `input`   | `Signal<T>` | The writable signal to pass through |

**Returns** — `Signal<T>`

---

### `effect`

```ts
function effect(fn: EffectCallback, options?: EffectOptions): Subscription;
```

Runs `fn` immediately and re-runs it whenever any signal read inside it changes. If `fn` returns a function, that function is called as cleanup before each re-run and on final dispose. Returns a `Subscription` — dispose is idempotent.

```ts
const sub = effect(() => {
  document.title = count.value.toString();
  return () => {
    /* cleanup */
  };
});

count.value = 5; // effect re-runs (cleanup called first)
sub.dispose(); // cleanup called, effect removed
sub.dispose(); // no-op — second call is safe
// or: sub()     — direct call also disposes
```

**Parameters**

| Parameter               | Type             | Description                                                        |
| ----------------------- | ---------------- | ------------------------------------------------------------------ |
| `fn`                    | `EffectCallback` | Runs immediately and on each dependency change; may return a cleanup function |
| `options.maxIterations` | `number`         | Per-effect limit for re-entrant loops. Default: `100`              |

**Returns** — `Subscription`

---

### `watch`

```ts
function watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription;
```

Subscribes to value changes on `source`. Does **not** fire immediately by default (unlike `effect`). To watch a derived slice, pass an inline selector as the second argument or wrap with `computed()`.

```ts
// Plain watch
const sub = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // fires
sub.dispose();

// Slice watch — inline selector overload
watch(userStore, (s) => s.name, (name) => console.log('name:', name));
```

**Parameters**

| Parameter           | Type                    | Description                                                                                                                                                            |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`            | `ReadonlySignal<T>`     | The signal or store to watch                                                                                                                                           |
| `cb`                | `(value, prev) => void` | Called on each change with new and previous values                                                                                                                     |
| `options.immediate` | `boolean`               | Fire once immediately on subscription. Default `false`                                                                                                                 |
| `options.once`      | `boolean`               | Auto-unsubscribe after the first change. Default `false`. When combined with `immediate`, the immediate call does not count — the callback may fire up to twice total. |
| `options.equals`    | `EqualityFn<T>`         | Custom equality for change detection. Default `Object.is`                                                                                                              |

**Returns** — `Subscription`

---

### `batch`

```ts
function batch<T>(fn: () => T): T;
```

Runs `fn` and defers all signal/store notifications until it returns, then flushes once. Nested `batch()` calls coalesce into the outermost. If `fn` throws, pending effects are still flushed; the original error takes precedence.

```ts
batch(() => {
  a.value = 1;
  b.value = 2;
  // one combined notification after fn returns
});
```

**Returns** — The return value of `fn`

---

### `untrack`

```ts
function untrack<T>(fn: () => T): T;
```

Runs `fn` and returns its result without registering any reactive dependencies. Reads inside are still valid but do not subscribe.

```ts
effect(() => {
  const x = a.value; // subscribed
  const y = untrack(() => b.value); // not subscribed
  console.log(x + y);
});
```

**Returns** — The return value of `fn`

---

### `onCleanup`

```ts
function onCleanup(fn: CleanupFn): void;
```

Registers a cleanup function within the currently running effect. The cleanup runs before the next re-execution and when the effect is disposed. Allows nested helpers to register teardown without needing the effect's return value.

```ts
function useInterval(ms: number) {
  const id = setInterval(() => console.log('tick'), ms);
  onCleanup(() => clearInterval(id));
}

effect(() => {
  useInterval(1000); // cleanup registered automatically
});
```

---

### `readonly`

```ts
function readonly<T>(sig: ReadonlySignal<T>): ReadonlySignal<T>;
```

Returns a stable read-only view of a signal. Hides the setter at the type level. No proxy or wrapper is created — the original signal instance is returned as-is.

```ts
const readCount = readonly(count);
readCount.value; // ok
peek(readCount);  // ok — untracked read
// readCount.value = 1; // TS compile error — no setter
```

---

### `toValue`

```ts
function toValue<T>(v: T | ReadonlySignal<T> | (() => T)): T;
```

Unwraps a value, signal, or function. If `v` is a `ReadonlySignal`, returns `.value` (tracked if called inside an effect). If `v` is a function, calls it and returns the result. Otherwise returns `v` as-is.

```ts
toValue(10); // 10
toValue(signal(10)); // 10 — tracked if inside effect
toValue(() => 42); // 42
```

---

### `unwrapSignal`

```ts
function unwrapSignal<T>(input: T | ReadonlySignal<T>): T;
```

Unwraps a signal or returns the value as-is. If `input` is a `ReadonlySignal`, reads its value (which **may track dependencies** if called inside an effect). For untracked reads, use {@link peek} instead.

```ts
unwrapSignal(10); // 10
unwrapSignal(signal(10)); // 10 — tracked if inside effect
```

---

### `peek`

```ts
function peek<T>(input: T | ReadonlySignal<T>): T;
```

Performs an untracked read of a signal value. This read will not register as a dependency for reactive evaluation. If `input` is not a signal, returns the value as-is.

```ts
peek(10); // 10
peek(signal(10)); // 10 — untracked, no dependency registered
```

---

### `isSignal`

```ts
function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T>;
```

Type guard that strictly returns `true` only for values created by `signal()` or `computed()`. Uses an internal symbol marker, so arbitrary objects with a `value` property will not pass. Note: `store()` return values do not carry the signal brand.

```ts
isSignal(signal(42)); // true
isSignal(computed(() => 1)); // true
isSignal({ value: 42 }); // false — not a real signal
```

---

### `isWritable`

```ts
function isWritable<T = unknown>(value: unknown): value is Signal<T>;
```

Type guard that returns `true` only when the value is a signal with a writable `.value` setter. Returns `false` for `computed()` signals (readonly) and plain objects.

```ts
const s = signal(0);
const c = computed(() => s.value * 2);

isWritable(s); // true
isWritable(c); // false — computed has no setter
```

---

## Store Functions

### `store`

```ts
function store<T extends object>(initial: T, options?: StoreOptions<T>): Store<T>;
```

Creates a reactive store for the given object state. `effect()`, `computed()`, `watch()`, and all other signal primitives that accept `ReadonlySignal<T>` work with stores directly since `Store<T>` exposes a `.value` getter.

**Parameters**

| Parameter        | Type            | Description                                                                         |
| ---------------- | --------------- | ----------------------------------------------------------------------------------- |
| `initial`        | `T`             | The starting state (defensively copied; external mutations do not affect `reset()`) |
| `options.equals` | `EqualityFn<T>` | Custom equality for change detection. Default: `Object.is`                          |

**Returns** — `Store<T>`

---

## Signal Types

### `Signal<T>`

The base readable/writable reactive primitive. All other signal types extend this.

```ts
interface Signal<T> extends ReadonlySignal<T> {
  value: T; // notifying setter
  update(fn: (current: T) => T): void; // shorthand for value = fn(value)
}
```

---

### `ReadonlySignal<T>`

```ts
interface ReadonlySignal<T> {
  readonly value: T; // tracked getter
}
```

| Member        | Description                                               |
| ------------- | --------------------------------------------------------- |
| `value` (get) | Returns current value; tracked inside `effect`/`computed` |

---

### `ComputedSignal<T>`

```ts
interface ComputedSignal<T> extends ReadonlySignal<T> {
  readonly stale: boolean;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

Returned by `computed()`. A read-only signal with an explicit dispose method and a `stale` flag.

```ts
const doubled = computed(() => count.value * 2);
doubled.value; // read
doubled.stale; // false — just computed
count.value = 5;
doubled.stale; // true — deps changed; not yet re-read
doubled.dispose(); // stop tracking
```

---

### `Subscription`

```ts
interface Subscription {
  (): void; // direct call — disposes the subscription
  dispose(): void; // explicit method — equivalent to calling directly
  [Symbol.dispose](): void; // TC39 using declarations
}
```

Returned by `effect()` and `watch()`. All three forms are equivalent and idempotent.

```ts
const sub = effect(() => ...);
sub();           // dispose
sub.dispose();   // dispose (same effect)
// or: using sub = effect(...) — TC39 using declaration
```

---

### `Disposable`

```ts
interface Disposable {
  dispose(): void;
  [Symbol.dispose](): void;
}
```

Implemented by `ComputedSignal<T>`. Supports the TC39 `using` declaration.

---

### `CleanupFn`

```ts
type CleanupFn = () => void;
```

A zero-argument void function. Used for teardown returned from `EffectCallback`.

---

### `EffectCallback`

```ts
type EffectCallback = () => CleanupFn | void;
```

The callback passed to `effect()`. May optionally return a `CleanupFn` that fires before each re-run and on final dispose.

---

### `EffectOptions`

```ts
type EffectOptions = {
  maxIterations?: number;
};
```

| Property        | Type     | Default | Description                                              |
| --------------- | -------- | ------- | -------------------------------------------------------- |
| `maxIterations` | `number` | `100`   | Per-effect guard against infinite reactive loops         |

---

### `EqualityFn<T>`

```ts
type EqualityFn<T> = (a: T, b: T) => boolean;
```

A comparator that returns `true` when `a` and `b` should be considered equal (notification suppressed).

---

### `ReactiveOptions<T>`

```ts
type ReactiveOptions<T> = {
  equals?: EqualityFn<T>;
};
```

Accepted by `signal()`, `computed()`, and `store()`.

---

### `WatchOptions<T>`

```ts
type WatchOptions<T> = {
  immediate?: boolean;
  once?: boolean;
  equals?: EqualityFn<T>;
};
```

| Property    | Type            | Default     | Description                                                                                                         |
| ----------- | --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `immediate` | `boolean`       | `false`     | Fire once immediately on subscription; both `value` and `prev` are the current value                                |
| `once`      | `boolean`       | `false`     | Auto-unsubscribe after the first _change_ fires. When combined with `immediate`, the immediate call does not count. |
| `equals`    | `EqualityFn<T>` | `Object.is` | Custom equality for change detection                                                                                |

---

## Store Types

### `Store<T>`

```ts
interface Store<T extends object> {
  readonly value: T;
  patch(partial: Partial<T>): void;
  update(fn: (state: T) => T): void;
  reset(): void;
}
```

| Member            | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| `.value` (get)    | Read current state; tracked inside `effect`/`computed`                        |
| `.patch(partial)` | Shallow-merge a `Partial<T>` into state: `{ ...current, ...partial }`         |
| `.update(fn)`     | Receive current state; return value replaces it                               |
| `.reset()`        | Restore the original `initial` state                                          |

---

### `StoreOptions<T>`

```ts
type StoreOptions<T extends object> = {
  equals?: EqualityFn<T>;
};
```

| Property | Type            | Default     | Description                                    |
| -------- | --------------- | ----------- | ---------------------------------------------- |
| `equals` | `EqualityFn<T>` | `Object.is` | Custom equality for top-level change detection |

## Notification Timing

All signal and store notifications fire **synchronously** — the subscriber callback runs before the next line after the write.

```ts
const sub = watch(s, (state) => console.log('changed:', state.count));
s.patch({ count: 1 });
// 'changed: 1' has already been logged here
```

To coalesce multiple writes into a single notification, use the top-level `batch()`:

```ts
import { batch } from '@vielzeug/stateit';

batch(() => {
  s.patch({ count: 1 });
  s.patch({ count: 2 });
  s.patch({ count: 3 });
});
// One notification fires after the batch with the final state: { count: 3 }
```

Nested `batch()` calls merge into the outermost — only one flush occurs.
