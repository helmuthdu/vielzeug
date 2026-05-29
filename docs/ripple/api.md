---
title: Ripple — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/ripple.
---

[[toc]]

## Package Entry Point

| Import              | Purpose                |
| ------------------- | ---------------------- |
| `@vielzeug/ripple` | Main exports and types |

## API At a Glance

| Symbol                 | Purpose                                       | Execution mode | Common gotcha                                                      |
| ---------------------- | --------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `signal()`             | Create reactive primitive values              | Sync           | Write signals inside batch/effect-safe flows                       |
| `computed()`           | Derive memoized values from dependencies      | Sync           | Avoid side effects inside computed callbacks                       |
| `effect()`             | Run and re-run sync side effects              | Sync           | Dispose when no longer needed to prevent memory leaks              |
| `effectAsync()`        | Run async side effects with AbortSignal       | Async          | Read reactive deps synchronously before the first `await`          |
| `watch()`              | Subscribe to value changes                    | Sync           | Does not fire immediately unlike `effect()`                        |
| `batch()`              | Coalesce multiple writes                      | Sync           | Nested batches merge into the outermost                            |
| `untrack()`            | Read without subscribing                      | Sync           | Only suppresses dependency registration, value is still read       |
| `toStore()`            | Adapt a signal to Svelte's store shape        | Sync           | Calls the subscriber immediately with the current value            |
| `scope()`              | Isolated cleanup context                      | Sync           | Must call `scope.run()` to activate; `dispose()` is LIFO           |
| `store()`              | Create object-like state container            | Sync           | Store is a branded signal; use `.patch()`, `.update()`, `.reset()` |
| `selectFrom()`         | Select a slice from a store                   | Sync           | Downstream effects only fire when the selected value changes       |
| `configure()`          | Adjust global runtime settings                | Sync           | Call once at app startup before any reactive primitives are used   |
| `setTrackingProvider()`| Override context provider for SSR             | Sync           | Returns previous provider for restore; advanced usage only         |

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
// or: sub() — direct call also disposes
// or: using sub = effect(...) — TC39 using declaration
```

**Parameters**

| Parameter | Type             | Description                                                                   |
| --------- | ---------------- | ----------------------------------------------------------------------------- |
| `fn`      | `EffectCallback` | Runs immediately and on each dependency change; may return a cleanup function |

**Returns** — `Subscription`

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

Subscribes to value changes on `source`. Does **not** fire immediately by default (unlike `effect`). For derived slices, pass a getter function or use `selectFrom()`.

```ts
// Plain watch
const sub = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // fires
sub.dispose();

// Slice watch — getter source
watch(() => userStore.value.name, (name) => console.log('name:', name));
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

### `readonly`

```ts
function readonly<T>(source: ReadonlySignal<T>): ReadonlySignal<T>;
```

Returns a read-only facade over `source`. Exposes only `value`, `peek()`, and `subscribe()`, hiding mutator methods at the type level.

```ts
const count = signal(0);
const ro = readonly(count);

console.log(ro.value); // 0
count.value = 1;
console.log(ro.value); // 1
```

**Parameters**

| Parameter | Type                | Description                         |
| --------- | ------------------- | ----------------------------------- |
| `source`  | `ReadonlySignal<T>` | Any signal/store/computed to expose |

**Returns** — `ReadonlySignal<T>`

---

### `toStore`

```ts
function toStore<T>(source: ReadonlySignal<T>): { subscribe(run: (value: T) => void): Subscription };
```

Adapts any signal or computed to the Svelte store contract. The subscriber is called immediately with the current value and again on each future change.

```ts
const count = signal(0);
const countStore = toStore(count);

const unsubscribe = countStore.subscribe((value) => console.log(value));
count.value = 1;
unsubscribe();
```

**Returns** — An object with a Svelte-compatible `subscribe(run)` method

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
isSignal(signal(42));       // true
isSignal(computed(() => 1)); // true
isSignal(store({ n: 0 }));  // true
isSignal({ value: 42 });     // false — not a real signal
```

---

## Store Functions

### `store`

```ts
function store<T extends object>(initial: T): Store<T>;
```

Creates a reactive store for the given object state. `Store<T>` is a branded signal, so `effect()`, `computed()`, `watch()`, `selectFrom()`, and all other primitives that accept `ReadonlySignal<T>` work with stores directly. `initial` is deep-cloned; external mutations after construction do not affect the store or its `reset()` baseline.

**Parameters**

| Parameter | Type | Description                                                       |
| --------- | ---- | ----------------------------------------------------------------- |
| `initial` | `T`  | Starting state; must be a plain object (not an array or primitive)|

**Returns** — `Store<T>`

---

### `selectFrom`

```ts
function selectFrom<T extends object, U>(
  source: Store<T> | ReadonlySignal<T>,
  selector: (state: T) => U,
  options?: ReactiveOptions<U>,
): ComputedSignal<U>;
```

Creates a derived computed signal that selects a slice from a store or signal. Downstream effects and subscribers are only notified when the *selected value* changes, even when other parts of the store change.

This is functionally equivalent to `computed(() => selector(source.value), options)`, but more declarative at the call site.

```ts
const cart = store({ count: 0, label: 'empty' });

