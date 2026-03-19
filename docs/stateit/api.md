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
| `createStore()` | Create object-like state container       | Sync           | Mutate through provided APIs to keep notifications consistent |

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
count.peek(); // 1 — untracked read
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
function computed<T>(compute: () => T, options?: ReactiveOptions<T> & { lazy?: boolean }): ComputedSignal<T>;
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

Pass `{ lazy: true }` to skip the initial computation until the first `.value` read:

```ts
const lazy = computed(() => heavyCalc(), { lazy: true });
// heavyCalc has NOT run yet
lazy.value; // runs now
```

When `options.equals` is provided, downstream subscribers are suppressed if the recomputed value equals the previous value. This resolves diamond-dependency scenarios.

**Parameters**

| Parameter        | Type            | Description                                                           |
| ---------------- | --------------- | --------------------------------------------------------------------- |
| `compute`        | `() => T`       | Computation function; signals read inside are tracked as dependencies |
| `options.equals` | `EqualityFn<T>` | Suppress downstream if result is unchanged. Default: `Object.is`      |
| `options.lazy`   | `boolean`       | Defer initial computation to first `.value` read. Default: `false`    |

**Returns** — `ComputedSignal<T>`

---

### `writable`

```ts
function writable<T>(get: () => T, set: (value: T) => void, options?: ReactiveOptions<T>): WritableSignal<T>;
```

Creates a bidirectional computed signal. The getter is tracked reactively; writes are forwarded to `set`. Call `.dispose()` to stop tracking.

```ts
const celsius = signal(0);
const fahrenheit = writable(
  () => (celsius.value * 9) / 5 + 32,
  (f) => {
    celsius.value = ((f - 32) * 5) / 9;
  },
);
fahrenheit.value; // 32
fahrenheit.value = 212; // setter forwards to celsius
celsius.value; // 100
fahrenheit.update((f) => f + 10); // increments via fn

fahrenheit.dispose();
```

**Parameters**

| Parameter        | Type                 | Description                                                             |
| ---------------- | -------------------- | ----------------------------------------------------------------------- |
| `get`            | `() => T`            | Reactive getter; signals read inside are tracked as dependencies        |
| `set`            | `(value: T) => void` | Called when `.value = v` is assigned                                    |
| `options.equals` | `EqualityFn<T>`      | Suppress downstream if getter result is unchanged. Default: `Object.is` |

**Returns** — `WritableSignal<T>`

---

### `derived`

```ts
function derived<const Srcs extends ReadonlyArray<ReadonlySignal<unknown>>, R>(
  sources: Srcs,
  fn: (...values: InferValues<Srcs>) => R,
  options?: ReactiveOptions<R>,
): ComputedSignal<R>;
```

Creates a `ComputedSignal` from an array of source signals. Each source's value is passed as a positional argument to the projector function; the computed re-evaluates whenever any source changes.

```ts
const price = signal(10);
const quantity = signal(5);
const discount = signal(0.1);

const total = derived([price, quantity, discount], (p, q, d) => p * q * (1 - d));
total.value; // 45
```

**Parameters**

| Parameter | Type                                     | Description                             |
| --------- | ---------------------------------------- | --------------------------------------- |
| `sources` | `ReadonlyArray<ReadonlySignal<unknown>>` | Source signals to track                 |
| `fn`      | `(...values) => R`                       | Projector; receives each source's value |
| `options` | `ReactiveOptions<R>`                     | Optional `equals` for the result        |

**Returns** — `ComputedSignal<R>`

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

| Parameter               | Type             | Description                                                                         |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| `fn`                    | `EffectCallback` | Runs immediately and on each dependency change; may return a cleanup function       |
| `options.maxIterations` | `number`         | Per-effect limit for re-entrant loops. Overrides `configureStateit`. Default: `100` |
| `options.onError`       | `(err) => void`  | Called when `fn` throws; effect is auto-disposed after the first error              |

**Returns** — `Subscription`

---

### `watch`

```ts
function watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription;
```

Subscribes to value changes on `source`. Does **not** fire immediately by default (unlike `effect`). To watch a derived slice, compose with `store.select()` or `computed()`.

```ts
// Plain watch
const sub = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // fires
sub.dispose();

// Slice watch — compose with store.select()
const nameSignal = userStore.select((s) => s.name);
watch(nameSignal, (name) => console.log('name:', name));
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

### `nextValue`

```ts
function nextValue<T>(
  source: ReadonlySignal<T>,
  predicate?: (v: T) => boolean,
  options?: { signal?: AbortSignal },
): Promise<T>;
```

Returns a `Promise` that resolves with the next value of `source` that satisfies the optional predicate. The watch subscription is disposed automatically — no cleanup required. Pass `options.signal` to cancel early.

```ts
const status = signal<'idle' | 'loading' | 'done'>('idle');

