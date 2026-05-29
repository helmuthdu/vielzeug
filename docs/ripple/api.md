---
title: Ripple — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/ripple.
---

[[toc]]

## API At a Glance

| Symbol          | Purpose                                       | Execution mode | Common gotcha                                                      |
| --------------- | --------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `signal()`      | Create reactive primitive values              | Sync           | Write signals inside batch/effect-safe flows                       |
| `computed()`    | Derive memoized values from dependencies      | Sync           | Avoid side effects inside computed callbacks                       |
| `effect()`      | Run and re-run sync side effects              | Sync           | Dispose when no longer needed to prevent memory leaks              |
| `effectAsync()` | Run async side effects with AbortSignal       | Async          | Read reactive deps synchronously before the first `await`          |
| `watch()`       | Subscribe to value changes                    | Sync           | Does not fire immediately unlike `effect()`                        |
| `batch()`       | Coalesce multiple writes                      | Sync           | Nested batches merge into the outermost                            |
| `untrack()`     | Read without subscribing                      | Sync           | Only suppresses dependency registration, value is still read       |
| `readonly()`    | Wrap any signal as a read-only ComputedSignal | Sync           | Returns `ComputedSignal<T>`; dispose it when done                  |
| `scope()`       | Isolated cleanup context                      | Sync           | Must call `scope.run()` to activate; `dispose()` is LIFO           |
| `store()`       | Create object-like state container            | Sync           | Store is a branded signal; use `.patch()`, `.update()`, `.reset()` |
| `isSignal()`    | Type guard for any signal/computed/store      | Sync           | Uses an internal symbol marker, not duck-typing                    |
| `isComputed()`  | Type guard for computed signals               | Sync           | Returns `false` for plain signals and stores                       |
| `isStore()`     | Type guard for stores                         | Sync           | Returns `false` for plain signals and computed signals             |

## Package Entry Point

| Import              | Purpose                |
| ------------------- | ---------------------- |
| `@vielzeug/ripple` | Main exports and types |

## Signal Primitives

### `signal`

```ts
function signal<T>(initial: T, options?: ReactiveOptions<T>): Signal<T>;
```

Creates a reactive atom. Read `.value` inside an `effect` or `computed` to subscribe. Write `.value = next` to update and notify dependents.

Signals also expose:

- `peek(): T` — read the current value without registering a dependency
- `subscribe(onStoreChange): Subscription` — subscribe to future changes without an initial callback, suitable for `useSyncExternalStore()`

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

If `computed()` is created inside an active `effect()` or `scope.run()` context, it is automatically registered for cleanup and disposed with that context.

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
// or: sub() — direct call also disposes
// or: using sub = effect(...) — TC39 using declaration
```

```ts
// With options
const stop = effect(
  () => console.log('count:', count.value),
  {
    scheduler: 'microtask', // defer re-runs to a microtask queue
    name: 'count-logger',   // appears in error messages
    trace: true,            // logs changed sources before each re-run
    maxIterations: 50,      // loop guard (default: 100)
  },
);
```

**Parameters**

| Parameter               | Type               | Default        | Description                                                                   |
| ----------------------- | ------------------ | -------------- | ----------------------------------------------------------------------------- |
| `fn`                    | `EffectCallback`   |                | Runs immediately and on each dependency change; may return a cleanup function |
| `options.scheduler`     | `EffectScheduler`  | `'sync'`       | When to schedule re-runs: `'sync'` (default), `'microtask'`, or `'raf'`       |
| `options.name`          | `string`           | `undefined`    | Name shown in error messages for loop and cycle errors                        |
| `options.trace`         | `boolean`          | `false`        | Log the changed reactive sources to the console before each re-run            |
| `options.maxIterations` | `number`           | `100`          | Loop guard: throws `StateError('INFINITE_LOOP')` if exceeded                  |

**Returns** — `Subscription`

See also: [`EffectOptions`](#effectoptions), [`EffectScheduler`](#effectscheduler)

---

### `effectAsync`

```ts
function effectAsync(fn: AsyncEffectCallback, options?: { onError?: (error: unknown) => void }): Subscription;
```

Like `effect()`, but the callback is async and receives an `AbortSignal` that fires when the effect re-runs or is disposed. Read reactive dependencies **synchronously** before the first `await` to register them as tracked.

When the reactive dependencies change:
1. The current in-flight operation's `AbortSignal` is aborted.
2. Any cleanup returned by the previous run is called.
3. A new run starts.

Errors from runs where `signal.aborted` is `true` are silently discarded. Other unhandled async errors are passed to `options.onError` (defaults to surfacing as an unhandled promise rejection).

```ts
const userId = signal('u1');

