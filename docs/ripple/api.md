---
title: Ripple — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/ripple.
---

[[toc]]

## API Overview

| Symbol               | Purpose                                                               | Execution mode | Common gotcha                                                                     |
| -------------------- | --------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| `signal()`           | Create reactive primitive values                                      | Sync           | Write signals inside batch/effect-safe flows                                      |
| `computed()`         | Derive memoized values from dependencies                              | Sync           | Avoid side effects inside computed callbacks                                      |
| `effect()`           | Run and re-run sync side effects                                      | Sync           | Dispose when no longer needed to prevent memory leaks                             |
| `effectAsync()`      | Run async side effects with AbortSignal                               | Async          | Read reactive deps synchronously before the first `await`                         |
| `resource()`         | Preferred alias for `asyncComputed()`                                 | Async          | `status` starts `'loading'`; read `resource.value.status` for the discriminated union |
| `asyncComputed()`    | Async computed with lifecycle state (legacy name)                     | Async          | Use `resource()` instead; kept for compatibility                                  |
| `watch()`            | Subscribe to value changes                                            | Sync           | Does not fire immediately unlike `effect()`                                       |
| `batch()`            | Coalesce multiple writes                                              | Sync           | Nested batches merge into the outermost                                           |
| `untrack()`          | Read without subscribing                                              | Sync           | Only suppresses dependency registration, value is still read                      |
| `readonly()`         | Wrap any signal as a read-only view                                  | Sync           | Returns `Readable<T>` — no `dispose()` method; the caller retains ownership of the source |
| `scope()`            | Isolated cleanup context                                              | Sync           | Must call `scope.run()` to activate; `dispose()` is LIFO                          |
| ~~`asyncScope()`~~   | **Deprecated** — use `const s = scope(); await s.run(...)`            | Async          | `onCleanup()` only works before the first `await`                                 |
| `debugEffect()`      | Effect that logs changed sources before re-run                        | Sync           | Sub-path only: `@vielzeug/ripple/devtools`; tree-shaken from production           |
| `store()`            | Create object-like state container                                    | Sync           | Store is a branded signal; use `.patch()`, `.replace()`, `.reset()`               |
| `storeWithHistory()` | Store with snapshot-based undo/redo history                           | Sync           | Call `.push()` / `.pushNamed()` explicitly to record a checkpoint; `maxHistory` caps the buffer |
| `installDevTools()`  | Install DevTools observation hook                                     | Sync           | Sub-path only: `@vielzeug/ripple/devtools`; pass `null` to uninstall              |
| `getDevToolsHook()`  | Return current DevTools hook                                          | Sync           | Returns `null` if none installed                                                  |
| `isSignal()`         | Type guard for any signal/computed/store                              | Sync           | Uses an internal symbol marker, not duck-typing                                   |
| `isComputed()`       | Type guard for computed signals                                       | Sync           | Returns `false` for plain signals, stores, and `readonly()` wrappers             |
| `isStore()`          | Type guard for stores                                                 | Sync           | Returns `false` for plain signals and computed signals                            |

## Package Entry Point

| Import                      | Purpose                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vielzeug/ripple`          | All core exports and types (including `RippleDevToolsHook` and event types)                                                                                       |
| `@vielzeug/ripple/devtools` | `installDevTools`, `debugEffect` — dev-only, tree-shaken from prod                                                                                                |
| `@vielzeug/ripple/ssr`      | SSR tracking isolation helpers (`setTrackingProvider`, `createAsyncProvider`, `withProvider`, `runWithProvider`). Node.js only — do not import in browser builds. |

## Signal Primitives

### `signal`

```ts
function signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
```

Creates a reactive atom. Read `.value` inside an `effect` or `computed` to subscribe. Write `.value = next` to update and notify dependents.

Signals also expose:

- `peek(): T` — read the current value without registering a dependency
- `subscribe(onStoreChange): Subscription` — subscribe to future changes without an initial callback, suitable for `useSyncExternalStore()`

```ts
const count = signal(0);
count.value; // 0 — tracked read
count.value = 1; // notifies dependents
```

**Parameters**

| Parameter         | Type            | Description                                                                                            |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| `initial`         | `T`             | The starting value                                                                                     |
| `options.equals`  | `EqualityFn<T>` | Custom equality; skip notification when `true`. Default: `Object.is` |
| `options.name`    | `string`        | Name used in DevTools and error messages                              |

**Returns** — `Signal<T>`

See also: [`SignalOptions<T>`](#signaloptions)

---

### `computed`

```ts
function computed<T>(compute: () => T, options?: ComputedOptions<T>): Computed<T>;
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
| `options.name`   | `string`        | Name used in DevTools and cycle error messages                        |