// Wait for the next change
const next = await nextValue(status);

// Wait for a specific condition
const done = await nextValue(status, (v) => v === 'done');

// Abortable wait
const controller = new AbortController();
const p = nextValue(status, (v) => v === 'done', { signal: controller.signal });
controller.abort(new Error('cancelled'));
```

**Parameters**

| Parameter        | Type                | Description                                                       |
| ---------------- | ------------------- | ----------------------------------------------------------------- |
| `source`         | `ReadonlySignal<T>` | The signal to watch                                               |
| `predicate`      | `(v: T) => boolean` | Optional filter; `Promise` only resolves when this returns `true` |
| `options.signal` | `AbortSignal`       | Optional abort signal; rejects with `signal.reason` when aborted  |

**Returns** — `Promise<T>`

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

Returns a stable read-only view of a signal. Hides the setter at both type and runtime level. The wrapper is cached — repeated calls with the same signal return the same reference. There is no runtime Proxy.

```ts
const readCount = readonly(count);
readCount.value; // ok
readCount.peek(); // ok
// readCount.value = 1; // TS compile error — no setter
```

---

### `toValue`

```ts
function toValue<T>(v: T | ReadonlySignal<T>): T;
```

Unwraps a value or signal. If `v` is a `ReadonlySignal`, returns `.value` (tracked if called inside an effect). Otherwise returns `v` as-is.

```ts
toValue(10); // 10
toValue(signal(10)); // 10 — tracked if inside effect
```

---

### `peekValue`

```ts
function peekValue<T>(v: T | ReadonlySignal<T>): T;
```

Unwraps a value or signal without tracking. If `v` is a signal, returns `v.peek()`.

```ts
peekValue(10); // 10
peekValue(signal(10)); // 10 — untracked
```

---

### `isSignal`

```ts
function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T>;
```

Type guard — returns `true` for any value created by `signal()`, `computed()`, `writable()`, `derived()`, or `store()`.

---

### `isStore`

```ts
function isStore<T extends object = Record<string, unknown>>(value: unknown): value is Store<T>;
```

Type guard — returns `true` only for values created by `store()`.

---

### `shallowEqual`

```ts
const shallowEqual: EqualityFn<unknown>;
```

Compares own enumerable keys by reference (`Object.is`). This is the **default equality** used by `store()`. Export it to avoid reimplementation when composing custom `StoreOptions.equals`:

```ts
const s = store({ items: [] }, { equals: shallowEqual });
```

---

### `configureStateit`

```ts
function configureStateit(opts: { maxEffectIterations?: number }): void;
```

Configures global stateit behaviour. Call once at application startup.

```ts
configureStateit({ maxEffectIterations: 200 });
```

| Option                | Default | Description                                             |
| --------------------- | ------- | ------------------------------------------------------- |
| `maxEffectIterations` | `100`   | Maximum re-entrant iterations before an error is thrown |

---

## Store Functions

### `store`

```ts
function store<T extends object>(initial: T, options?: StoreOptions<T>): Store<T>;
```

Creates a reactive store for the given object state. A `Store<T>` extends `Signal<T>`, so `effect()`, `computed()`, `watch()`, and all other signal primitives work natively on it.

**Parameters**

| Parameter        | Type            | Description                                                                         |
| ---------------- | --------------- | ----------------------------------------------------------------------------------- |
| `initial`        | `T`             | The starting state (defensively copied; external mutations do not affect `reset()`) |
| `options.equals` | `EqualityFn<T>` | Custom equality for top-level change detection. Default: `shallowEqual`             |

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
  readonly [_SIGNAL_BRAND]: true;
  readonly value: T; // tracked getter
  peek(): T; // untracked read
}
```

| Member        | Description                                               |
| ------------- | --------------------------------------------------------- |
| `value` (get) | Returns current value; tracked inside `effect`/`computed` |
| `peek()`      | Returns current value without registering a dependency    |

---

### `ComputedSignal<T>`

```ts
interface ComputedSignal<T> extends ReadonlySignal<T>, Disposable {
  readonly stale: boolean;
}
```

Returned by `computed()` and `derived()`. A read-only signal with an explicit dispose method and a `stale` flag.

```ts
const doubled = computed(() => count.value * 2);
doubled.value; // read
doubled.stale; // false — just computed
count.value = 5;
doubled.stale; // true — deps changed; not yet re-read
doubled.dispose(); // stop tracking
```

---

### `WritableSignal<T>`

```ts
interface WritableSignal<T> extends Signal<T>, Disposable {
  readonly stale: boolean;
}
```

Returned by `writable()`. A bidirectional computed signal with an explicit dispose method, an `update(fn)` method, and a `stale` flag.

