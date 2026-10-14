---
title: 'Ripple: API Reference'
description: Complete reference for reactive graphs, signals, effects, scopes, and watchers.
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
| `resource()` | Load from tracked reactive input | Sync factory / Async loader | `reload()` returns `void`; completion is observable state |
| `fromSubscribable()` | Bridge external source | Sync | Returned bridge must be disposed |
| `isReactive()` | Test Ripple's marked readable contract | Sync | Not a security or provenance check |
| `RippleError` | Base package error | Sync | Runtime callback failures retain their original value |
| `RippleCycleError` | Computed cycle or runaway flush | Sync | Flush failures reach `onError`, not the write site |
| `RippleDisposedError` | Work after disposal | Sync | Cached reads remain available |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/ripple` | All primitives, types, and errors: signals, computed, effects, scopes, watch, and the isolated graph factory |

## Graph Creation

### `createRipple(options?)`

```ts
function createRipple(options?: RippleOptions): Ripple;
```

Creates one isolated reactive graph. Factories on the returned object share scheduling, ownership, and error boundaries. `dispose()` is terminal: `ripple.disposed` becomes `true`, existing owned work is disposed, and creating more graph work throws `RippleDisposedError`. Create a new graph for a new lifetime.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.onError` | `(error, context) => void` | Handles computed refresh, effect, cleanup, listener, and flush-loop failures. Default rethrows asynchronously via `queueMicrotask`; pass a no-op to silence. A failure in one node never interrupts sibling propagation. |

`onError` is the only runtime option. `RippleErrorContext.kind` is `cleanup`, `computed`,
`effect`, `flush`, or `listener`; `name` is optional. There is no event stream or error-policy option.

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

Root helpers (`signal`, `computed`, `effect`, `batch`, `createScope`, `untrack`, `watch`, `resource`, `fromSubscribable`) operate on a process-lifetime default graph. The graph itself has no public disposal handle; effects, scopes, resources, and bridges still require owner-managed disposal. For isolated, disposable graphs (tests, SSR, embedded features) use `createRipple()`.

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

Creates a lazy read-only value from reactive reads in `derive`. `peek()` may trigger derivation and throw directly. During dependency propagation, a computed refresh failure is reported to `onError` with context kind `computed` and does not prevent sibling dependents from updating. A disposed computed returns its last cached value from `peek()` without recomputing; a computed disposed before its first evaluation throws `RippleDisposedError` instead of returning a value.

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

| Parameter | Type | Description |
| --- | --- | --- |
| `options.name` | `string` | Optional label in error context |

Effects flush synchronously; `EffectOptions` has no scheduler option. Use `batch()` to coalesce writes.

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

Creates a disposable ownership boundary. Work created inside `scope.run()` belongs to that scope. Explicit scopes created during an effect run attach to the enclosing scope (not the transient effect-run owner) and therefore survive reruns until explicitly or parent-disposed. Disposed children detach from parent ownership immediately.

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

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `() => Source` | Tracks reactive input reads |
| `loader` | `(source, context) => Promise<Value>` | Receives input and a request-owned cancellation signal |
| `options.name` | `string` | Optional resource label |

**Returns:** `Resource<Value>`. Source and loader failures become error state, not `onError` reports.

**Example:**

```ts
import { resource, signal } from '@vielzeug/ripple';

const userId = signal('42');
const user = resource(
  () => userId.value,
  (id, { signal }) => fetch(`/users/${id}`, { signal }).then((response) => response.json()),
);
console.log(user.value);
user.dispose();
```

The state is `{ status: 'pending', previous? }`, `{ status: 'success', value }`, or `{ status: 'error', error, previous? }`. Reads remain available after disposal; `reload()` and new subscriptions throw `RippleDisposedError`.

## Watch

### `watch(source, callback, options?)`

```ts
function watch<T>(
  source: Readable<T> | (() => T),
  callback: (value: T, previous: T | undefined) => void,
  options?: WatchOptions<T>,
): EffectHandle;
```

Observes selected output changes using the default graph or a `Ripple.watch()` method. Callback-only reactive reads are untracked; without `immediate`, initial evaluation does not count as an invocation. For one-shot observation, dispose the returned handle from inside the callback: with `immediate: true`, do the first invocation at the call site instead, because the callback runs before the handle exists.

**Returns:** `EffectHandle`.

**Example:**

```ts
import { signal, watch } from '@vielzeug/ripple';

const count = signal(0);
const stop = watch(count, (value, previous) => console.log(previous, value), { immediate: true });
stop.dispose();
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

let current = 'idle';
const listeners = new Set<() => void>();
const state = fromSubscribable({
  getSnapshot: () => current,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
});

current = 'ready';
for (const listener of listeners) listener();
console.log(state.value);
state.dispose();
```

## Types

```ts
type Cleanup = () => void;
type Equality<T> = (previous: T, next: T) => boolean;
type Unsubscribe = () => void;

type SignalOptions<T> = { equals?: Equality<T>; name?: string };
type ComputedOptions<T> = { equals?: Equality<T>; name?: string };
type EffectOptions = { name?: string };
type WatchOptions<T> = { equals?: Equality<T>; immediate?: boolean; name?: string };

type RippleErrorContext = { readonly kind: 'cleanup' | 'computed' | 'effect' | 'flush' | 'listener'; readonly name?: string };
type RippleOptions = { onError?: (error: unknown, context: RippleErrorContext) => void };

interface Readable<T> {
  readonly name?: string;
  peek(): T;
  /** Change-only: the listener is not called on subscribe, only after a tracked source changes. */
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
  untrack<T>(fn: () => T): T;
  watch<T>(source: Readable<T> | (() => T), callback: (value: T, previous: T | undefined) => void, options?: WatchOptions<T>): EffectHandle;
}
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `RippleError` | Base Ripple error; a new subscription to a disposed external-source bridge | Use `instanceof RippleError` to narrow unknown values. |
| `RippleCycleError` | A computed reads itself, or a flush exceeds the iteration limit | Extends `RippleError`. A flush-loop breach is reported to `onError` (context kind `flush`) instead of throwing from the write site. |
| `RippleDisposedError` | New graph work, writes, or subscriptions on a disposed runtime; `run()` on a disposed scope; `reload()` or new subscriptions on a disposed resource; reading a never-evaluated disposed computed | Extends `RippleError`. Cached reads and repeated disposal remain valid. |

These are the three exported error classes. User callback failures are reported as their original
values through `onError`; they are not wrapped in `RippleError`. A direct computed read can throw
its derivation error to the caller.