const stop = effectAsync(async (signal) => {
  const id = userId.value; // sync dep — tracked
  const data = await fetchUser(id, { signal }); // automatically aborted if id changes

  renderUser(data);

  return () => cleanup(); // optional cleanup
});

userId.value = 'u2'; // aborts in-flight fetch, starts a new one
stop(); // aborts current fetch, calls cleanup
```

**Parameters**

| Parameter        | Type                  | Description                                                               |
| ---------------- | --------------------- | ------------------------------------------------------------------------- |
| `fn`             | `AsyncEffectCallback` | Async callback receiving an `AbortSignal`; may return async cleanup       |
| `options.onError`| `(err) => void`       | Handler for non-aborted errors. Default: unhandled promise rejection      |

**Returns** — `Subscription`

---

### `watch`

```ts
function watch<T>(
  source: ReadonlySignal<T> | (() => T),
  cb: (value: T, prev: T) => void,
  options?: WatchOptions<T>,
): Subscription;
```

Subscribes to value changes on `source`. Does **not** fire immediately by default (unlike `effect`). For derived slices, pass a getter function or use the `.map()` combinator.

```ts
// Plain watch
const sub = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // fires
sub.dispose();

// Slice watch — getter source
watch(() => userStore.value.name, (name) => console.log('name:', name));

// Slice watch — lens
const nameLens = userStore.lens('name');
watch(nameLens, (name) => console.log('name:', name));
```

**Parameters**

| Parameter           | Type                                  | Description                                               |
| ------------------- | ------------------------------------- | --------------------------------------------------------- |
| `source`            | `ReadonlySignal<T>` or `() => T`      | The signal, store, or getter to watch                     |
| `cb`                | `(value: T, prev: T) => void`         | Called on each change with new and previous values        |
| `options.immediate` | `boolean`                             | Fire once immediately on subscription. Default `false`    |
| `options.equals`    | `EqualityFn<T>`                       | Custom equality for change detection. Default `Object.is` |

**Returns** — `Subscription`

---

### `batch`

```ts
function batch<T>(fn: () => T, options?: BatchOptions): T;
```

Runs `fn` and defers all signal/store notifications until it returns, then flushes once. Nested `batch()` calls coalesce into the outermost — the inner batch `options` are ignored; only the outermost `options` apply. If `fn` throws, pending effects are still flushed; the original error takes precedence.

```ts
batch(() => {
  a.value = 1;
  b.value = 2;
  // one combined notification after fn returns
});

// With options
batch(() => applyHeavyUpdate(), { maxIterations: 200 });
```

**Parameters**

| Parameter               | Type     | Default | Description                                                       |
| ----------------------- | -------- | ------- | ----------------------------------------------------------------- |
| `fn`                    | `() => T`|         | Mutations to coalesce                                             |
| `options.maxIterations` | `number` | `100`   | Loop guard for the flush that follows this batch                  |

**Returns** — The return value of `fn`

See also: [`BatchOptions`](#batchoptions)

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

### `readonly`

```ts
function readonly<T>(source: ReadonlySignal<T>): ComputedSignal<T>;
```

Wraps `source` in a `computed(() => source.value)` — the returned `ComputedSignal<T>` exposes only `value`, `peek()`, `subscribe()`, `map()`, and `filter()`. Mutator methods are hidden at the type level. Call `.dispose()` when done.

```ts
const count = signal(0);
const ro = readonly(count);

console.log(ro.value); // 0
count.value = 1;
console.log(ro.value); // 1