```ts
const fahrenheit = writable(
  () => (celsius.value * 9) / 5 + 32,
  (f) => {
    celsius.value = ((f - 32) * 5) / 9;
  },
);
fahrenheit.value = 100; // write
fahrenheit.update((f) => f + 10); // update via fn
fahrenheit.dispose(); // stop tracking getter
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

Implemented by `ComputedSignal<T>` and `WritableSignal<T>`. Supports the TC39 `using` declaration.

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
  onError?: (error: unknown) => void;
};
```

| Property        | Type            | Default | Description                                                                        |
| --------------- | --------------- | ------- | ---------------------------------------------------------------------------------- |
| `maxIterations` | `number`        | `100`   | Per-effect guard against infinite reactive loops; overrides `configureStateit`     |
| `onError`       | `(err) => void` | —       | Error handler; effect is auto-disposed after the first throw when this is provided |

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

Accepted by `signal()`, `computed()`, `writable()`, `derived()`, and `store()`.

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

A `Store<T>` IS a `Signal<T>` — all signal operations work on stores.

```ts
interface Store<T extends object> extends Signal<T> {
  readonly frozen: boolean;
  patch(partial: Partial<T>): void;
  update(fn: (s: T) => T): void;
  reset(): void;
  select<U>(selector: (s: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
  freeze(): void;
}
```

### `Store<T>` Methods

| Member                        | Description                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `.value` (get)                | Read current state (tracked)                                                     |
| `.value` (set)                | Replace entire state (triggers notification if changed)                          |
| `.peek()`                     | Read current state without tracking                                              |
| `.update(fn)`                 | Receive a shallow copy of current state; return value replaces it                |
| `.patch(partial)`             | Shallow-merge a `Partial<T>` into current state: `{ ...current, ...partial }`    |
| `.reset()`                    | Restore the original `initial` state                                             |
| `.select(selector, options?)` | Lazily derived `ComputedSignal<U>` from a slice of state; compose with `watch()` |
| `.frozen`                     | `true` after `freeze()` has been called; further writes are ignored              |
| `.freeze()`                   | Freeze the store; all subsequent writes are silently ignored                     |

---

### `StoreOptions<T>`

```ts
type StoreOptions<T extends object> = {
  equals?: EqualityFn<T>;
};
```

| Property | Type            | Default        | Description                                    |
| -------- | --------------- | -------------- | ---------------------------------------------- |
| `equals` | `EqualityFn<T>` | `shallowEqual` | Custom equality for top-level change detection |

---

### `Store<T>` — Method Details

#### `patch`

```ts
patch(partial: Partial<T>): void
```

Shallow-merges `partial` onto the current state: `{ ...current, ...partial }`. No-op if frozen or if the resulting state is equal to the current state.

---

#### `update`

```ts
update(fn: (s: T) => T): void
```

Receives a **shallow copy** of the current state. The return value replaces the state. No-op if frozen.

```ts
cart.update((s) => ({ ...s, count: s.count + 1 }));
```

---

#### `reset`

```ts
reset(): void
```

Restores the store to the `initial` argument that was passed to `store()`. The initial state is defensively copied at construction — external mutations cannot corrupt `reset()`. No-op if frozen or state is already equal.

---

#### `select`

```ts
select<U>(selector: (s: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>
```

Returns a lazily computed signal derived from a slice of this store's state. Compose with `watch()` to subscribe to slice changes:

```ts
const countSignal = s.select((st) => st.count);
watch(countSignal, (count) => console.log('count:', count));
```

---

#### `freeze`

```ts
freeze(): void
```

Freezes the store. After `freeze()`:

- `patch()`, `update()`, `reset()`, and direct `.value` assignment — silently ignored
- `.value` — still readable; returns the last known state
- `.frozen` — becomes `true`
- Calling `freeze()` again is safe

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

---

## Testing Utilities

### `_resetContextForTesting`

```ts
function _resetContextForTesting(): void;
```

Resets the shared reactive context (scope + batch queue). Use in `beforeEach`/`afterEach` to prevent state leaks between tests, especially when a test throws inside a `batch()` or `effect()` without cleaning up.

```ts
import { _resetContextForTesting } from '@vielzeug/stateit';

beforeEach(() => _resetContextForTesting());
```

---

### `_SIGNAL_BRAND` / `_STORE_BRAND`

```ts
const _SIGNAL_BRAND: unique symbol;
const _STORE_BRAND: unique symbol;
```

The internal brand symbols used by `isSignal()` and `isStore()`. Exported for use in test mocks that need to satisfy the type guard without creating a full signal/store:

```ts
import { _SIGNAL_BRAND } from '@vielzeug/stateit';

const mockSignal = {
  [_SIGNAL_BRAND]: true as const,
  value: 42,
  peek: () => 42,
};
```
