---
title: Stateit — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/stateit.
---

# API Reference

## Signal Primitives

### `signal`

```ts
function signal<T>(initial: T): Signal<T>
```

Creates a reactive signal. Read `.value` to get the current value (tracked inside `effect`/`computed`). Write `.value = next` to update and notify dependents.

```ts
const count = signal(0);
count.value;         // 0
count.value = 1;     // notifies
count.peek();        // 1 (untracked read)
```

**Returns** — `Signal<T>`

---

### `computed`

```ts
function computed<T>(compute: () => T): ComputedSignal<T>
```

Creates a derived read-only signal that recomputes whenever any signal read inside `compute` changes. Call `.dispose()` to detach from dependencies.

```ts
const count = signal(3);
const doubled = computed(() => count.value * 2); // 6
count.value = 5;
doubled.value; // 10
doubled.dispose();
```

**Returns** — `ComputedSignal<T>` (read-only `.value` + `.dispose()`)

---

### `effect`

```ts
function effect(fn: EffectFn): CleanupFn
```

Runs `fn` immediately and re-runs it whenever any signal read inside it changes. If `fn` returns a function, that function is called as cleanup before each re-run and on dispose.

```ts
const stop = effect(() => {
  document.title = count.value.toString();
  return () => { /* cleanup */ };
});
stop(); // dispose
```

**Returns** — `CleanupFn` (disposes the effect)

---

### `watch`

Two overloads — plain signal watch and selector watch:

```ts
// Plain watch
function watch<T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  options?: WatchOptions,
): CleanupFn

// Selector watch
function watch<T, U>(
  source: ReadonlySignal<T>,
  selector: (state: T) => U,
  cb: (value: U, prev: U) => void,
  options?: WatchSelectorOptions<U>,
): CleanupFn
```

Subscribes to value changes. Does **not** fire immediately (unlike `effect`). Returns a `CleanupFn` to unsubscribe.

