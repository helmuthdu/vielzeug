---
title: Ripple — API Reference
description: Complete reference for reactive graphs, signals, effects, scopes, watchers, and observability.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createRipple()` | Create isolated graph | Sync | Disposal is terminal; create a new graph instead of reusing it |
| `signal()` | Create writable value | Sync | Default graph is process-wide |
| `computed()` | Create lazy derived value | Sync | Keep derivation pure |
| `effect()` | React to dependency reads | Sync | Dispose handle or return cleanup |
| `batch()` | Coalesce synchronous writes | Sync | Does not roll back writes |
| `createScope()` | Group owned reactive work | Sync | Call `run()` to activate it |
| `untrack()` | Read without tracking | Sync | Read still happens immediately |
| `watch()` | Observe selected output | Sync | Use `effect()` for broad reads |
| `tap()` | Observe runtime events | Sync | Handler errors are swallowed |
| `fromSubscribable()` | Bridge external source | Sync | Returned bridge must be disposed |
| `isReactive()` | Test Ripple's marked readable contract | Sync | Not a security or provenance check |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/ripple` | All primitives, types, and errors — signals, computed, effects, scopes, watch, tap, and the isolated graph factory |

## Graph Creation

### `createRipple(options?)`

```ts
function createRipple(options?: RippleOptions): Ripple;
```

Creates one isolated reactive graph. Factories on the returned object share scheduling, ownership, and error boundaries. `dispose()` is terminal: `ripple.disposed` becomes `true`, existing owned work is disposed, and creating more graph work throws `RippleDisposedRuntimeError`. Create a new graph for a new lifetime.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.errorPolicy` | `'throw' \| 'swallow'` | Controls whether computed refresh, effect, cleanup, and listener failures rethrow. Default `'throw'`. Error events are always emitted through `tap()`. |

**Returns:** `Ripple`.

**Example:**

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const count = ripple.signal(0);
const stop = ripple.effect(() => console.log(count.value));

stop.dispose();
ripple.dispose();
```

---

### `isReactive(value)`

```ts
function isReactive<T>(value: T | Readable<T>): value is Readable<T>;
```

Tests Ripple's shared-symbol marker and complete readable surface (`value`, `peek()`, and `subscribe()`). Recognition works across duplicated Ripple module graphs. The marker is intentionally structural and forgeable; do not use this guard for trust or provenance decisions.

**Returns:** `true` for marked signals, computeds, resources, and external-source bridges with the complete readable contract.

**Example:**

```ts
import { isReactive, signal } from '@vielzeug/ripple';

console.log(isReactive(signal(0)));
```

## Default Graph Functions

Root helpers (`signal`, `computed`, `effect`, `batch`, `createScope`, `untrack`, `watch`, `resource`, `fromSubscribable`) operate on a process-lifetime default graph. Use them only when the application has one graph for its entire lifetime — they are never disposed. For isolated, disposable graphs (tests, SSR, embedded features) use `createRipple()`.

### `signal(initial, options?)`

```ts
function signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
```

Creates writable state on the default graph. Use `update()` for immutable replacement patterns.

**Returns:** `Signal<T>`.

**Example:**

```ts
import { signal } from '@vielzeug/ripple';

const count = signal(0);
count.value += 1;

const cart = signal({ items: 0 });
cart.update((state) => ({ ...state, items: state.items + 1 }));
```

---

### `computed(derive, options?)`

```ts
function computed<T>(derive: () => T, options?: ComputedOptions<T>): Readable<T>;
```

Creates a lazy read-only value from reactive reads in `derive`. `peek()` may trigger derivation and throw directly. During dependency propagation, a computed refresh failure is reported through `tap()` with context kind `computed` and does not prevent sibling dependents from updating. A disposed computed returns its last cached value from `peek()` without recomputing.

**Returns:** `Readable<T>`.

**Example:**

```ts
import { computed, signal } from '@vielzeug/ripple';

const count = signal(2);
const doubled = computed(() => count.value * 2);
console.log(doubled.value);
```

---

### `effect(callback, options?)`

```ts
function effect(callback: () => Cleanup | undefined, options?: EffectOptions): EffectHandle;
```

Runs immediately and reruns when its tracked reads change. A returned cleanup runs before the next callback or disposal.

**Returns:** `EffectHandle`.

**Example:**

