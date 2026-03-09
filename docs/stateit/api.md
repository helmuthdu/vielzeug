---
title: Stateit — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/stateit.
---

## API Reference

## Signal Primitives

### `signal`

```ts
function signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
```

Creates a reactive atom. Read `.value` inside an `effect` or `computed` to subscribe. Write `.value = next` to update and notify dependents. Use `.peek()` to read without tracking.

```ts
const count = signal(0);
count.value;       // 0 — tracked read
count.value = 1;   // notifies dependents
count.peek();      // 1 — untracked read
```

**Parameters**

| Parameter        | Type            | Description                                           |
| ---------------- | --------------- | ----------------------------------------------------- |
| `initial`        | `T`             | The starting value                                    |
| `options.equals` | `EqualityFn<T>` | Custom equality; skip notification when `true`. Default: `Object.is` |

**Returns** — `Signal<T>`

---

### `computed`

```ts
function computed<T>(compute: () => T, options?: ComputedOptions<T>): ComputedSignal<T>;
```

Creates a lazy derived read-only signal. The `compute` function runs on the first `.value` read and again after any dependency changes (pull-on-read). **Call the returned function** to dispose and detach from dependencies.

```ts
const count = signal(3);
const doubled = computed(() => count.value * 2);
doubled.value; // 6 — compute runs here
count.value = 5;
doubled.value; // 10 — recomputed on read

doubled(); // dispose — stop tracking
```

When `options.equals` is provided, downstream subscribers are suppressed if the recomputed value equals the previous value. This resolves diamond-dependency scenarios.

**Parameters**

| Parameter        | Type            | Description                                                                   |
| ---------------- | --------------- | ----------------------------------------------------------------------------- |
| `compute`        | `() => T`       | Computation function; signals read inside are tracked as dependencies         |
| `options.equals` | `EqualityFn<T>` | Suppress downstream if result is unchanged. Default: `Object.is`              |

**Returns** — `ComputedSignal<T>` (callable as a dispose function)

---

### `writable`

```ts
function writable<T>(
  get: () => T,
  set: (value: T) => void,
  options?: ComputedOptions<T>,
): WritableSignal<T>;
```

Creates a bidirectional computed signal. The getter is tracked reactively; writes are forwarded to `set`. **Call the returned function** to dispose and stop tracking.

```ts
const celsius = signal(0);
const fahrenheit = writable(
  () => celsius.value * 9 / 5 + 32,
  (f) => { celsius.value = (f - 32) * 5 / 9; },
);
fahrenheit.value;       // 32
fahrenheit.value = 212; // setter forwards to celsius
celsius.value;          // 100

fahrenheit(); // dispose
```

**Parameters**

| Parameter        | Type                | Description                                                       |
| ---------------- | ------------------- | ----------------------------------------------------------------- |
| `get`            | `() => T`           | Reactive getter; signals read inside are tracked as dependencies  |
| `set`            | `(value: T) => void`| Called when `fn.value = v` is assigned                           |
| `options.equals` | `EqualityFn<T>`     | Suppress downstream if getter result is unchanged. Default: `Object.is` |

**Returns** — `WritableSignal<T>` (callable as a dispose function)

---

### `effect`

```ts
function effect(fn: EffectFn): CleanupFn;
```

Runs `fn` immediately and re-runs it whenever any signal read inside it changes. If `fn` returns a function, that function is called as cleanup before each re-run and on final dispose. Dispose is idempotent — calling the returned function more than once is safe.

```ts
const stop = effect(() => {
  document.title = count.value.toString();
  return () => { /* cleanup */ };
});

count.value = 5; // effect re-runs (cleanup called first)
stop();          // cleanup called, effect removed
stop();          // no-op — second call is safe
```

**Returns** — `CleanupFn` (idempotent dispose)

---

### `watch`

Two overloads — plain signal watch and selector watch:

```ts
// Plain watch — fires when the signal value changes
function watch<T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  options?: WatchOptions<T>,
): CleanupFn;

// Selector watch — fires only when the selected slice changes
function watch<T, U>(
  source: ReadonlySignal<T>,
  selector: (state: T) => U,
  cb: (value: U, prev: U) => void,
  options?: WatchOptions<U>,
): CleanupFn;
```

Subscribes to value changes. Does **not** fire immediately by default (unlike `effect`). Returns a `CleanupFn` to unsubscribe.

```ts
// Plain watch
const stop = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // fires
stop();

// Selector watch — works on stores and signals alike
watch(userStore, s => s.name, (name, prev) => console.log('name:', prev, '→', name));
```

**Parameters**

| Parameter           | Type                    | Description                                              |
| ------------------- | ----------------------- | -------------------------------------------------------- |
| `source`            | `ReadonlySignal<T>`     | The signal or store to watch                             |
| `selector`          | `(state: T) => U`       | Selector for the overload that watches a derived slice   |
| `cb`                | `(value, prev) => void` | Called on each change with new and previous values       |
| `options.immediate` | `boolean`               | Fire once immediately on subscription. Default `false`   |
| `options.once`      | `boolean`               | Auto-unsubscribe after the first change. Default `false` |
| `options.equals`    | `EqualityFn<U>`         | Custom equality for change detection. Default `Object.is`|

