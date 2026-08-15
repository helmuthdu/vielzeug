---
title: Ripple — API Reference
description: Complete reference for reactive graphs, signals, effects, scopes, watchers, and resources.
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
| `resource()` | Load async source | Async | Read dependencies in source callback |
| `isReactive()` | Test `Readable` identity | Sync | Does not test arbitrary objects |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/ripple` | All primitives, types, and errors — signals, computed, effects, scopes, watch, resource, and the isolated graph factory |

## Graph Creation

### `createRipple(options?)`

```ts
function createRipple(options?: RippleOptions): Ripple;
```

Creates one isolated reactive graph. Factories on the returned object share scheduling, ownership, observer, and error boundaries. `dispose()` is terminal: `ripple.disposed` becomes `true`, existing owned work is disposed, and creating more graph work throws `RippleDisposedRuntimeError`. Create a new graph for a new lifetime.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.onError` | `(error, context) => void` | Receives effect, cleanup, listener, or observer failures. |
| `options.observer` | `ReactiveObserver` | Receives graph events. |

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

Tests whether a value is a Ripple readable node.

**Returns:** `true` for a `Signal`, computed value, or other `Readable` node.

**Example:**

```ts
import { isReactive, signal } from '@vielzeug/ripple';

console.log(isReactive(signal(0)));
```

## Default Graph Functions

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

Creates a lazy read-only value from reactive reads in `derive`.

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

Creates a disposable ownership boundary. Work created inside `scope.run()` belongs to that scope.

**Returns:** `Scope`.

**Example:**

```ts
import { createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope('panel');
const count = signal(0);

scope.run(() => effect(() => console.log(count.value)));
scope.dispose();
```

## Watch and Resources

### `watch(source, callback, options?)`

```ts
function watch<T>(
  source: Readable<T> | (() => T),
  callback: (value: T, previous: T | undefined) => void,
  options?: WatchOptions<T>,
): EffectHandle;
```

Observes selected output changes using the default graph or a `Ripple.watch()` method.

**Returns:** `EffectHandle`.

**Example:**

```ts
import { signal, watch } from '@vielzeug/ripple';

const count = signal(0);
const stop = watch(count, (value, previous) => console.log(previous, value), { immediate: true });
stop.dispose();
```

---

### `resource(source, loader, options?)`

```ts
function resource<Source, Value>(
  source: () => Source,
  loader: (source: Source, context: { readonly signal: AbortSignal }) => Promise<Value>,
  options?: ResourceOptions,
): Resource<Value>;
```

Tracks `source`, aborts stale loader work, and exposes `AsyncState<Value>`. Source and loader failures become `status: 'error'` state; handle them from `resource.value` rather than `RippleOptions.onError`, which is reserved for runtime callback, cleanup, listener, and observer failures.

**Returns:** `Resource<Value>`.

**Example:**

```ts
import { resource, signal } from '@vielzeug/ripple';

const userId = signal('42');
const user = resource(() => userId.value, async (id) => ({ id }));

if (user.value.status === 'error') console.error(user.value.error);
user.dispose();
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
type ResourceOptions = { name?: string };

type ReactiveEvent =
  | { readonly kind: 'compute'; readonly name?: string }
  | { readonly kind: 'effect'; readonly name?: string }
  | { readonly kind: 'write'; readonly name?: string; readonly next: unknown; readonly previous: unknown }
  | { readonly kind: 'dispose'; readonly name?: string; readonly node: 'effect' | 'scope' };

type ReactiveObserver = (event: ReactiveEvent) => void;
type ReactiveErrorContext = { readonly kind: 'cleanup' | 'effect' | 'listener' | 'observer'; readonly name?: string };
type RippleOptions = { observer?: ReactiveObserver; onError?: (error: unknown, context: ReactiveErrorContext) => void };

type AsyncState<T> =
  | { readonly previous?: T; readonly status: 'pending' }
  | { readonly status: 'success'; readonly value: T }
  | { readonly error: unknown; readonly previous?: T; readonly status: 'error' };

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

interface Resource<T> extends Readable<AsyncState<T>>, Disposable { reload(): void }

interface Ripple {
  batch<T>(fn: () => T): T;
  computed<T>(derive: () => T, options?: ComputedOptions<T>): Readable<T>;
  createScope(name?: string): Scope;
  dispose(): void;
  readonly disposed: boolean;
  effect(callback: () => Cleanup | void, options?: EffectOptions): EffectHandle;
  resource<Source, Value>(source: () => Source, loader: (source: Source, context: { readonly signal: AbortSignal }) => Promise<Value>, options?: ResourceOptions): Resource<Value>;
  signal<T>(initial: T, options?: SignalOptions<T>): Signal<T>;
  untrack<T>(fn: () => T): T;
  watch<T>(source: Readable<T> | (() => T), callback: (value: T, previous: T | undefined) => void, options?: WatchOptions<T>): EffectHandle;
}
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `RippleError` | Base Ripple error | `RippleError.is(error)` narrows unknown values. |
| `RippleComputedCycleError` | Computed dependency reads itself through a cycle | Extends `RippleError`. |
| `RippleDisposedRuntimeError` | Factory or execution API used after `ripple.dispose()` | Extends `RippleError`. |
| `RippleDisposedScopeError` | `scope.run()` after scope disposal | Extends `RippleError`. |
| `RippleInfiniteLoopError` | Effect flush exceeds graph iteration limit | Extends `RippleError`. |