ro.dispose(); // unlinks the internal computed
```

**Parameters**

| Parameter | Type                | Description                         |
| --------- | ------------------- | ----------------------------------- |
| `source`  | `ReadonlySignal<T>` | Any signal/store/computed to expose |

**Returns** — `ComputedSignal<T>`

---

### `onCleanup`

```ts
function onCleanup(fn: CleanupFn): void;
```

Registers a cleanup function within the currently active `effect()` or `scope.run()` context. Throws `StateError('INVALID_CLEANUP', ...)` when called outside either context.

```ts
effect(() => {
  const id = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(id));
});
```

---

### `isSignal`

```ts
function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T>;
```

Type guard returning `true` for values created by `signal()`, `computed()`, or `store()`. Uses an internal symbol marker.

```ts
isSignal(signal(42));        // true
isSignal(computed(() => 1)); // true
isSignal(store({ n: 0 }));   // true
isSignal({ value: 42 });     // false — not a real signal
```

---

### `isComputed`

```ts
function isComputed<T = unknown>(value: unknown): value is ComputedSignal<T>;
```

Type guard returning `true` only for values created by `computed()` or `readonly()`. Returns `false` for plain `signal()` and `store()` instances.

```ts
isComputed(computed(() => 1));  // true
isComputed(readonly(signal(0))); // true
isComputed(signal(42));          // false
isComputed(store({ n: 0 }));     // false
```

---

### `isStore`

```ts
function isStore<T extends object = Record<string, unknown>>(value: unknown): value is Store<T>;
```

Type guard returning `true` only for values created by `store()`. Returns `false` for plain signals and computed signals.

```ts
isStore(store({ n: 0 }));   // true
isStore(signal(42));        // false
isStore(computed(() => 1)); // false
```

---

## Store Functions

### `store`

```ts
function store<T extends object>(initial: T, options?: ReactiveOptions<T>): Store<T>;
```

Creates a reactive store for the given object state. `Store<T>` is a branded signal, so `effect()`, `computed()`, `watch()`, and all other primitives that accept `ReadonlySignal<T>` work with stores directly. `initial` is deep-cloned; external mutations after construction do not affect the store or its `reset()` baseline.

**Parameters**

| Parameter | Type | Description                                                       |
| --------- | ---- | ----------------------------------------------------------------- |
| `initial` | `T`  | Starting state; must be a plain object (not an array or primitive)|

**Returns** — `Store<T>`

---

### `store.lens`

```ts
store.lens<P extends string>(path: P): Signal<PathValue<T, P>>;
```

Returns a writable `Signal` scoped to a specific property or nested dot-path within the store. The lens is cached — calling `.lens('a.b')` twice on the same store returns the same instance. Writes through the lens produce an immutable structural copy of the store state; intermediary objects must not be `null` or a primitive or a `StateError('INVALID_STORE')` is thrown.

The lens `Signal` is disposed and evicted from the cache when `store.lens()` is called with that same path after the lens was disposed.

```ts
const settings = store({
  user: { name: 'Alice', address: { city: 'Berlin' } },
  theme: 'light' as 'light' | 'dark',
});

// Top-level path
const theme = settings.lens('theme');           // Signal<'light' | 'dark'>
theme.value = 'dark';

// Nested dot-path
const city = settings.lens('user.address.city'); // Signal<string>
city.value = 'Hamburg';

console.log(settings.value.user.address.city);   // 'Hamburg'
console.log(settings.value.theme);               // 'dark'

// Watch a single field
watch(theme, (next, prev) => console.log(prev, '→', next));
```

**Parameters**

| Parameter | Type       | Description                                             |
| --------- | ---------- | ------------------------------------------------------- |
| `path`    | `P`        | Dot-separated key path, e.g. `'user.address.city'`      |

**Returns** — `Signal<PathValue<T, P>>`

See also: [`PathValue<T, P>`](#pathvaluet-p)

---

## Signal Combinators

All signal types — `Signal<T>`, `ComputedSignal<T>`, and `Store<T>` — expose `map()` and `filter()` as built-in combinators. Both return a `ComputedSignal` that must be disposed when no longer needed.

### `.map`

```ts
map<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
```

Creates a derived `ComputedSignal<U>` equivalent to `computed(() => fn(source.value), options)`. Downstream subscribers are only notified when the mapped value changes according to `options.equals`.

```ts
const count = signal(3);
const doubled = count.map((n) => n * 2);
doubled.value; // 6
count.value = 5;
doubled.value; // 10
doubled.dispose();

