---
title: Ripple — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/ripple.
---

[[toc]]

## API At a Glance

| Symbol               | Purpose                                        | Execution mode | Common gotcha                                                           |
| -------------------- | ---------------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `signal()`           | Create reactive primitive values               | Sync           | Write signals inside batch/effect-safe flows                            |
| `computed()`         | Derive memoized values from dependencies       | Sync           | Avoid side effects inside computed callbacks                            |
| `effect()`           | Run and re-run sync side effects               | Sync           | Dispose when no longer needed to prevent memory leaks                   |
| `effectAsync()`      | Run async side effects with AbortSignal        | Async          | Read reactive deps synchronously before the first `await`               |
| `asyncComputed()`    | Async computed with lifecycle state            | Async          | Status is `'idle'` until first run; read `.value.status`                |
| `watch()`            | Subscribe to value changes                     | Sync           | Does not fire immediately unlike `effect()`                             |
| `batch()`            | Coalesce multiple writes                       | Sync           | Nested batches merge into the outermost                                 |
| `untrack()`          | Read without subscribing                       | Sync           | Only suppresses dependency registration, value is still read            |
| `readonly()`         | Wrap any signal as a read-only ComputedSignal  | Sync           | Returns `ComputedSignal<T>`; dispose it when done                       |
| `scope()`            | Isolated cleanup context                       | Sync           | Must call `scope.run()` to activate; `dispose()` is LIFO                |
| `asyncScope()`       | Async variant of `scope()` for async setup     | Async          | `onCleanup()` only works before the first `await`                       |
| `debugEffect()`      | Effect that logs changed sources before re-run | Sync           | Sub-path only: `@vielzeug/ripple/devtools`; tree-shaken from production |
| `store()`            | Create object-like state container             | Sync           | Store is a branded signal; use `.patch()`, `.replace()`, `.reset()`     |
| `storeWithHistory()` | Store with snapshot-based undo/redo history    | Sync           | Lens writes also push snapshots; `maxHistory` caps the buffer           |
| `installDevTools()`  | Install DevTools observation hook              | Sync           | Sub-path only: `@vielzeug/ripple/devtools`; pass `null` to uninstall    |
| `getDevToolsHook()`  | Return current DevTools hook                   | Sync           | Returns `null` if none installed                                        |
| `getSignalName()`    | Look up registered name for a signal/store     | Sync           | Returns `undefined` for unnamed signals and stores                      |
| `isSignal()`         | Type guard for any signal/computed/store       | Sync           | Uses an internal symbol marker, not duck-typing                         |
| `isComputed()`       | Type guard for computed signals                | Sync           | Returns `false` for plain signals and stores                            |
| `isStore()`          | Type guard for stores                          | Sync           | Returns `false` for plain signals and computed signals                  |

## Package Entry Point

| Import                      | Purpose                                                                     |
| --------------------------- | --------------------------------------------------------------------------- |
| `@vielzeug/ripple`          | All core exports and types (including `RippleDevToolsHook` and event types) |
| `@vielzeug/ripple/devtools` | `installDevTools`, `debugEffect` — dev-only, tree-shaken from prod          |
| `@vielzeug/ripple/ssr`      | No-op stubs for server-side rendering                                       |

## Signal Primitives

### `signal`

```ts
function signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
```

Creates a reactive atom. Read `.value` inside an `effect` or `computed` to subscribe. Write `.value = next` to update and notify dependents.

Signals also expose:

- `peek(): T` — read the current value without registering a dependency
- `update(fn)` — atomic read-modify-write: `signal.update(n => n + 1)`
- `subscribe(onStoreChange): Subscription` — subscribe to future changes without an initial callback, suitable for `useSyncExternalStore()`

```ts
const count = signal(0);
count.value; // 0 — tracked read
count.value = 1; // notifies dependents
count.update((n) => n + 1); // 2 — atomic read-modify-write
```

**Parameters**