**Returns** — `CleanupFn`

---

### `batch`

```ts
function batch<T>(fn: () => T): T;
```

Runs `fn` and defers all signal/store notifications until it returns, then flushes once. Nested `batch()` calls coalesce into the outermost.

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
  const x = a.value;              // subscribed
  const y = untrack(() => b.value); // not subscribed
  console.log(x + y);
});
```

**Returns** — The return value of `fn`

---

### `readonly`

```ts
function readonly<T>(sig: ReadonlySignal<T>): ReadonlySignal<T>;
```

Narrows a `Signal<T>` to its read-only `ReadonlySignal<T>` interface. This is an identity function — the same signal object is returned with a narrower type. There is no runtime Proxy or wrapping.

```ts
const readCount = readonly(count);
readCount.value;       // ok
readCount.peek();      // ok
// readCount.value = 1; // TS compile error — no setter
```

---

### `toValue`

```ts
function toValue<T>(v: T | ReadonlySignal<T>): T;
```

Unwraps a value or signal. If `v` is a `ReadonlySignal`, returns `.value` (tracked if called inside an effect). Otherwise returns `v` as-is.

```ts
toValue(10);           // 10
toValue(signal(10));   // 10 — tracked if inside effect
```

---

### `isSignal`

```ts
function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T>;
```

Type guard — returns `true` for any value created by `signal()`, `computed()`, `writable()`, or `store()`. Works on callable function-shaped signals too.

---

### `isStore`

```ts
function isStore<T extends object = Record<string, unknown>>(value: unknown): value is Store<T>;
```

Type guard — returns `true` only for values created by `store()`.

## Store Functions

### `store`

```ts
function store<T extends object>(initial: T, options?: StoreOptions<T>): Store<T>;
```

Creates a reactive store for the given object state. A `Store<T>` extends `Signal<T>`, so `effect()`, `computed()`, `watch()`, and all other signal primitives work natively on it.

**Parameters**

| Parameter        | Type            | Description                                                                      |
| ---------------- | --------------- | -------------------------------------------------------------------------------- |
| `initial`        | `T`             | The starting state                                                               |
| `options.equals` | `EqualityFn<T>` | Custom equality for top-level change detection. Default: shallow structural equality |

**Returns** — `Store<T>`

## Signal Types

### `Signal<T>`

The base reactive primitive. All other signal types extend or compose this.

```ts
interface Signal<T> extends ReadonlySignal<T> {
  value: T; // notifying setter
}
```

---

### `ReadonlySignal<T>`

```ts
interface ReadonlySignal<T> {
  readonly value: T; // tracked getter
  peek(): T;         // untracked read
}
```

| Member        | Description                                                |
| ------------- | ---------------------------------------------------------- |
| `value` (get) | Returns current value; tracked inside `effect`/`computed`  |
| `peek()`      | Returns current value without registering a dependency     |

---

### `ComputedSignal<T>`

```ts
type ComputedSignal<T> = ReadonlySignal<T> & CleanupFn;
```

Returned by `computed()`. A read-only signal that also acts as its own dispose function — **call it** to detach from dependencies and free memory.

```ts
const doubled = computed(() => count.value * 2);
doubled.value; // read
doubled();     // dispose — NOT doubled.dispose()
```

---

### `WritableSignal<T>`

```ts
type WritableSignal<T> = Signal<T> & CleanupFn;
```

Returned by `writable()`. A bidirectional computed signal that also acts as its own dispose function — **call it** to stop tracking the getter.

```ts
const fahrenheit = writable(
  () => celsius.value * 9 / 5 + 32,
  (f) => { celsius.value = (f - 32) * 5 / 9; },
);
fahrenheit.value = 100; // write
fahrenheit();           // dispose
```

---

### `CleanupFn`

```ts
type CleanupFn = () => void;
```

A zero-argument void function. Used for teardown: returned by `effect()`, `watch()`, `computed()`, and `writable()`.

---

### `EffectFn`

```ts
type EffectFn = () => CleanupFn | void;
```

The callback passed to `effect()`. May optionally return a `CleanupFn` that fires before each re-run and on final dispose.

---

### `EqualityFn<T>`

```ts
type EqualityFn<T> = (a: T, b: T) => boolean;
```

A comparator that returns `true` when `a` and `b` should be considered equal (notification suppressed).

---

### `SignalOptions<T>`

```ts
type SignalOptions<T> = {
  equals?: EqualityFn<T>;
};
```

| Property | Type            | Default     | Description                                |
| -------- | --------------- | ----------- | ------------------------------------------ |
| `equals` | `EqualityFn<T>` | `Object.is` | Custom equality for `signal()` atoms       |

---

### `ComputedOptions<T>`

```ts
type ComputedOptions<T> = {
  equals?: EqualityFn<T>;
};
```

| Property | Type            | Default     | Description                                                          |
| -------- | --------------- | ----------- | -------------------------------------------------------------------- |
| `equals` | `EqualityFn<T>` | `Object.is` | Suppress downstream if recomputed value equals previous              |

---

### `WatchOptions<U>`

```ts
type WatchOptions<U = unknown> = {
  immediate?: boolean;
  once?: boolean;
  equals?: EqualityFn<U>;
};
```

| Property    | Type            | Default     | Description                                                                               |
| ----------- | --------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `immediate` | `boolean`       | `false`     | Fire once immediately on subscription; both `value` and `prev` are the current value      |
| `once`      | `boolean`       | `false`     | Auto-unsubscribe after the first change fires                                             |
| `equals`    | `EqualityFn<U>` | `Object.is` | Custom equality for change detection                                                      |

## Store Types

### `Store<T>`

A `Store<T>` IS a `Signal<T>` — all signal operations work on stores.

```ts
interface Store<T extends object> extends Signal<T> {
  readonly disposed: boolean;
  set(patch: Partial<T>): void;
  update(fn: (s: T) => T): void;
  reset(): void;
  select<U>(selector: (s: T) => U, options?: ComputedOptions<U>): ComputedSignal<U>;
  dispose(): void;
}
```

### `Store<T>` Methods

| Member                         | Description                                                            |
| ------------------------------ | ---------------------------------------------------------------------- |
| `.value` (get)                 | Read current state (tracked)                                           |
| `.value` (set)                 | Replace entire state (triggers notification if changed)                |
| `.peek()`                      | Read current state without tracking                                    |
| `.set(patch)`                  | Shallow-merge a `Partial<T>` into current state                        |
| `.update(fn)`                  | Derive next state via `fn(current) => next`                            |
| `.reset()`                     | Restore the original `initial` state                                   |
| `.select(selector, options?)`  | Lazily derived `ComputedSignal<U>` from a slice of state               |
| `.disposed`                    | `true` after `dispose()` has been called; further writes are ignored   |
| `.dispose()`                   | Freeze the store; all subsequent writes are silently ignored           |

---

### `StoreOptions<T>`

```ts
type StoreOptions<T extends object> = {
  equals?: EqualityFn<T>;
};
```

| Property | Type            | Default                   | Description                                    |
| -------- | --------------- | ------------------------- | ---------------------------------------------- |
| `equals` | `EqualityFn<T>` | Shallow structural equality | Custom equality for top-level change detection |

## `Store<T>` Methods

### `value`

```ts
readonly value: T
```

Returns the current state synchronously. Reading `.value` after `dispose()` still returns the last known state.

---

### `set`

```ts
set(patch: Partial<T>): void
set(updater: (s: T) => T): void
```

Updates the state. No-op if the store is disposed.

- **Partial patch** — shallowly merged onto the current state: `{ ...current, ...patch }`
- **Updater function** — receives the current state and must return the next complete state

Both forms are no-ops if the resulting state is equal to the current state (as determined by `StoreOptions.equals`).

---

### `reset`

```ts
reset(): void
```

Restores the store to the `initialState` that was passed to `store()`. No-op if the store is disposed or state is already equal.

---

### `watch`

```ts
watch(cb: (value: T, prev: T) => void, options?: WatchOptions<T>): CleanupFn
watch<U>(selector: (s: T) => U, cb: (value: U, prev: U) => void, options?: WatchOptions<U>): CleanupFn
```

Subscribes to state changes.

- **Without selector** — fires whenever the full state changes (as determined by `StoreOptions.equals`)
- **With selector** — fires only when the projected value changes (compared by `WatchOptions.equals`)

Returns a `CleanupFn`. Calling it multiple times is safe. Returns a no-op immediately if the store is disposed.

When `{ immediate: true }`, the callback is called once synchronously on subscription; both `value` and `prev` will be the current value.
When `{ once: true }`, the subscription auto-removes after the first change fires.

```ts
// Full-state watch
const unsub = s.subscribe((curr, prev) => console.log(curr));