**Returns** — `Computed<T>`

See also: [`ComputedOptions<T>`](#computedoptions)

---

### `effect`

```ts
function effect(fn: EffectCallback, options?: EffectOptions): EffectHandle;
```

Runs `fn` immediately and re-runs it whenever any signal read inside it changes. If `fn` returns a function, that function is called as cleanup before each re-run and on final dispose. Returns an `EffectHandle` — dispose is idempotent.

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
});

// 'sync' (default) or 'microtask'
const stop2 = effect(() => renderFrame(data.value), { scheduler: 'microtask' });
```

**Parameters**

| Parameter               | Type              | Default     | Description                                                                   |
| ----------------------- | ----------------- | ----------- | ----------------------------------------------------------------------------- |
| `fn`                    | `EffectCallback`  |             | Runs immediately and on each dependency change; may return a cleanup function |
| `options.scheduler`     | `EffectScheduler` | `'sync'`    | `'sync'` or `'microtask'`; sync runs immediately, microtask defers and coalesces |
| `options.name`          | `string`          | `undefined` | Name shown in error messages for loop and cycle errors                        |

**Returns** — `EffectHandle`

See also: [`EffectOptions`](#effectoptions), [`EffectHandle`](#effecthandle), [`EffectScheduler`](#effectscheduler)

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
| `options.name`    | `string`              | Name used to identify this async effect in DevTools                 |
| `options.onError` | `(err) => void`       | Handler for non-aborted errors. Default: logs via `console.error`   |

**Returns** — `AsyncSubscription` — extends `Subscription`; also provides `run(): Promise<void>` to await the current in-flight run, and `[Symbol.asyncDispose]()` for full async teardown.

See also: [`EffectAsyncOptions`](#effectasyncoptions), [`AsyncEffectCallback`](#asynceffectcallback), [`AsyncSubscription`](#asyncsubscription)

---

### `watch`

```ts
function watch<T>(
  source: Reactive<T>,
  cb: (value: T, prev: T | undefined) => CleanupFn | void,
  options?: WatchOptions<T>,
): Subscription;
```

Subscribes to value changes on `source`. Does **not** fire immediately by default (unlike `effect`). For derived slices, use `computed()` or `store.lens(path)` and pass the resulting signal. The callback may return a cleanup function called before the next invocation or on dispose; returning any other non-`undefined` value throws `StateError` with code `INVALID_CLEANUP`.

```ts
// Plain watch
const sub = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // fires
sub.dispose();

// Slice watch — lens (preferred)
const userStore = store({ name: 'Alice' });
watch(userStore.lens('name'), (name) => console.log('name:', name));

// Slice watch — computed
const nameSig = computed(() => userStore.value.name);
watch(nameSig, (name) => console.log('name:', name));
```

**Parameters**

| Parameter           | Type                                                    | Description                                               |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| `source`            | `Reactive<T>`                                     | Any signal, computed, store, or lens to watch             |
| `cb`                | `(value: T, prev: T \| undefined) => CleanupFn \| void` | Called on each change; may return a cleanup function      |
| `options.immediate` | `boolean`                                               | Fire once immediately on subscription. Default `false`    |
| `options.equals`    | `EqualityFn<T>`                                         | Custom equality for change detection. Default `Object.is` |
| `options.name`      | `string`                                                | Name passed to the internal effect for DevTools tracing   |
| `options.once`      | `boolean`                                               | Auto-dispose after the first callback invocation. Default `false` |

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

**Parameters**

| Parameter | Type      | Description           |
| --------- | --------- | --------------------- |
| `fn`      | `() => T` | Mutations to coalesce |

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
function readonly<T>(source: Readable<T>): Readable<T>;
```