const count = selectFrom(cart, (s) => s.count);
const label = selectFrom(cart, (s) => s.label);

effect(() => console.log('count:', count.value)); // only fires when count changes
effect(() => console.log('label:', label.value)); // only fires when label changes

cart.patch({ count: 1 }); // only "count" effect fires
cart.patch({ label: 'full' }); // only "label" effect fires
```

**Parameters**

| Parameter        | Type                              | Description                                                   |
| ---------------- | --------------------------------- | ------------------------------------------------------------- |
| `source`         | `Store<T>` or `ReadonlySignal<T>` | The store or signal to derive from                            |
| `selector`       | `(state: T) => U`                 | Pure function that extracts the slice                         |
| `options.equals` | `EqualityFn<U>`                   | Custom equality for the selected value. Default: `Object.is`  |

**Returns** — `ComputedSignal<U>` (call `.dispose()` when no longer needed)

---

## Configuration

### `configure`

```ts
function configure(options: { maxIterations?: number }): void;
```

Adjusts global runtime settings. Call once at app startup, before any reactive primitives are used. All parameters are optional.

| Option           | Default | Description                                                                                  |
| ---------------- | ------- | -------------------------------------------------------------------------------------------- |
| `maxIterations`  | `100`   | Maximum flush or effect loop iterations before throwing `StateError('INFINITE_LOOP', ...)`.  |

```ts
import { configure } from '@vielzeug/ripple';

// Increase the limit for apps with complex cascade graphs
configure({ maxIterations: 500 });
```

---

### `setTrackingProvider`

```ts
function setTrackingProvider(provider: TrackingProvider): TrackingProvider;
```

Replaces the reactive tracking context provider. Returns the previous provider so it can be restored. The default implementation uses a module-level variable, which is safe for browsers and synchronous Node.js SSR.

For async Node.js environments (e.g., when `effectAsync` work interleaves across requests), install an `AsyncLocalStorage`-backed provider:

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import { setTrackingProvider } from '@vielzeug/ripple';

const als = new AsyncLocalStorage();
const prev = setTrackingProvider({
  get: () => als.getStore() ?? null,
  run: (ctx, fn) => als.run(ctx, fn),
});
```

Treat the `TrackingContextRef` values as opaque tokens — do not inspect or construct them.

**Returns** — The previous `TrackingProvider`

---

## Error Handling

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
| `INFINITE_LOOP`  | Flush or effect loop exceeds `config.maxIterations`                 |
| `INVALID_CLEANUP`| `onCleanup()` is called outside an active effect or scope           |
| `INVALID_STORE`  | `store()` is called with a non-object, or `patch()` receives a non-object |

Errors from multiple subscribers or cleanup functions in the same flush are aggregated into a standard `AggregateError` with each original error as an element.

---

## Signal Types

### `Signal<T>`

```ts
interface Signal<T> extends ReadonlySignal<T> {
  update(fn: (current: T) => T): void;
  peek(): T;
  subscribe(onStoreChange: () => void): Subscription;
  value: T; // notifying setter — write triggers downstream notifications
}
```

---

### `ReadonlySignal<T>`

```ts
interface ReadonlySignal<T> {
  peek(): T;
  subscribe(onStoreChange: () => void): Subscription;
  readonly value: T;
}
```

| Member        | Description                                               |
| ------------- | --------------------------------------------------------- |
| `value` (get) | Returns current value; tracked inside `effect`/`computed` |
| `peek()`      | Returns current value without tracking                    |
| `subscribe()` | Registers a change listener without an initial callback   |

---

### `ComputedSignal<T>`

```ts
interface ComputedSignal<T> extends ReadonlySignal<T> {
  dispose(): void;
  [Symbol.dispose](): void;
}
```

Returned by `computed()` and `selectFrom()`. A read-only signal with an explicit dispose method.

---

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
| `.patch(partial)` | Shallow-merge when any provided key changes (`Object.is` comparison)          |
| `.update(fn)`     | Receive current state; return value replaces it                               |
| `.reset()`        | Restore the original `initial` state (deep-clones the stored baseline)        |

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

### `CleanupFn` / `EffectCallback` / `EqualityFn<T>` / `ReactiveOptions<T>` / `WatchOptions<T>`

```ts
type CleanupFn = () => void;
type EffectCallback = () => CleanupFn | void;
type EqualityFn<T> = (a: T, b: T) => boolean;
type ReactiveOptions<T> = { equals?: EqualityFn<T> };
type WatchOptions<T> = { immediate?: boolean; equals?: EqualityFn<T> };
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