```ts
import { effect, signal } from '@vielzeug/ripple';

const connected = signal(false);
const stop = effect(() => {
  if (!connected.value) return;

  return () => console.log('disconnect');
});

stop.dispose();
```

---

### `batch(fn)` and `untrack(fn)`

```ts
function batch<T>(fn: () => T): T;
function untrack<T>(fn: () => T): T;
```

`batch()` defers effects and listeners until its callback returns. `untrack()` reads current state without adding dependencies to an enclosing effect.

**Returns:** the callback result.

**Example:**

```ts
import { batch, signal, untrack } from '@vielzeug/ripple';

const first = signal('Ada');
const last = signal('Lovelace');
const locale = signal('en-US');

batch(() => {
  first.value = 'Grace';
  last.value = 'Hopper';
});

console.log(untrack(() => locale.value));
```

---

### `createScope(name?)`

```ts
function createScope(name?: string): Scope;
```

Creates a disposable ownership boundary. Work created inside `scope.run()` belongs to that scope. Explicit scopes created during an effect run attach to the enclosing scope—not the transient effect-run owner—and therefore survive reruns until explicitly or parent-disposed. Disposed children detach from parent ownership immediately.

**Returns:** `Scope`.

**Example:**

```ts
import { createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope('panel');
const count = signal(0);

scope.run(() => effect(() => console.log(count.value)));
scope.dispose();
```

### `resource(source, loader, options?)`

```ts
function resource<Source, Value>(
  source: () => Source,
  loader: (source: Source, context: { readonly signal: AbortSignal }) => Promise<Value>,
  options?: ResourceOptions,
): Resource<Value>;
```

Creates a disposable readable async state and starts loading immediately. Source changes and `reload()` abort stale work before starting the next loader. The last successful value is preserved as `previous`, including when that value is `undefined`.

```ts
const user = resource(
  () => userId.value,
  (id, { signal }) => fetch(`/users/${id}`, { signal }).then((response) => response.json()),
);
```

The state is `{ status: 'pending', previous? }`, `{ status: 'success', value }`, or `{ status: 'error', error, previous? }`. Reads remain available after disposal; `reload()` and new subscriptions throw `RippleDisposedResourceError`.

## Watch and Observability

### `watch(source, callback, options?)`

```ts
function watch<T>(
  source: Readable<T> | (() => T),
  callback: (value: T, previous: T | undefined) => void,
  options?: WatchOptions<T>,
): EffectHandle;
```

Observes selected output changes using the default graph or a `Ripple.watch()` method. Callback-only reactive reads are untracked. `once` disposes after the first callback invocation even when it throws; without `immediate`, initial evaluation does not count as an invocation.

**Returns:** `EffectHandle`.

**Example:**

```ts
import { signal, watch } from '@vielzeug/ripple';

const count = signal(0);
const stop = watch(count, (value, previous) => console.log(previous, value), { immediate: true });
stop.dispose();
```

---

### `ripple.tap(handler, options?)`

```ts
function tap(
  handler: (event: RippleEvent) => void,
  options?: { signal?: AbortSignal },
): Unsubscribe;
```

Runtime observability for writes, computes, effects, disposals, and reported errors. Computed refresh errors are reported with context kind `computed` without interrupting sibling propagation. During graph disposal, taps remain active for owned cleanup errors and node disposal events; `dispose:graph` is emitted last. Handler errors are swallowed. The returned function unsubscribes, and an optional signal auto-detaches it.

The `Ripple.tap()` method is available on instances created with `createRipple()`. After runtime disposal it returns a no-op unsubscribe.

**Returns:** `Unsubscribe`.

**Example:**

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple({ errorPolicy: 'swallow' });
const stop = ripple.tap((event) => {
  if (event.type === 'error') console.error(event.context.kind, event.error);
  if (event.type === 'write') console.log(`${event.name}: ${event.previous} → ${event.next}`);
});

const count = ripple.signal(0);
count.value = 1;

stop();
ripple.dispose();
```

---

### `fromSubscribable(source, options?)`

```ts
function fromSubscribable<T>(source: Subscribable<T>, options?: FromSubscribableOptions): BridgedReadable<T>;
```

Bridges an external `{ getSnapshot, subscribe }` source into a disposable reactive readable. The bridge subscribes and then rereads the snapshot to avoid missing a change during registration. The root helper uses the default graph; `ripple.fromSubscribable()` binds ownership to an isolated graph. An optional signal disposes the bridge.

**Returns:** `BridgedReadable<T>`. Disposal invokes the source unsubscribe function. Reads remain available afterward, while new subscriptions throw.

**Example:**

```ts
import { fromSubscribable } from '@vielzeug/ripple';