Wraps `source` in a thin delegation object — the returned `Readable<T>` exposes `value`, `peek()`, and `subscribe()`. Mutator methods are hidden at the type level. The wrapper has **no** `dispose()` method — it carries no ownership over the source.

Always creates a new wrapper object — never returns the source directly. The caller retains full ownership of the source and is responsible for disposing it independently.

```ts
const count = signal(0);
const ro = readonly(count);

console.log(ro.value); // 0
count.value = 1;
console.log(ro.value); // 1

// ro has no dispose() — count remains owned by the caller
count.dispose(); // disposes the source
```

**Parameters**

| Parameter | Type          | Description                         |
| --------- | ------------- | ----------------------------------- |
| `source`  | `Readable<T>` | Any signal/store/computed to expose |

**Returns** — `Readable<T>`

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
function isSignal<T = unknown>(value: unknown): value is Readable<T>;
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
function isComputed<T = unknown>(value: unknown): value is Computed<T>;
```

Type guard returning `true` only for values created by `computed()`. Returns `false` for plain `signal()`, `store()`, and `readonly()` wrappers.

```ts
isComputed(computed(() => 1)); // true
isComputed(signal(42)); // false
isComputed(readonly(signal(0))); // false
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

### `resource`

```ts
function resource<T>(
  factory: (abortSignal: AbortSignal) => Promise<T>,
  options?: ResourceOptions<T>,
): ResourceSignal<T>;
```

Preferred alias for `asyncComputed()`. Creates a reactive async resource. The factory re-runs whenever its tracked dependencies change. Dependencies are tracked synchronously (before the first `await`). The factory receives an `AbortSignal` that is aborted when superseded or disposed.

The returned `ResourceSignal<T>` is a `Reactive<ResourceState<T>>` — a single discriminated union signal:

```ts
type ResourceState<T> =
  | { status: 'loading'; data: T | undefined }
  | { status: 'ready';   data: T }
  | { status: 'error';   data: T | undefined; error: unknown };
```

```ts
const userId = signal('u1');

const user = resource(async (abortSignal) => {
  const id = userId.value; // tracked dep — re-runs when userId changes
  return fetch(`/users/${id}`, { signal: abortSignal }).then((r) => r.json());
});

effect(() => {
  const s = user.value; // ResourceState<User>
  if (s.status === 'loading') return showSpinner();
  if (s.status === 'error')   return showError(s.error);
  renderUser(s.data); // s.data is User here
});

userId.value = 'u2'; // aborts in-flight fetch, re-runs factory
user.dispose();
console.log(user.disposed); // true
```

**Parameters**

| Parameter              | Type                                       | Description                                                          |
| ---------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `factory`              | `(abortSignal: AbortSignal) => Promise<T>` | Async factory; tracked deps must be read synchronously before `await` |
| `options.initialValue` | `T`                                        | Populates `data` in the initial `loading` state before the first result |
| `options.name`         | `string`                                   | Debug name propagated to the internal signal and effect              |

**Returns** — `ResourceSignal<T>`