// Works on stores too
const cart = store({ items: 0, label: '' });
const itemCount = cart.map((s) => s.items); // ComputedSignal<number>
```

**Parameters**

| Parameter        | Type              | Description                                                       |
| ---------------- | ----------------- | ----------------------------------------------------------------- |
| `fn`             | `(value: T) => U` | Projection function                                               |
| `options.equals` | `EqualityFn<U>`   | Custom equality for change detection. Default: `Object.is`        |
| `options.name`   | `string`          | Name shown in error messages                                      |

**Returns** — `ComputedSignal<U>`

---

### `.filter`

```ts
filter(predicate: (value: T) => boolean): ComputedSignal<T | undefined>;
filter<U extends T>(predicate: (value: T) => value is U): ComputedSignal<U | undefined>;
```

Creates a `ComputedSignal<T | undefined>` that passes the current value when `predicate` returns `true`, and `undefined` otherwise. Supports type-guard predicates for narrowing to a subtype.

```ts
const count = signal(3);
const even = count.filter((n) => n % 2 === 0);
even.value; // undefined (3 is odd)
count.value = 4;
even.value; // 4
even.dispose();

// Type guard overload
const val = signal<string | null>(null);
const nonNull = val.filter((v): v is string => v !== null); // ComputedSignal<string | undefined>
```

**Returns** — `ComputedSignal<T | undefined>` (or `ComputedSignal<U | undefined>` for the type-guard overload)

---

## Errors

### `StateError`

All errors thrown by ripple are instances of `StateError`, which extends `Error` with a machine-readable `code` field.

```ts
class StateError extends Error {
  readonly code: StateErrorCode;
}
```

This allows consumers to catch and distinguish specific error types programmatically:

```ts
import { StateError } from '@vielzeug/ripple';