const routerState = fromSubscribable({
  getSnapshot: () => router.getSnapshot(),
  subscribe: (cb) => router.subscribe(cb),
});

routerState.dispose();
```

## Types

```ts
type Cleanup = () => void;
type Equality<T> = (previous: T, next: T) => boolean;
type Unsubscribe = () => void;

type SignalOptions<T> = { equals?: Equality<T>; name?: string };
type ComputedOptions<T> = { equals?: Equality<T>; name?: string };
type EffectOptions = { name?: string; scheduler?: 'microtask' | 'sync' };
type WatchOptions<T> = { equals?: Equality<T>; immediate?: boolean; name?: string; once?: boolean };

type RippleErrorContext = { readonly kind: 'cleanup' | 'computed' | 'effect' | 'listener'; readonly name?: string };
type RippleErrorPolicy = 'throw' | 'swallow';
type RippleOptions = { errorPolicy?: RippleErrorPolicy };

type RippleEvent =
  | { readonly type: 'compute'; readonly name?: string }
  | { readonly type: 'effect'; readonly name?: string }
  | { readonly type: 'write'; readonly name?: string; readonly next: unknown; readonly previous: unknown }
  | { readonly type: 'dispose'; readonly name?: string; readonly node: 'effect' | 'graph' | 'scope' }
  | { readonly type: 'error'; readonly error: unknown; readonly context: RippleErrorContext };

interface Readable<T> {
  readonly name?: string;
  peek(): T;
  subscribe(listener: () => void): Unsubscribe;
  readonly value: T;
}

interface Signal<T> extends Readable<T> { update(updater: (prev: T) => T): void; value: T }
interface Disposable { dispose(): void; readonly disposed: boolean; readonly disposalSignal: AbortSignal; [Symbol.dispose](): void }
type EffectHandle = Disposable;
interface Scope extends Disposable { run<T>(fn: () => T): T }

interface Subscribable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): Unsubscribe;
}

type FromSubscribableOptions = { name?: string; signal?: AbortSignal };
type BridgedReadable<T> = Readable<T> & Disposable;

type AsyncState<T> =
  | { readonly previous?: T; readonly status: 'pending' }
  | { readonly status: 'success'; readonly value: T }
  | { readonly error: unknown; readonly previous?: T; readonly status: 'error' };

interface Resource<T> extends Readable<AsyncState<T>>, Disposable {
  reload(): void;
}

type ResourceOptions = { name?: string };

interface Ripple extends Disposable {
  batch<T>(fn: () => T): T;
  computed<T>(derive: () => T, options?: ComputedOptions<T>): Readable<T>;
  createScope(name?: string): Scope;
  effect(callback: () => Cleanup | undefined, options?: EffectOptions): EffectHandle;
  fromSubscribable<T>(source: Subscribable<T>, options?: FromSubscribableOptions): BridgedReadable<T>;
  resource<Source, Value>(
    source: () => Source,
    loader: (source: Source, context: { readonly signal: AbortSignal }) => Promise<Value>,
    options?: ResourceOptions,
  ): Resource<Value>;
  signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
  tap(handler: (event: RippleEvent) => void, options?: { signal?: AbortSignal }): Unsubscribe;
  untrack<T>(fn: () => T): T;
  watch<T>(source: Readable<T> | (() => T), callback: (value: T, previous: T | undefined) => void, options?: WatchOptions<T>): EffectHandle;
}
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `RippleError` | Base Ripple error | Use `instanceof RippleError` to narrow unknown values. |
| `RippleComputedCycleError` | Computed dependency reads itself through a cycle | Extends `RippleError`. |
| `RippleDisposedResourceError` | `reload()` or `subscribe()` used after resource disposal | Extends `RippleError`. |
| `RippleDisposedRuntimeError` | Factory or execution API used after `ripple.dispose()` | Extends `RippleError`. |
| `RippleDisposedScopeError` | `scope.run()` after scope disposal | Extends `RippleError`. |
| `RippleInfiniteLoopError` | Effect flush exceeds graph iteration limit | Extends `RippleError`. |