See also: [`ResourceSignal<T>`](#resourcesignal), [`ResourceOptions<T>`](#resourceoptions), [`ResourceState<T>`](#resourcestate)

---

### `asyncComputed`

```ts
function asyncComputed<T>(
  factory: (abortSignal: AbortSignal) => Promise<T>,
  options?: ResourceOptions<T>,
): ResourceSignal<T>;
```

Legacy name for `resource()`. The two functions are identical at runtime — `asyncComputed` is exported as `resource` from the main entry point. Prefer `resource()` for new code.

See [`resource`](#resource) for full documentation.

See also: [`ResourceSignal<T>`](#resourcesignal), [`ResourceOptions<T>`](#resourceoptions)

---

### `debugEffect`

::: info Sub-path import
`debugEffect` is exported from `@vielzeug/ripple/devtools`, not the main entry point. This keeps it tree-shaken from production bundles.
:::

```ts
function debugEffect(fn: EffectCallback, options?: Omit<EffectOptions, 'trace'>): EffectHandle;
```

Like `effect()`, but logs reactive dependency information on every run using `console.group`: the initial run lists all subscribed deps; subsequent runs list which deps changed and their version delta.

Use instead of `effect()` when debugging unexpected re-renders — the output shows which source triggered the re-run and how its version advanced.

```ts
import { debugEffect } from '@vielzeug/ripple/devtools';

const stop = debugEffect(() => renderUser(userId.value, name.value), { name: 'renderUser' });
// On re-run: console.group '[ripple:debug] "renderUser" re-running — changed sources:'
// → userId (v1 -> v2)
```

**Returns** — `EffectHandle`

---

### `asyncScope` _(deprecated)_

::: warning Deprecated
`asyncScope()` is deprecated. Use `scope()` with an explicit `run()` call instead:

```ts
// Before
const s = await asyncScope(async () => { ... });

// After
const s = scope();
await s.run(async () => { ... });
```

:::

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
function store<T extends object>(initial: T, options?: { name?: string }): Store<T>;
```

Creates a reactive store for the given object state. Stores accept `effect()`, `computed()`, `watch()`, and other primitives via `.value` and `.subscribe()`. `initial` is deep-cloned; external mutations after construction do not affect the store or its `reset()` baseline.

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
  storeOrInitial: Store<T> | T,
  options?: { maxHistory?: number; name?: string },
): StoreWithHistory<T>;
```

Wraps a store (or creates one from an initial value) with snapshot-based undo/redo history. Mutations through `.store.patch()`, `.store.replace()`, `.store.reset()`, or lens writes do **not** automatically push snapshots. Call `.push()` (or `.pushNamed(label)`) explicitly to record a checkpoint. `undo()` and `redo()` navigate the snapshot buffer without re-running any logic.

The initial state is saved as the first snapshot automatically. Snapshots are deep-frozen clones (`structuredClone`). `maxHistory` caps the ring buffer (default: `50`); the oldest entries are evicted when the limit is reached.

**Ownership:** when called with an initial value (`T`), the adapter creates and owns the underlying store — `dispose()` also disposes it. When called with an existing `Store<T>`, the adapter does **not** own it — `dispose()` leaves the store alive.

```ts
const editor = storeWithHistory({ text: '' }, { maxHistory: 100 });

editor.store.patch({ text: 'hello' });
editor.push(); // checkpoint 1

editor.store.patch({ text: 'hello world' });
editor.push(); // checkpoint 2

console.log(editor.historyLength); // 3 (initial + 2 explicit pushes)

editor.undo();
console.log(editor.store.peek().text); // 'hello'

editor.redo();
console.log(editor.store.peek().text); // 'hello world'

console.log(editor.historyAt(0).state); // { text: '' }

// Wrap an existing store — adapter does not own it
const s = store({ x: 0 });
const h = storeWithHistory(s);
h.dispose(); // h is gone; s is still alive
```

**Parameters**

| Parameter            | Type            | Default | Description                                                              |
| -------------------- | --------------- | ------- | ------------------------------------------------------------------------ |
| `storeOrInitial`     | `Store<T> \| T` |         | Existing `Store<T>` (not owned) or a plain object to create a store from |
| `options.maxHistory` | `number`        | `50`    | Maximum number of snapshots in the history buffer                        |
| `options.name`       | `string`        |         | Name passed to the underlying `store()` when creating a new one          |

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

Use `computed()` to project a reactive source into a derived value:

```ts
const count = signal(5);
const doubled = computed(() => count.value * 2);
doubled.value; // 10
```

All projection options (`equals`, `name`, `fallback`) are available on `computed()` directly via [`ComputedOptions`](#computedoptions).

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

| Code              | Thrown when                                                                                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `COMPUTED_CYCLE`  | A computed function reads another computed that depends on it                                                                                                                                                                                                                                                            |
| `DISPOSED_READ`   | `.subscribe()` is called on a disposed computed. Note: `.value` and `.peek()` on a disposed computed return the last known value silently (inert node behaviour, consistent with `signal`)                                                                                                                               |
| `DISPOSED_SCOPE`  | `scope.run()` is called after `scope.dispose()`                                                                                                                                                                                                                                                                          |
| `INFINITE_LOOP`   | Flush or effect loop exceeds `maxIterations` (default 100)                                                                                                                                                                                                                                                               |
| `INVALID_CLEANUP` | `onCleanup()` is called outside an active effect or scope                                                                                                                                                                                                                                                                |
| `INVALID_STORE`   | `store()` is called with a non-object; `patch()` receives a non-object; `store.lens()` path traverses a `null` or non-object intermediate; a lens path has an empty segment (e.g. `'a..b'`), a forbidden segment (`__proto__`, `constructor`, `prototype`), or exceeds 32 segments; or `store.value` is mutated directly |

Errors from multiple subscribers or cleanup functions in the same flush are aggregated into a standard `AggregateError` with each original error as an element.

## Types

### `Signal<T>`

```ts
interface Signal<T> extends Readable<T> {
  dispose(): void;
  readonly disposed: boolean;
  value: T; // notifying setter — write triggers downstream notifications
  [Symbol.dispose](): void;
}
```

---

### `Readable<T>`

```ts
interface Readable<T> {
  readonly name?: string; // debug name assigned at creation, or undefined
  peek(): T;
  subscribe(onStoreChange: () => void): Subscription;
  readonly value: T;
}
```

| Member        | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| `name`        | Debug name set at creation (`options.name`); `undefined` if unnamed |
| `value` (get) | Returns current value; tracked inside `effect`/`computed`           |
| `peek()`      | Returns current value without tracking                              |
| `subscribe()` | Registers a change listener without an initial callback             |

---

### `Computed<T>`

```ts
interface Computed<T> extends Readable<T> {
  dispose(): void;
  readonly disposed: boolean;
  [Symbol.dispose](): void;
}
```

Returned by `computed()`. A read-only derived signal with an explicit dispose method. `disposed` is `true` after `dispose()` is called. `readonly()` returns `Readable<T>` (no dispose) — use `computed()` when ownership and explicit disposal are needed.

---

### `Store<T>`

```ts
interface Store<T extends object> {
  readonly disposed: boolean;
  readonly name?: string;
  dispose(): void;
  [Symbol.dispose](): void;
  lens<P extends string>(path: P): Signal<PathValue<T, P>>;
  patch(partial: Partial<T>): void;
  peek(): Readonly<T>;
  replace(fn: (state: Readonly<T>) => T): void;
  reset(): void;
  subscribe(onStoreChange: () => void): Subscription;
  readonly value: Readonly<T>;
}
```

| Member            | Description                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `.value` (get)    | Read current state; tracked inside `effect`/`computed`; returns a read-only proxy                                                     |
| `.peek()`         | Read current state without tracking                                                                                                   |
| `.dispose()`      | Permanently disposes the store — releases all internal prop signals and cached lenses. Idempotent.                                    |
| `.lens(path)`     | Returns a cached, writable `Signal` for a property or dot-path; writes produce an immutable copy                                      |
| `.patch(partial)` | Shallow-merge when any provided key changes (`Object.is` comparison)                                                                  |
| `.replace(fn)`    | Receive a deep clone (`structuredClone`) of current state; return the new state; returning the same clone reference is a silent no-op |
| `.reset()`        | Restore the original `initial` state (deep-clones the stored baseline)                                                                |

::: tip store.value is a read-only proxy
`store.value` returns a proxy that throws `StateError('INVALID_STORE')` on any direct top-level set or delete. Use `.patch()`, `.replace()`, or `.lens()` to mutate state.
:::

---

### `Scope`

```ts
interface Scope {
  readonly add: (fn: CleanupFn) => void;
  readonly run: <T>(fn: () => T) => T;
  readonly dispose: () => void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  readonly [Symbol.dispose]: () => void;
}
```

Returned by `scope()` and `asyncScope()`. `run(fn)` activates the scope for `onCleanup()` calls. `add(fn)` explicitly registers a cleanup into the scope regardless of the current tracking context — use it to direct cleanups from inside an effect body into the scope rather than the effect. `dispose()` runs all registered cleanups in **LIFO order** and is idempotent. `disposed` is `true` after `dispose()` is called.

---

### `Subscription`

```ts
interface Subscription {
  dispose(): void; // dispose the subscription
  readonly disposed: boolean; // true after dispose() is called
  [Symbol.dispose](): void; // TC39 using declarations
}
```

Returned by `effect()` and `watch()`. Use `.dispose()` or `using sub = ...`. `disposed` is `true` after the first `dispose()` call — idempotent.

```ts
const sub = effect(() => ...);
sub.dispose(); // dispose
// or: using sub = effect(...) — TC39 using declaration
```

---

### `AsyncSubscription`

```ts
interface AsyncSubscription extends Subscription {
  /** @deprecated Use [Symbol.asyncDispose] with `await using` instead. */
  disposeAsync(): Promise<void>; // awaits the in-flight async run before resolving
  [Symbol.asyncDispose](): Promise<void>; // ES2024 await using compatible
}
```

Returned by `effectAsync()`. Supports both `disposeAsync()` (legacy) and `[Symbol.asyncDispose]` (ES2024 `await using` declarations).

```ts
const stop = effectAsync(async (signal) => { ... });
await stop.disposeAsync(); // legacy — works

// ES2024: await using declaration
await using stop2 = effectAsync(async (signal) => { ... });
// stop2 is automatically disposed with [Symbol.asyncDispose] when the block exits
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
type SignalOptions<T> = {
  batched?: boolean; // default: false
  equals?: EqualityFn<T>;
  name?: string;
};
```

Extends the base signal options with `batched`. When `true`, rapid synchronous writes coalesce into a single microtask notification — useful for scroll positions, pointer events, and other high-frequency sources.

---

### `ComputedOptions`

```ts
type ComputedOptions<T> = {
  equals?: EqualityFn<T>; // default: Object.is
  fallback?: (error: unknown, lastValue: T | undefined) => T;
  name?: string;
};
```

`fallback` is only relevant for `computed()`. When the compute function throws, `fallback` receives the error and the last successfully computed value. Its return value is used instead of propagating the error.

---

### `EffectOptions`

```ts
type EffectOptions = {
  name?: string; // appears in error messages
  scheduler?: EffectScheduler; // default: 'sync'
};
```

All fields are optional. `name` is used in `StateError` messages and in the `INFINITE_LOOP` error when the built-in loop guard fires. For debugging, use `debugEffect()` instead. `scheduler` accepts either a built-in string or a custom function.

---

### `EffectScheduler`

```ts
type EffectScheduler = ((run: () => void) => void) | 'microtask' | 'sync';
```

| Value         | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| `'sync'`      | (default) Re-run synchronously as part of the signal write propagation |
| `'microtask'` | Re-run queued via `queueMicrotask()` — deferred but before next paint  |
| `function`    | Custom scheduler — receives `run` callback and calls it when ready     |

For `'microtask'`, rapid signal writes within the same task coalesce into one re-run.

A **custom scheduler function** replaces any built-in variant:

```ts
effect(fn, { scheduler: (run) => setTimeout(run, 100) }); // debounce 100 ms
effect(fn, { scheduler: (run) => requestIdleCallback(run) }); // idle time
```

The custom function receives a `run` callback and must call it exactly once when it decides to execute the effect.

---

### `EffectAsyncOptions`

```ts
type EffectAsyncOptions = {
  name?: string; // identifies the async effect in DevTools
  onError?: (error: unknown) => void;
};
```

Options for `effectAsync()`. `name` is passed to the internal `effect()` and appears in DevTools events. Provide `onError` to handle unhandled async errors from effect runs; defaults to `console.error` with a `[ripple]` prefix.

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

### `AsyncOwnedReactive`

```ts
interface AsyncOwnedReactive<T> {
  readonly data: Reactive<T | undefined>;
  readonly disposed: boolean;
  readonly error: Reactive<unknown | undefined>;
  readonly isLoading: Reactive<boolean>;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

Returned by `asyncComputed()`. Exposes three flat reactive projections instead of a single discriminated-union signal.

---

### `AsyncComputedOptions`

```ts
type AsyncComputedOptions<T> = {
  initialValue?: T;
  name?: string;
};
```

---

### `Accessor<T>`

```ts
type Accessor<T> = Reactive<T>;
```

Alias for `Reactive<T>`. Prefer `Accessor<T>` in new code — the name communicates "you can read this" rather than implying the underlying value never changes.

---

### `ResourceSignal<T>`

```ts
type ResourceSignal<T> = AsyncOwnedReactive<T>;
```

Alias for `AsyncOwnedReactive<T>`. Returned by `resource()`.

---

### `ResourceOptions<T>`

```ts
type ResourceOptions<T> = AsyncComputedOptions<T>;
```

Alias for `AsyncComputedOptions<T>`. Use with `resource()`.

---

### `AsyncScopeSetup`

```ts
type AsyncScopeSetup = () => Promise<void>;
```

Describes the setup function accepted by `asyncScope()`. `onCleanup()` calls within this function must occur before the first `await`.

---

### `StoreWithHistory`

```ts
interface StoreWithHistory<T extends object> {
  readonly store: Store<T>;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  historyAt(index: number): Readonly<T> | undefined;
  readonly historyLength: number;
  undo(): void;
  redo(): void;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

Returned by `storeWithHistory()`. Wraps a `Store<T>` with snapshot navigation. Access the underlying store via `.store` for reads and mutations.

| Member               | Description                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `store`              | The underlying `Store<T>` — use for `.patch()`, `.lens()`, `.replace()`, `.reset()`                                                          |
| `canUndo`            | `true` when there is at least one snapshot to undo to. **Reactive** — participates in the reactive graph                                     |
| `canRedo`            | `true` when there is at least one snapshot ahead to redo. **Reactive** — participates in the reactive graph                                  |
| `historyAt(i)`       | Snapshot at index `i` (0 = oldest); returns `undefined` if out of range. After `maxHistory` eviction, index 0 is the oldest remaining entry  |
| `historyLength`      | Number of snapshots currently in the buffer (≤ `maxHistory`)                                                                                 |
| `undo()`             | Move cursor back one step; no-op at the oldest state                                                                                         |
| `redo()`             | Move cursor forward one step; no-op at the newest state                                                                                      |
| `dispose()`          | Disposes the history adapter and cursor signal. Also disposes the underlying store only when the adapter created it (ownership). Idempotent. |
| `[Symbol.dispose]()` | Same as `dispose()` — enables `using h = storeWithHistory(...)` declarations                                                                 |

---

### `RippleDevToolsHook`

```ts
// Shared by compute() and run() — only carries the node name.
type NamedEvent = { name: string | undefined };

type WriteEvent = { name: string | undefined; newValue: unknown; oldValue: unknown };
type DisposeEvent = { kind: 'signal' | 'computed' | 'effect' | 'store'; name: string | undefined };
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
type WatchOptions<T> = {
  equals?: EqualityFn<T>;
  immediate?: boolean;
  name?: string;
  once?: boolean; // auto-dispose after first invocation
};
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