try {
  computed.value;
} catch (e) {
  if (e instanceof StateError && e.code === 'DISPOSED_READ') {
    // handle disposed computed
  }
}
```

**Error codes**

| Code             | Thrown when                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `COMPUTED_CYCLE` | A computed function reads another computed that depends on it       |
| `DISPOSED_READ`  | `.value`, `.peek()`, or `.subscribe()` is called on a disposed computed |
| `DISPOSED_SCOPE` | `scope.run()` is called after `scope.dispose()`                     |
| `INFINITE_LOOP`  | Flush or effect loop exceeds `maxIterations` (default 100)          |
| `INVALID_CLEANUP`| `onCleanup()` is called outside an active effect or scope           |
| `INVALID_STORE`  | `store()` is called with a non-object; `patch()` receives a non-object; or `store.lens()` path traverses a `null` or non-object intermediate |

Errors from multiple subscribers or cleanup functions in the same flush are aggregated into a standard `AggregateError` with each original error as an element.

---

## Types

### `Signal<T>`

```ts
interface Signal<T> extends ReadonlySignal<T> {
  update(fn: (current: T) => T): void;
  dispose(): void;
  [Symbol.dispose](): void;
  value: T; // notifying setter — write triggers downstream notifications
}
```

---

### `ReadonlySignal<T>`

```ts
interface ReadonlySignal<T> {
  peek(): T;
  subscribe(onStoreChange: () => void): Subscription;
  map<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
  filter(predicate: (value: T) => boolean): ComputedSignal<T | undefined>;
  filter<U extends T>(predicate: (value: T) => value is U): ComputedSignal<U | undefined>;
  readonly value: T;
}
```

| Member        | Description                                               |
| ------------- | --------------------------------------------------------- |
| `value` (get) | Returns current value; tracked inside `effect`/`computed` |
| `peek()`      | Returns current value without tracking                    |
| `subscribe()` | Registers a change listener without an initial callback   |
| `map()`       | Creates a derived `ComputedSignal<U>` from this signal    |
| `filter()`    | Creates a `ComputedSignal<T\|undefined>` via a predicate  |

---

### `ComputedSignal<T>`

```ts
interface ComputedSignal<T> extends ReadonlySignal<T> {
  dispose(): void;
  [Symbol.dispose](): void;
}
```

Returned by `computed()` and `readonly()`. A read-only signal with an explicit dispose method. Inherits `map()` and `filter()` from `ReadonlySignal<T>`.

---

### `Store<T>`

```ts
interface Store<T extends object> extends ReadonlySignal<T> {
  readonly value: T;
  lens<P extends string>(path: P): Signal<PathValue<T, P>>;
  patch(partial: Partial<T>): void;
  update(fn: (state: T) => T): void;
  reset(): void;
}
```

| Member              | Description                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `.value` (get)      | Read current state; tracked inside `effect`/`computed`; store is a signal too                  |
| `.lens(path)`       | Returns a cached, writable `Signal` for a property or dot-path; writes produce an immutable copy|
| `.patch(partial)`   | Shallow-merge when any provided key changes (`Object.is` comparison)                            |
| `.update(fn)`       | Receive current state; return value replaces it; same-reference return is a silent no-op        |
| `.reset()`          | Restore the original `initial` state (deep-clones the stored baseline)                          |

Inherits `map()` and `filter()` from `ReadonlySignal<T>` for creating derived computed signals from the store value.

---

### `Scope`

```ts
interface Scope {
  readonly run: <T>(fn: () => T) => T;
  readonly dispose: () => void;
  readonly [Symbol.dispose]: () => void;
}
```

Returned by `scope()`. `run(fn)` activates the scope for `onCleanup()` calls. `dispose()` runs all registered cleanups in **LIFO order** and is idempotent.

---

### `Subscription`

```ts
interface Subscription {
  (): void;           // direct call — disposes the subscription
  dispose(): void;    // explicit method — equivalent to calling directly
  [Symbol.dispose](): void; // TC39 using declarations
}
```

Returned by `effect()`, `effectAsync()`, and `watch()`. All three forms are equivalent and idempotent.

```ts
const sub = effect(() => ...);
sub();           // dispose
sub.dispose();   // dispose (same effect, idempotent)
// or: using sub = effect(...) — TC39 using declaration
```

---

### `AsyncEffectCallback`

```ts
type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
```

The callback passed to `effectAsync()`. Receives an `AbortSignal` that fires when the effect re-runs or is disposed. May return an async cleanup function.

---

### `EffectOptions`

```ts
type EffectOptions = {
  maxIterations?: number;   // default: 100
  name?: string;            // appears in error messages
  scheduler?: EffectScheduler; // default: 'sync'
  trace?: boolean;          // default: false
};
```

All fields are optional. `name` is used in `StateError` messages to identify the effect. `trace` logs the reactive sources that changed before each re-run. `maxIterations` controls the loop guard for this specific effect.

---

### `EffectScheduler`

```ts
type EffectScheduler = 'sync' | 'microtask' | 'raf';
```

| Value         | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `'sync'`      | (default) Re-run synchronously as part of the signal write propagation    |
| `'microtask'` | Re-run queued via `queueMicrotask()` — deferred but before next paint     |
| `'raf'`       | Re-run queued via `requestAnimationFrame()` — capped at display refresh rate |

For `'microtask'` and `'raf'`, rapid signal writes within the same task coalesce into one re-run.

---

### `BatchOptions`

```ts
type BatchOptions = {
  maxIterations?: number; // default: 100
};
```

Options for `batch()`. Only the outermost batch's options apply when batches are nested.

---

### `PathValue<T, P>`

```ts
type PathValue<T, P extends string> = ...; // recursive conditional type
```

Extracts the type at a dot-separated property path. Used as the return type of `store.lens<P>(path): Signal<PathValue<T, P>>`.

```ts
type Settings = { user: { name: string; address: { city: string } }; theme: 'light' | 'dark' };

type ThemeType = PathValue<Settings, 'theme'>;             // 'light' | 'dark'
type CityType  = PathValue<Settings, 'user.address.city'>; // string
```

---

### `CleanupFn` / `EffectCallback` / `EqualityFn<T>` / `ReactiveOptions<T>` / `WatchOptions<T>`

```ts
type CleanupFn = () => void;
type EffectCallback = () => CleanupFn | void;
type EqualityFn<T> = (a: T, b: T) => boolean;
type ReactiveOptions<T> = { equals?: EqualityFn<T>; name?: string };
type WatchOptions<T> = ReactiveOptions<T> & { immediate?: boolean };
```

---

## Notification Timing

All signal and store notifications fire **synchronously** — the subscriber callback runs before the next line after the write.

```ts
const s = store({ count: 0 });
const sub = watch(() => s.value.count, (count) => console.log('changed:', count));
s.patch({ count: 1 });
// 'changed: 1' has already been logged here
```

To coalesce multiple writes into a single notification, use `batch()`:

```ts
batch(() => {
  s.patch({ count: 1 });
  s.patch({ count: 2 });
  s.patch({ count: 3 });
});
// One notification fires after the batch with the final state: { count: 3 }
```

Nested `batch()` calls merge into the outermost — only one flush occurs.