| Parameter         | Type            | Description                                                                                            |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| `initial`         | `T`             | The starting value                                                                                     |
| `options.equals`  | `EqualityFn<T>` | Custom equality; skip notification when `true`. Default: `Object.is`                                   |
| `options.name`    | `string`        | Name used in DevTools and error messages                                                               |
| `options.batched` | `boolean`       | When `true`, coalesces rapid synchronous writes into a single microtask notification. Default: `false` |

**Returns** — `Signal<T>`

See also: [`SignalOptions<T>`](#signaloptions)

---

### `computed`

```ts
// Auto-tracking overload
function computed<T>(compute: () => T, options?: ReactiveOptions<T>): ComputedSignal<T>;

// Explicit dep array overload — deps are tracked; fn receives pre-read values untracked
function computed<D extends readonly ReadonlySignal<unknown>[], T>(
  deps: readonly [...D],
  fn: (...values: SignalValues<D>) => T,
  options?: ReactiveOptions<T>,
): ComputedSignal<T>;
```

Creates a lazy derived read-only signal. The `compute` function runs on the first `.value` read and again after any dependency changes. Propagation is **glitch-free**: when a signal that multiple computed nodes share changes, all computed nodes are marked dirty before any subscribed effects run — effects always observe a consistent snapshot.

Call `.dispose()` to detach from dependencies.

If `computed()` is created inside an active `effect()` or `scope.run()` context, it is automatically registered for cleanup and disposed with that context.

```ts
// Auto-tracking
const count = signal(3);
const doubled = computed(() => count.value * 2);
doubled.value; // 6 — compute runs here
count.value = 5;
doubled.value; // 10 — recomputed on read

doubled.dispose(); // stop tracking
// or: using doubled = computed(...) — TC39 using declaration

// Explicit dep array — fn receives values directly, no .value needed
const a = signal(2);
const b = signal(3);
const sum = computed([a, b], (av, bv) => av + bv);
sum.value; // 5
```

When `options.equals` is provided, downstream subscribers are suppressed if the recomputed value equals the previous value. When `options.fallback` is provided, compute errors are caught and the fallback is called instead of propagating.

**Parameters**

| Parameter          | Type               | Description                                                            |
| ------------------ | ------------------ | ---------------------------------------------------------------------- |
| `compute`          | `() => T`          | Computation function; signals read inside are tracked as dependencies  |
| `deps`             | `readonly [...D]`  | Explicit dep array; signals are tracked; fn receives their values      |
| `fn`               | `(...values) => T` | Computation function for the dep-array overload                        |
| `options.equals`   | `EqualityFn<T>`    | Suppress downstream if result is unchanged. Default: `Object.is`       |
| `options.name`     | `string`           | Name used in DevTools and cycle error messages                         |
| `options.fallback` | `(err, last) => T` | Called when compute throws; return value is used as the computed value |

**Returns** — `ComputedSignal<T>`

See also: [`ReactiveOptions<T>`](#reactiveoptions)

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
const stop = effect(() => console.log('count:', count.value), {
  scheduler: 'microtask', // defer re-runs to a microtask queue
  name: 'count-logger', // appears in error messages
  maxIterations: 50, // loop guard (default: 100)
});

// Custom scheduler function
const stop2 = effect(() => renderFrame(data.value), { scheduler: (run) => requestIdleCallback(run) });
```

**Parameters**

| Parameter               | Type                                           | Default     | Description                                                                   |
| ----------------------- | ---------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| `fn`                    | `EffectCallback`                               |             | Runs immediately and on each dependency change; may return a cleanup function |
| `options.scheduler`     | `EffectScheduler \| (run: () => void) => void` | `'sync'`    | When/how to schedule re-runs; accepts built-in strings or a custom function   |
| `options.name`          | `string`                                       | `undefined` | Name shown in error messages for loop and cycle errors                        |
| `options.maxIterations` | `number`                                       | `100`       | Loop guard: throws `StateError('INFINITE_LOOP')` if exceeded                  |

**Returns** — `Subscription`

See also: [`EffectOptions`](#effectoptions), [`EffectScheduler`](#effectscheduler)

---

### `effectAsync`

```ts
function effectAsync(fn: AsyncEffectCallback, options?: EffectAsyncOptions): AsyncSubscription;
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
stop.dispose(); // aborts current fetch, calls cleanup
```

**Parameters**

| Parameter         | Type                  | Description                                                         |
| ----------------- | --------------------- | ------------------------------------------------------------------- |
| `fn`              | `AsyncEffectCallback` | Async callback receiving an `AbortSignal`; may return async cleanup |
| `options.onError` | `(err) => void`       | Handler for non-aborted errors. Default: logs via `console.error`   |

**Returns** — `AsyncSubscription` (extends `Subscription` with `disposeAsync(): Promise<void>`)

See also: [`EffectAsyncOptions`](#effectasyncoptions), [`AsyncEffectCallback`](#asynceffectcallback), [`AsyncSubscription`](#asyncsubscription)

---

### `watch`

```ts
function watch<T>(
  source: ReadonlySignal<T> | (() => T),
  cb: (value: T, prev: T | undefined) => CleanupFn | void,
  options?: WatchOptions<T>,
): Subscription;
```

Subscribes to value changes on `source`. Does **not** fire immediately by default (unlike `effect`). For derived slices, pass a getter function or use the `.map()` combinator. The callback may return a cleanup function called before the next invocation or on dispose; returning any other non-`undefined` value throws `StateError` with code `INVALID_CLEANUP`.

```ts
// Plain watch
const sub = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // fires
sub.dispose();

// Slice watch — getter source
watch(
  () => userStore.value.name,
  (name) => console.log('name:', name),
);

// Slice watch — lens
const nameLens = userStore.lens('name');
watch(nameLens, (name) => console.log('name:', name));
```

**Parameters**

| Parameter           | Type                                                    | Description                                               |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| `source`            | `ReadonlySignal<T>` or `() => T`                        | The signal, store, or getter to watch                     |
| `cb`                | `(value: T, prev: T \| undefined) => CleanupFn \| void` | Called on each change; may return a cleanup function      |
| `options.immediate` | `boolean`                                               | Fire once immediately on subscription. Default `false`    |
| `options.equals`    | `EqualityFn<T>`                                         | Custom equality for change detection. Default `Object.is` |

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

| Parameter               | Type      | Default | Description                                      |
| ----------------------- | --------- | ------- | ------------------------------------------------ |
| `fn`                    | `() => T` |         | Mutations to coalesce                            |
| `options.maxIterations` | `number`  | `100`   | Loop guard for the flush that follows this batch |

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
isSignal(signal(42)); // true
isSignal(computed(() => 1)); // true
isSignal(store({ n: 0 })); // true
isSignal({ value: 42 }); // false — not a real signal
```

---

### `isComputed`

```ts
function isComputed<T = unknown>(value: unknown): value is ComputedSignal<T>;
```

Type guard returning `true` only for values created by `computed()` or `readonly()`. Returns `false` for plain `signal()` and `store()` instances.

```ts
isComputed(computed(() => 1)); // true
isComputed(readonly(signal(0))); // true
isComputed(signal(42)); // false
isComputed(store({ n: 0 })); // false
```

---

### `isStore`

```ts
function isStore<T extends object = Record<string, unknown>>(value: unknown): value is Store<T>;
```

Type guard returning `true` only for values created by `store()`. Returns `false` for plain signals and computed signals.

```ts
isStore(store({ n: 0 })); // true
isStore(signal(42)); // false
isStore(computed(() => 1)); // false
```

---

### `scope`

```ts
function scope(setup?: () => void): Scope;
```

Creates an isolated cleanup context not tied to any reactive source. Use it to collect teardown callbacks and release them all at once.

If `setup` is provided, it runs immediately inside the scope so `onCleanup()` calls in setup are captured without a separate `scope.run(setup)` call. Otherwise, call `scope.run(fn)` to activate the scope manually. `dispose()` runs all cleanups in **LIFO order** and is idempotent.

```ts
// With optional setup (shorthand):
const s = scope(() => {
  const id = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(id));
});

// Without setup (explicit run):
const s2 = scope();
s2.run(() => {
  onCleanup(() => cleanup());
});

// later:
s.dispose(); // or: using s = scope(...)
```

**Parameters**

| Parameter | Type         | Description                                              |
| --------- | ------------ | -------------------------------------------------------- |
| `setup`   | `() => void` | Optional. Runs immediately inside the scope on creation. |

**Returns** — `Scope`

See also: [`Scope`](#scope-1), [`asyncScope`](#asyncscope)

---

### `asyncComputed`

```ts
function asyncComputed<T>(
  factory: (abortSignal: AbortSignal) => Promise<T>,
  options?: AsyncComputedOptions<T>,
): AsyncComputedSignal<T>;
```

Creates a reactive signal that runs an async factory whenever its tracked dependencies change. Dependencies are tracked synchronously (before the first `await`). The factory receives an `AbortSignal` aborted when the factory is superseded or the signal is disposed.

The returned signal's `.value` is an `AsyncComputedState<T>` discriminated union:

```ts
type AsyncComputedState<T> =
  | { status: 'idle'; error: undefined; value: undefined } // before first run
  | { status: 'pending'; error: undefined; value: T | undefined } // running
  | { status: 'fulfilled'; error: undefined; value: T } // resolved
  | { status: 'error'; error: unknown; value: T | undefined }; // rejected
```

```ts
const userId = signal('u1');

const user = asyncComputed(async (signal) => {
  const id = userId.value; // tracked dep
  return fetch(`/users/${id}`, { signal }).then((r) => r.json());
});

effect(() => {
  const state = user.value;
  if (state.status === 'fulfilled') renderUser(state.value);
  if (state.status === 'error') showError(state.error);
});

userId.value = 'u2'; // aborts in-flight fetch, re-runs
user.dispose();
```

**Parameters**

| Parameter              | Type                                  | Description                                                           |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `factory`              | `(signal: AbortSignal) => Promise<T>` | Async factory; tracked deps must be read synchronously before `await` |
| `options.initialValue` | `T`                                   | Value shown in the `'pending'` state before the first result          |
| `options.equals`       | `EqualityFn<AsyncComputedState<T>>`   | Custom equality for the state object. Rarely needed.                  |

**Returns** — `AsyncComputedSignal<T>` (extends `ComputedSignal<AsyncComputedState<T>>` with `dispose()`)

See also: [`AsyncComputedState<T>`](#asynccomputedstate), [`AsyncComputedOptions<T>`](#asynccomputedoptions)

---

### `debugEffect`

::: info Sub-path import
`debugEffect` is exported from `@vielzeug/ripple/devtools`, not the main entry point. This keeps it tree-shaken from production bundles.
:::

```ts
function debugEffect(fn: EffectCallback, options?: Omit<EffectOptions, 'trace'>): Subscription;
```

Like `effect()`, but logs reactive dependency information on every run using `console.group`: the initial run lists all subscribed deps; subsequent runs list which deps changed and their version delta.

Use instead of `effect()` when debugging unexpected re-renders — the output shows which source triggered the re-run and how its version advanced.

```ts
import { debugEffect } from '@vielzeug/ripple/devtools';

const stop = debugEffect(() => renderUser(userId.value, name.value), { name: 'renderUser' });
// On re-run: console.group '[ripple:debug] "renderUser" re-running — changed sources:'
// → userId (v1 -> v2)
```

**Returns** — `Subscription`

---

### `asyncScope`

```ts
function asyncScope(setup: () => Promise<void>): Promise<Scope>;
```

Like `scope()`, but accepts an async setup function. Captures `onCleanup()` registrations from the synchronous preamble of `setup` (before the first `await`), awaits the rest of setup, then returns the ready scope.

::: warning
`onCleanup()` can only be called synchronously — before the first `await` in `setup`. Calls after an `await` throw `StateError('INVALID_CLEANUP')`.
:::

```ts
const s = await asyncScope(async () => {
  onCleanup(() => resourceA.close()); // <sg-icon name="check" size="16"></sg-icon> captured — before any await
  const db = await openDB(); // reactive tracking ends here
  // onCleanup() here would throw INVALID_CLEANUP
});

// later:
s.dispose();
```

**Returns** — `Promise<Scope>`

## Store Functions

### `store`

```ts
function store<T extends object>(initial: T, options?: ReactiveOptions<T>): Store<T>;
```

Creates a reactive store for the given object state. `Store<T>` is a branded signal, so `effect()`, `computed()`, `watch()`, and all other primitives that accept `ReadonlySignal<T>` work with stores directly. `initial` is deep-cloned; external mutations after construction do not affect the store or its `reset()` baseline.

`store.value` returns a read-only proxy: direct top-level set or delete throws `StateError('INVALID_STORE')`. Use `.patch()`, `.replace()`, or `.lens()` to mutate.

**Parameters**

| Parameter | Type | Description                                                        |
| --------- | ---- | ------------------------------------------------------------------ |
| `initial` | `T`  | Starting state; must be a plain object (not an array or primitive) |

**Returns** — `Store<T>`

---

### `storeWithHistory`

```ts
function storeWithHistory<T extends object>(
  initial: T,
  options?: { maxHistory?: number; name?: string },
): StoreWithHistory<T>;
```

Creates a `Store<T>` augmented with snapshot-based undo/redo history. Every call to `.patch()`, `.replace()`, `.reset()`, or a `lens()` write pushes a new snapshot. `undo()` and `redo()` navigate the snapshot buffer without re-running any logic.

Snapshots are shallow copies (structural sharing). `maxHistory` caps the ring buffer (default: `50`); the oldest entries are evicted when the limit is reached.

```ts
const editor = storeWithHistory({ text: '' }, { maxHistory: 100 });

editor.patch({ text: 'hello' });
editor.patch({ text: 'hello world' });

console.log(editor.historyLength); // 3 (initial + 2 patches)

editor.undo();
console.log(editor.value.text); // 'hello'

editor.redo();
console.log(editor.value.text); // 'hello world'

console.log(editor.historyAt(0)); // { text: '' }
```

**Parameters**

| Parameter            | Type     | Default | Description                                       |
| -------------------- | -------- | ------- | ------------------------------------------------- |
| `initial`            | `T`      |         | Starting state                                    |
| `options.maxHistory` | `number` | `50`    | Maximum number of snapshots in the history buffer |
| `options.name`       | `string` |         | Name passed to the underlying `store()`           |

**Returns** — `StoreWithHistory<T>`

See also: [`StoreWithHistory<T>`](#storewithhistory)

---

### `store.lens`

```ts
store.lens<P extends string>(path: P): Signal<PathValue<T, P>>;
```

Returns a writable `Signal` scoped to a specific property or nested dot-path within the store. The lens is cached — calling `.lens('a.b')` twice on the same store returns the same instance. Writes through the lens produce an immutable structural copy of the store state; intermediary objects must not be `null` or a primitive or a `StateError('INVALID_STORE')` is thrown. Path segments `__proto__`, `constructor`, and `prototype` are forbidden and throw `StateError('INVALID_STORE')` immediately.

The lens `Signal` is disposed and evicted from the cache when `store.lens()` is called with that same path after the lens was disposed.

```ts
const settings = store({
  user: { name: 'Alice', address: { city: 'Berlin' } },
  theme: 'light' as 'light' | 'dark',
});

// Top-level path
const theme = settings.lens('theme'); // Signal<'light' | 'dark'>
theme.value = 'dark';

// Nested dot-path
const city = settings.lens('user.address.city'); // Signal<string>
city.value = 'Hamburg';

console.log(settings.value.user.address.city); // 'Hamburg'
console.log(settings.value.theme); // 'dark'

// Watch a single field
watch(theme, (next, prev) => console.log(prev, '→', next));
```

**Parameters**

| Parameter | Type | Description                                        |
| --------- | ---- | -------------------------------------------------- |
| `path`    | `P`  | Dot-separated key path, e.g. `'user.address.city'` |

**Returns** — `Signal<PathValue<T, P>>`

See also: [`PathValue<T, P>`](#pathvaluet-p)

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

| Parameter        | Type              | Description                                                |
| ---------------- | ----------------- | ---------------------------------------------------------- |
| `fn`             | `(value: T) => U` | Projection function                                        |
| `options.equals` | `EqualityFn<U>`   | Custom equality for change detection. Default: `Object.is` |
| `options.name`   | `string`          | Name shown in error messages                               |

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

| Code              | Thrown when                                                                                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPUTED_CYCLE`  | A computed function reads another computed that depends on it                                                                                                                                                                    |
| `DISPOSED_READ`   | `.value`, `.peek()`, or `.subscribe()` is called on a disposed computed                                                                                                                                                          |
| `DISPOSED_SCOPE`  | `scope.run()` is called after `scope.dispose()`                                                                                                                                                                                  |
| `INFINITE_LOOP`   | Flush or effect loop exceeds `maxIterations` (default 100)                                                                                                                                                                       |
| `INVALID_CLEANUP` | `onCleanup()` is called outside an active effect or scope                                                                                                                                                                        |
| `INVALID_STORE`   | `store()` is called with a non-object; `patch()` receives a non-object; `store.lens()` path traverses a `null` or non-object intermediate; or a lens path contains a forbidden segment (`__proto__`, `constructor`, `prototype`) |

Errors from multiple subscribers or cleanup functions in the same flush are aggregated into a standard `AggregateError` with each original error as an element.

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
interface Store<T extends object> extends ReadonlySignal<Readonly<T>> {
  readonly value: Readonly<T>;
  lens<P extends string>(path: P): Signal<PathValue<T, P>>;
  patch(partial: Partial<T>): void;
  replace(fn: (state: Readonly<T>) => T): void;
  reset(): void;
}
```

| Member            | Description                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `.value` (get)    | Read current state; tracked inside `effect`/`computed`; returns a read-only proxy                                   |
| `.lens(path)`     | Returns a cached, writable `Signal` for a property or dot-path; writes produce an immutable copy                    |
| `.patch(partial)` | Shallow-merge when any provided key changes (`Object.is` comparison)                                                |
| `.replace(fn)`    | Receive a plain shallow copy of current state; return the new state; returning the same reference is a silent no-op |
| `.reset()`        | Restore the original `initial` state (deep-clones the stored baseline)                                              |

Inherits `map()` and `filter()` from `ReadonlySignal<T>` for creating derived computed signals from the store value.

::: tip store.value is a read-only proxy
`store.value` returns a proxy that throws `StateError('INVALID_STORE')` on any direct top-level set or delete. Use `.patch()`, `.replace()`, or `.lens()` to mutate state.
:::

---

### `Scope`

```ts
interface Scope {
  readonly run: <T>(fn: () => T) => T;
  readonly dispose: () => void;
  readonly [Symbol.dispose]: () => void;
}
```

Returned by `scope()` and `asyncScope()`. `run(fn)` activates the scope for `onCleanup()` calls. `dispose()` runs all registered cleanups in **LIFO order** and is idempotent.

---

### `Subscription`

```ts
interface Subscription {
  dispose(): void; // dispose the subscription
  [Symbol.dispose](): void; // TC39 using declarations
}
```

Returned by `effect()` and `watch()`. Use `.dispose()` or `using sub = ...`.

```ts
const sub = effect(() => ...);
sub.dispose(); // dispose
// or: using sub = effect(...) — TC39 using declaration
```

---

### `AsyncSubscription`

```ts
interface AsyncSubscription extends Subscription {
  disposeAsync(): Promise<void>; // awaits the in-flight async run before resolving
}
```

Returned by `effectAsync()`. `disposeAsync()` cancels the current run via `AbortSignal` and awaits the in-flight promise before resolving.

```ts
const stop = effectAsync(async (signal) => { ... });
await stop.disposeAsync(); // waits for the current run to settle
```

---

### `AsyncEffectCallback`

```ts
type AsyncEffectCallback = (signal: AbortSignal) => Promise<CleanupFn | void>;
```

The callback passed to `effectAsync()`. Receives an `AbortSignal` that fires when the effect re-runs or is disposed. May return an async cleanup function.

---

### `SignalOptions`

```ts
type SignalOptions<T> = ReactiveOptions<T> & {
  batched?: boolean; // default: false
};
```

Extends `ReactiveOptions<T>` with `batched`. When `true`, rapid synchronous writes coalesce into a single microtask notification — useful for scroll positions, pointer events, and other high-frequency sources.

---

### `ReactiveOptions`

```ts
type ReactiveOptions<T> = {
  equals?: EqualityFn<T>; // default: Object.is
  name?: string;
  fallback?: (error: unknown, lastValue: T | undefined) => T;
};
```

`fallback` is only relevant for `computed()`. When the compute function throws, `fallback` receives the error and the last successfully computed value. Its return value is used instead of propagating the error.

---

### `EffectOptions`

```ts
type EffectOptions = {
  maxIterations?: number; // default: 100
  name?: string; // appears in error messages
  scheduler?: EffectScheduler | ((run: () => void) => void); // default: 'sync'
};
```

All fields are optional. `name` is used in `StateError` messages. For debugging, use `debugEffect()` instead of `{ trace: true }`. `scheduler` accepts either a built-in string or a custom function.

---

### `EffectScheduler`

```ts
type EffectScheduler = 'sync' | 'microtask' | 'raf';
```

| Value         | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `'sync'`      | (default) Re-run synchronously as part of the signal write propagation       |
| `'microtask'` | Re-run queued via `queueMicrotask()` — deferred but before next paint        |
| `'raf'`       | Re-run queued via `requestAnimationFrame()` — capped at display refresh rate |

For `'microtask'` and `'raf'`, rapid signal writes within the same task coalesce into one re-run.

A **custom scheduler function** can replace any built-in variant:

```ts
effect(fn, { scheduler: (run) => setTimeout(run, 100) }); // debounce 100 ms
effect(fn, { scheduler: (run) => requestIdleCallback(run) }); // idle time
```

The custom function receives a `run` callback and must call it exactly once when it decides to execute the effect.

---

### `BatchOptions`

```ts
type BatchOptions = {
  maxIterations?: number; // default: 100
};
```

Options for `batch()`. Only the outermost batch's options apply when batches are nested.

---

### `EffectAsyncOptions`

```ts
type EffectAsyncOptions = {
  onError?: (error: unknown) => void;
};
```

Options for `effectAsync()`. Provide `onError` to handle unhandled async errors from effect runs; defaults to `console.error` with a `[ripple]` prefix.

---

### `PathValue<T, P>`

```ts
type PathValue<T, P extends string> = ...; // recursive conditional type
```

Extracts the type at a dot-separated property path. Used as the return type of `store.lens<P>(path): Signal<PathValue<T, P>>`.

```ts
type Settings = { user: { name: string; address: { city: string } }; theme: 'light' | 'dark' };

type ThemeType = PathValue<Settings, 'theme'>; // 'light' | 'dark'
type CityType = PathValue<Settings, 'user.address.city'>; // string
```

---

### `AsyncComputedState`

```ts
type AsyncComputedState<T> =
  | { status: 'idle'; error: undefined; value: undefined }
  | { status: 'pending'; error: undefined; value: T | undefined }
  | { status: 'fulfilled'; error: undefined; value: T }
  | { status: 'error'; error: unknown; value: T | undefined };
```

Discriminated union exposed by `asyncComputed().value`. Narrow on `.status` to access `value` or `error` safely.

---

### `AsyncComputedOptions`

```ts
type AsyncComputedOptions<T> = ReactiveOptions<AsyncComputedState<T>> & {
  initialValue?: T;
};
```

---

### `AsyncScopeSetup`

```ts
type AsyncScopeSetup = () => Promise<void>;
```

Describes the setup function accepted by `asyncScope()`. `onCleanup()` calls within this function must occur before the first `await`.

---

### `StoreWithHistory`

```ts
interface StoreWithHistory<T extends object> extends Store<T> {
  historyAt(index: number): Readonly<T> | undefined;
  readonly historyLength: number;
  undo(): void;
  redo(): void;
}
```

Returned by `storeWithHistory()`. Extends `Store<T>` with snapshot navigation.

| Member          | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `historyAt(i)`  | Snapshot at index `i` (0 = oldest); returns `undefined` if out of range |
| `historyLength` | Number of snapshots in the buffer                                       |
| `undo()`        | Move cursor back one step; no-op at the oldest state                    |
| `redo()`        | Move cursor forward one step; no-op at the newest state                 |

---

### `RippleDevToolsHook`

```ts
// Shared by compute() and run() — only carries the node name.
type NamedEvent = { name: string | undefined };

type WriteEvent = { name: string | undefined; newValue: unknown; oldValue: unknown };
type DisposeEvent = { kind: 'signal' | 'computed' | 'effect'; name: string | undefined };
type MutateEvent = {
  kind: 'patch' | 'replace' | 'reset' | 'lens';
  name: string | undefined;
  path?: string; // populated for kind: 'lens'
};

type RippleDevToolsHook = {
  compute?(event: NamedEvent): void;
  dispose?(event: DisposeEvent): void;
  mutate?(event: MutateEvent): void;
  run?(event: NamedEvent): void;
  write?(event: WriteEvent): void;
};
```

All methods are optional. Each receives a single event object — add new fields in the future without breaking existing consumers. Install via `installDevTools(hook)`, uninstall with `installDevTools(null)`. The active hook is stored in a module-level variable; `globalThis.__RIPPLE_DEVTOOLS__` is kept in sync as a mirror for browser-extension DevTools.

```ts
import { installDevTools } from '@vielzeug/ripple/devtools';

installDevTools({
  write({ name, oldValue, newValue }) {
    console.log(`[ripple] ${name ?? '(unnamed)'}: ${String(oldValue)} → ${String(newValue)}`);
  },
  run({ name }) {
    performance.mark(`effect:${name ?? 'anon'}`);
  },
  dispose({ kind, name }) {
    console.log(`[ripple] ${kind} "${name ?? '(unnamed)'}" disposed`);
  },
  mutate({ kind, name, path }) {
    const target = path ? `${name ?? '(unnamed)'}[${path}]` : (name ?? '(unnamed)');
    console.log(`[ripple] store ${target} ${kind}`);
  },
});
```

---

### `CleanupFn` / `EffectCallback` / `EqualityFn<T>` / `WatchOptions<T>`

```ts
type CleanupFn = () => void;
type EffectCallback = () => CleanupFn | void;
type EqualityFn<T> = (a: T, b: T) => boolean;
type WatchOptions<T> = ReactiveOptions<T> & { immediate?: boolean };
```

## DevTools

::: info Sub-path import
`installDevTools` and `debugEffect` are exported from `@vielzeug/ripple/devtools`, not the main entry point. This keeps them tree-shaken from production bundles.
:::

### `installDevTools`

```ts
function installDevTools(hook: RippleDevToolsHook | null): void;
```

Installs a DevTools observation hook. The hook is stored in a module-level variable (O(1) read on every signal write). `globalThis.__RIPPLE_DEVTOOLS__` is kept in sync as a mirror for browser-extension tools. Pass `null` to uninstall.

```ts
import { installDevTools } from '@vielzeug/ripple/devtools';

installDevTools({
  write({ name, oldValue, newValue }) {
    console.log(`${name ?? 'signal'}: ${String(oldValue)} → ${String(newValue)}`);
  },
});

// later:
installDevTools(null);
```

---

### `getDevToolsHook`

```ts
function getDevToolsHook(): RippleDevToolsHook | null;
```

Returns the currently installed hook, or `null` if none is installed.

---

### `getSignalName`

```ts
function getSignalName(signal: object): string | undefined;
```

Looks up the registered name for a signal, computed, or store from the internal `WeakMap` registry. Returns `undefined` for unnamed or unknown objects. Named stores are registered at construction time — `getSignalName(store({ x: 0 }, { name: 'myStore' }))` returns `'myStore'`.

## Notification Timing

All signal and store notifications fire **synchronously** — the subscriber callback runs before the next line after the write.

```ts
const s = store({ count: 0 });
const sub = watch(
  () => s.value.count,
  (count) => console.log('changed:', count),
);
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