```ts
const unsub = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // fires
unsub();
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `source` | `ReadonlySignal<T>` | The signal or store to watch |
| `cb` | `(value, prev) => void` | Called on each change |
| `options.immediate` | `boolean` | Fire once immediately on subscription. Default `false` |
| `options.once` | `boolean` | Auto-unsubscribe after the first change. Default `false` |
| `options.equals` | `EqualityFn<U>` | Custom equality for selector watches |

**Returns** — `CleanupFn`

---

### `batch`

```ts
function batch<T>(fn: () => T): T
```

Runs `fn` and defers all signal/store notifications until it returns, then flushes once. Nested `batch()` calls coalesce into the outermost.

```ts
batch(() => {
  a.value = 1;
  b.value = 2;
  // one notification after fn returns
});
```

**Returns** — The return value of `fn`

---

### `effect` + `untrack`

```ts
function untrack<T>(fn: () => T): T
```

Runs `fn` and returns its result without registering any reactive dependencies. Reads inside are still valid but do not subscribe.

```ts
effect(() => {
  const x = a.value;                   // subscribed
  const y = untrack(() => b.value);    // not subscribed
  console.log(x + y);
});
```

---

### `readonly`

```ts
function readonly<T>(s: Signal<T>): ReadonlySignal<T>
```

Wraps a signal in a Proxy that throws `TypeError` on writes. The returned type is `ReadonlySignal<T>` — write access is also removed at the type level.

```ts
const readCount = readonly(count);
readCount.value;        // ok
readCount.value = 1;    // TypeError: Cannot assign to value on a ReadonlySignal
```

---

### `toValue`

```ts
function toValue<T>(v: T | Signal<T>): T
```

Unwraps a value or signal. If `v` is a `Signal`, returns `.value` (tracked if called inside an effect). Otherwise returns `v` as-is.

```ts
toValue(10);          // 10
toValue(signal(10));  // 10
```

---

### `writable`

```ts
function writable<T>(
  get: () => T,
  set: (value: T) => void,
): ComputedSignal<T> & { value: T }
```

Creates a bi-directional computed signal. The getter is tracked reactively; writes are forwarded to `set`. Call `.dispose()` to stop tracking the getter.

```ts
const lower = signal('hello');
const upper = writable(
  () => lower.value.toUpperCase(),
  (v) => { lower.value = v.toLowerCase(); },
);
upper.value; // 'HELLO'
upper.value = 'WORLD';
lower.value; // 'world'
upper.dispose();
```

---

### `isSignal`

```ts
function isSignal<T = unknown>(value: unknown): value is Signal<T>
```

Type guard — returns `true` for any `Signal` instance (including `Store`, `ComputedSignal`, and Proxy-wrapped signals).

---

### `isStore`

```ts
function isStore<T extends object = Record<string, unknown>>(
  value: unknown,
): value is Store<T>
```

Type guard — returns `true` only for values created by `store()`.

---

## Store Functions

### `store`

```ts
function store<T extends object>(
  initialState: T,
  options?: StoreOptions<T>,
): Store<T>
```

Creates a new reactive store with the given initial state.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `initialState` | `T` | The starting value of the store |
| `options.equals` | `EqualityFn<T>` | Custom equality for top-level change detection. Defaults to `shallowEqual` |

**Returns** — `Store<T>`

---

### `shallowEqual`

```ts
function shallowEqual(a: unknown, b: unknown): boolean
```

Performs a shallow equality check. Returns `true` if both values are primitively identical, or if all top-level own-enumerable properties are strictly equal (`===`). This is the default equality function used by `store()` and `watch()`.

---

## Signal Types

### `Signal<T>`

The base reactive primitive. All other signal types extend or compose this.

```ts
interface Signal<T> {
  readonly value: T    // tracked getter
  value: T             // notifying setter
  peek(): T            // untracked read
}
```

| Member | Description |
|---|---|
| `value` (get) | Returns current value; tracked inside `effect`/`computed` |
| `value` (set) | Updates value and notifies dependents |
| `peek()` | Returns current value without registering a dependency |

---

### `ReadonlySignal<T>`

```ts
interface ReadonlySignal<T> {
  readonly value: T
  peek(): T
}
```

A signal with no write access. Returned by `readonly()` and `computed()`. The `value` setter is absent at the type level.

---

### `ComputedSignal<T>`

```ts
type ComputedSignal<T> = ReadonlySignal<T> & { readonly dispose: CleanupFn }
```

Returned by `computed()` and `writable()`. Extends `ReadonlySignal<T>` with a `.dispose()` method that detaches the signal from its dependencies.

---

### `CleanupFn`

```ts
type CleanupFn = () => void
```

A zero-argument function with no return value. Used for teardown: returned by `effect()`, `watch()`, and exposed as `.dispose()` on computed signals.

---

### `EffectFn`

```ts
type EffectFn = () => CleanupFn | void
```

The callback passed to `effect()`. May optionally return a `CleanupFn` that is called before each re-run and on final dispose.

---

### `WatchOptions`

```ts
type WatchOptions = {
  immediate?: boolean
  once?: boolean
}
```

Options accepted by the signal overload of `watch()`.

| Property | Type | Default | Description |
|---|---|---|---|
| `immediate` | `boolean` | `false` | Fire once immediately on subscription; both `value` and `prev` will be the current value |
| `once` | `boolean` | `false` | Auto-unsubscribe after the first change fires |

---

### `WatchSelectorOptions<U>`

```ts
type WatchSelectorOptions<U> = WatchOptions & {
  equals?: EqualityFn<U>
}
```

Options accepted by the store selector overload of `watch()`. Extends `WatchOptions` with an optional equality function.

| Property | Type | Default | Description |
|---|---|---|---|
| `equals` | `EqualityFn<U>` | `Object.is` | Custom equality for deciding whether the selector result changed |
| `immediate` | `boolean` | `false` | See `WatchOptions.immediate` |
| `once` | `boolean` | `false` | See `WatchOptions.once` |

---

### `EqualityFn<T>`

```ts
type EqualityFn<T> = (a: T, b: T) => boolean
```

A comparator that returns `true` when `a` and `b` should be considered equal (no notification sent).

---

## Store Types

### `Store<T>`

The full mutable store interface. A `Store<T>` IS a `Signal<T>` — all signal operations (`peek()`, `readonly()`, `computed()`, etc.) work on stores.

```ts
type Store<T extends object> = Signal<T> & {
  readonly disposed: boolean

  set(patch: Partial<T>): void
  set(updater: (s: T) => T): void

  reset(): void

  watch(cb: (value: T, prev: T) => void, options?: WatchOptions): CleanupFn
  watch<U>(selector: (s: T) => U, cb: (value: U, prev: U) => void, options?: WatchSelectorOptions<U>): CleanupFn

  dispose(): void
}
```

---

### `StoreOptions<T>`

Options accepted by `store()`.

```ts
type StoreOptions<T extends object> = {
  equals?: EqualityFn<T>
}
```

| Property | Type | Default | Description |
|---|---|---|---|
| `equals` | `EqualityFn<T>` | `shallowEqual` | Custom equality for top-level change detection |

---

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
watch(cb: (value: T, prev: T) => void, options?: WatchOptions): CleanupFn
watch<U>(selector: (s: T) => U, cb: (value: U, prev: U) => void, options?: WatchSelectorOptions<U>): CleanupFn
```

Subscribes to state changes.

- **Without selector** — fires whenever the full state changes (as determined by `StoreOptions.equals`)
- **With selector** — fires only when the projected value changes (compared by `WatchSelectorOptions.equals`)

Returns a `CleanupFn`. Calling it multiple times is safe. Returns a no-op immediately if the store is disposed.

When `{ immediate: true }`, the callback is called once synchronously on subscription; both `value` and `prev` will be the current value.
When `{ once: true }`, the subscription auto-removes after the first change fires.

```ts
// Full-state watch
const unsub = s.watch((curr, prev) => console.log(curr));

// Selector watch
const unsub2 = s.watch(
  (state) => state.count,
  (count, prev) => console.log('count:', count),
);

// Fire once immediately, then auto-unsubscribe after first change
s.watch((curr) => setTitle(curr.title), { immediate: true, once: true });
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

---

## Notification Timing

All signal and store notifications fire **synchronously** — the subscriber callback runs before the next line after the write.

```ts
const unsub = s.watch((state) => console.log('changed:', state.count));
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
