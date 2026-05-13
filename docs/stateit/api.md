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
| `effect()`      | Run and re-run side effects              | Sync           | Dispose when no longer needed to prevent memory leaks         |
| `watch()`       | Subscribe to value changes               | Sync           | Does not fire immediately unlike `effect()`                   |
| `batch()`       | Coalesce multiple writes                 | Sync           | Nested batches merge into the outermost                       |
| `untrack()`     | Read without subscribing                 | Sync           | Only suppresses dependency registration, value is still read  |
| `scope()`       | Isolated cleanup context                 | Sync           | Must call `scope.run()` to activate; `dispose()` is LIFO      |
| `store()`       | Create object-like state container       | Sync           | Store is a branded signal; use `.patch()`, `.update()`, `.reset()` |

## Signal Primitives

### `signal`

```ts
function signal<T>(initial: T, options?: ReactiveOptions<T>): Signal<T>;
```

Creates a reactive atom. Read `.value` inside an `effect` or `computed` to subscribe. Write `.value = next` to update and notify dependents.

```ts
const count = signal(0);
count.value; // 0 — tracked read
count.value = 1; // notifies dependents
count.value = count.value + 1; // 2
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

Creates a lazy derived read-only signal. The `compute` function runs on the first `.value` read and again after any dependency changes. Propagation is **glitch-free**: when a signal that multiple computed nodes share changes, all computed nodes are marked dirty before any subscribed effects run — effects always observe a consistent snapshot.

Call `.dispose()` to detach from dependencies.

```ts
const count = signal(3);
const doubled = computed(() => count.value * 2);
doubled.value; // 6 — compute runs here
count.value = 5;
doubled.value; // 10 — recomputed on read

doubled.dispose(); // stop tracking
// or: using doubled = computed(...) — TC39 using declaration
```

When `options.equals` is provided, downstream subscribers are suppressed if the recomputed value equals the previous value.

**Parameters**

| Parameter        | Type            | Description                                                           |
| ---------------- | --------------- | --------------------------------------------------------------------- |
| `compute`        | `() => T`       | Computation function; signals read inside are tracked as dependencies |
| `options.equals` | `EqualityFn<T>` | Suppress downstream if result is unchanged. Default: `Object.is`      |

**Returns** — `ComputedSignal<T>`

---

### `effect`

```ts
function effect(fn: EffectCallback): Subscription;
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

| Parameter | Type             | Description                                                        |
| --------- | ---------------- | ------------------------------------------------------------------ |
| `fn`      | `EffectCallback` | Runs immediately and on each dependency change; may return a cleanup function |

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

Registers a cleanup function within the currently active effect **or** `scope`. When called inside an `effect`, the cleanup runs before the next re-execution and when the effect is disposed. When called inside `scope.run()`, the cleanup runs when `scope.dispose()` is called.

```ts
function useInterval(ms: number) {
  const id = setInterval(() => console.log('tick'), ms);
  onCleanup(() => clearInterval(id)); // works in both effect and scope contexts
}

// Inside an effect:
effect(() => { useInterval(1000); });

// Inside a scope:
const s = scope();
s.run(() => { useInterval(5000); }); // cleanup runs on s.dispose()
```

---

### `isSignal`

```ts
function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T>;
```

Type guard that returns `true` for values created by `signal()`, `computed()`, or `store()`. Uses an internal symbol marker, so arbitrary objects with a `value` property will not pass.

```ts
isSignal(signal(42)); // true
isSignal(computed(() => 1)); // true
isSignal(store({ value: 42 })); // true
isSignal({ value: 42 }); // false — not a real signal
```

---

## Store Functions

### `store`

```ts
function store<T extends object>(initial: T): Store<T>;
```

Creates a reactive store for the given object state. `Store<T>` is a branded signal, so `effect()`, `computed()`, `watch()`, and all other signal primitives that accept `ReadonlySignal<T>` work with stores directly.

**Parameters**

| Parameter | Type | Description                                                                         |
| --------- | ---- | ----------------------------------------------------------------------------------- |
| `initial` | `T`  | The starting state (defensively copied; external mutations do not affect `reset()`) |

**Returns** — `Store<T>`

---

## Signal Types

### `Signal<T>`

The base readable/writable reactive primitive.

```ts
interface Signal<T> extends ReadonlySignal<T> {
  value: T; // notifying setter — write triggers downstream notifications
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
  dispose(): void;
  [Symbol.dispose](): void;
}
```

Returned by `computed()`. A read-only signal with an explicit dispose method.

```ts
const doubled = computed(() => count.value * 2);
doubled.value; // read
doubled.dispose(); // stop tracking
// or: using doubled = computed(...)
```

---

### `Scope`

```ts
interface Scope {
  readonly run: <T>(fn: () => T) => T;
  readonly dispose: () => void;
  readonly [Symbol.dispose]: () => void;
}
```

Returned by `scope()`. `run(fn)` activates the scope so that `onCleanup()` calls inside `fn` register on this scope. `dispose()` runs all registered cleanups in **LIFO order** and is idempotent.

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

Accepted by `signal()` and `computed()`.

---

### `WatchOptions<T>`

```ts
type WatchOptions<T> = {
  immediate?: boolean;
  equals?: EqualityFn<T>;
};
```

| Property    | Type            | Default     | Description                                                                          |
| ----------- | --------------- | ----------- | ------------------------------------------------------------------------------------ |
| `immediate` | `boolean`       | `false`     | Fire once immediately on subscription; both `value` and `prev` are the current value |
| `equals`    | `EqualityFn<T>` | `Object.is` | Custom equality for change detection                                                 |

---

## Store Types

### `Store<T>`

```ts
interface Store<T extends object> extends ReadonlySignal<T> {
  readonly value: T;
  patch(partial: Partial<T>): void;
  update(fn: (state: T) => T): void;
  reset(): void;
}
```

| Member            | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| `.value` (get)    | Read current state; tracked inside `effect`/`computed`; store is a signal too |
| `.patch(partial)` | Shallow-merge a `Partial<T>` into state: `{ ...current, ...partial }`         |
| `.update(fn)`     | Receive current state; return value replaces it                               |
| `.reset()`        | Restore the original `initial` state                                          |

---

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