// Selector watch
const unsub2 = s.subscribe(
  (state) => state.count,
  (count, prev) => console.log('count:', count),
);

// Fire once immediately, then auto-unsubscribe after first change
s.subscribe((curr) => setTitle(curr.title), { immediate: true, once: true });
```

---

### `dispose`

```ts
dispose(): void
```

Clears all watchers and freezes the store. After `dispose()`:

- `set()`, `reset()` — no-ops; state does not change
- `watch()` — returns a no-op unsubscribe immediately; listener is never registered
- `.value` — still readable; returns the last known state
- `.disposed` — becomes `true`
- Calling `dispose()` again is safe

## Notification Timing

All signal and store notifications fire **synchronously** — the subscriber callback runs before the next line after the write.

```ts
const unsub = s.subscribe((state) => console.log('changed:', state.count));
s.set({ count: 1 });
// 'changed: 1' has already been logged here
```

To coalesce multiple `set()` calls into a single notification, use the top-level `batch()`:

```ts
import { batch } from '@vielzeug/stateit';

batch(() => {
  s.set({ count: 1 });
  s.set({ count: 2 });
  s.set({ count: 3 });
});
// One notification fires after the batch with the final state: { count: 3 }
```

Nested `batch()` calls merge into the outermost — only one flush occurs.
