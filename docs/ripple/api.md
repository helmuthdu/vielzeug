---
title: 'Ripple: API Reference'
description: Complete reference for reactive graphs, signals, effects, scopes, and watchers.
---

[[toc]]

## API Overview

| Symbol                | Purpose                                | Execution mode              | Common gotcha                                             |
| --------------------- | -------------------------------------- | --------------------------- | --------------------------------------------------------- |
| `signal()`            | Create writable value                  | Sync                        | Default graph is process-wide                             |
| `computed()`          | Create lazy derived value              | Sync                        | Keep derivation pure                                      |
| `effect()`            | React to dependency reads              | Sync                        | Dispose handle or return cleanup                          |
| `onCleanup()`         | Run when the active owner disposes     | Sync                        | Call it inside a scope or effect                          |
| `batch()`             | Coalesce synchronous writes            | Sync                        | Does not roll back writes                                 |
| `createScope()`       | Group work and error handling          | Sync                        | Call `run()` to activate it                               |
| `untrack()`           | Read without tracking                  | Sync                        | Read still happens immediately                            |
| `watch()`             | Observe selected output                | Sync                        | Use `effect()` for broad reads                            |
| `resource()`          | Load from tracked reactive input       | Sync factory / Async loader | `reload()` returns `void`; completion is observable state |
| `fromSubscribable()`  | Bridge external source                 | Sync                        | Returned bridge must be disposed                          |
| `isReactive()`        | Test Ripple's marked readable contract | Sync                        | Not a security or provenance check                        |
| `RippleError`         | Base package error                     | Sync                        | Runtime callback failures retain their original value     |
| `RippleCycleError`    | Computed cycle or runaway flush        | Sync                        | Flush failures use the runtime root error route           |
| `RippleDisposedError` | Work after scope/resource disposal     | Sync                        | Cached reads remain available                             |

## Package Entry Point

| Import             | Purpose                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `@vielzeug/ripple` | All primitives, types, and errors: signals, computed, effects, scopes, watch, and resources |

## Runtime and Scope Errors

All root functions use one module-level reactive runtime. Values created by any root function can track one another, including when a computed is read from an effect created in a different scope. Use scopes for ownership and error routing, not to create isolated dependency graphs.

`createScope({ name, onError })` configures a subtree error boundary. Effect failures use the scope in which the effect was created; cleanup failures use their owning scope. The nearest handler wins. If it throws, the thrown error escalates to the parent scope handler. With no handler, failures are rethrown asynchronously through `queueMicrotask`. Listener errors and flush overflow use the root route.

---

### `isReactive(value)`

```ts
function isReactive<T>(value: T | Readable<T>): value is Readable<T>;
```

Tests Ripple's shared-symbol marker and complete readable surface (`value`, `peek()`, and `subscribe()`). Recognition works across duplicated Ripple module graphs, but tracking does not: each loaded module graph has its own runtime and collectors. The marker is intentionally structural and forgeable; do not use this guard for trust or provenance decisions.

**Returns:** `true` for marked signals, computeds, resources, and external-source bridges with the complete readable contract.

**Example:**

```ts
import { isReactive, signal } from '@vielzeug/ripple';

console.log(isReactive(signal(0)));
```

## Core Functions

Root functions (`signal`, `computed`, `effect`, `onCleanup`, `batch`, `createScope`, `untrack`, `watch`, `resource`, `fromSubscribable`) operate on the process-lifetime runtime. The runtime has no public disposal handle; dispose effects, scopes, resources, and bridges through their owners.

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

Creates a lazy read-only value from reactive reads in `derive`. A write only marks the computed stale; it derives on the next read, at most once per flush, and always from up-to-date sources. A signal write during a derive throws `RippleError`. A derivation error is cached and rethrown by every read (`value` or `peek()`) until a source changes; an effect that reads it reports it through its owning scope. A disposed computed returns its last cached value from `peek()` without recomputing; a computed disposed before its first evaluation throws `RippleDisposedError` instead of returning a value. Create it inside a scope when its lifetime is bounded.

**Returns:** `Readable<T>`.

**Example:**

```ts
import { computed, createScope, signal } from '@vielzeug/ripple';

const scope = createScope();
const doubled = scope.run(() => {
  const count = signal(2);
  return computed(() => count.value * 2);
});
console.log(doubled.value);
scope.dispose();
```

---

### `effect(callback, options?)`

```ts
function effect(callback: () => Cleanup | undefined, options?: EffectOptions): EffectHandle;
```

Runs immediately and reruns when its tracked reads change. An effect that only reads computeds reruns only when one of them derives a different value. A returned cleanup runs before the next callback or disposal.

| Parameter      | Type     | Description                     |
| -------------- | -------- | ------------------------------- |
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

### `onCleanup(fn)`

```ts
function onCleanup(fn: Cleanup): void;
```

Registers `fn` on the active owner: the current effect run when called inside an effect, otherwise the active scope. The callback runs when that owner is disposed, after the owner's effects and computeds, newest first. For an effect run that means before the next run, and after the cleanup function the effect itself returned. A callback that calls `onCleanup()`, `effect()`, or `computed()` while its owner is being disposed gets that work torn down immediately. A throwing callback is reported through `onError` and does not skip the others.

Called with no scope or effect active, it registers on the permanent runtime root. Use an explicit scope when the callback must run at a bounded lifetime.

**Example:**

```ts
import { createScope, effect, onCleanup, signal } from '@vielzeug/ripple';

const scope = createScope({ name: 'panel' });
const count = signal(0);

scope.run(() => {
  effect(() => {
    console.log(count.value);
    onCleanup(() => console.log('effect run ended'));
  });
  onCleanup(() => console.log('panel closed'));
});

scope.dispose();
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

### `createScope(options?)`

```ts
function createScope(options?: ScopeOptions): Scope;
```

Creates a disposable ownership and error boundary. Work created inside `scope.run()` belongs to that scope. `name` labels errors for cleanup callbacks. `onError` handles failures from effects and cleanups created in this scope or its descendants; a throwing handler escalates to the nearest parent handler. Explicit scopes created during an effect run attach to the enclosing scope (not the transient effect-run owner) and therefore survive reruns until explicitly or parent-disposed. Disposed children detach from parent ownership immediately.

| Parameter         | Type                       | Description                                   |
| ----------------- | -------------------------- | --------------------------------------------- |
| `options.name`    | `string`                   | Optional scope label                          |
| `options.onError` | `(error, context) => void` | Scope error handler; a thrown error escalates |

**Returns:** `Scope`.

**Example:**

```ts
import { createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope({ name: 'panel' });
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

| Parameter      | Type                                  | Description                                            |
| -------------- | ------------------------------------- | ------------------------------------------------------ |
| `source`       | `() => Source`                        | Tracks reactive input reads                            |
| `loader`       | `(source, context) => Promise<Value>` | Receives input and a request-owned cancellation signal |
| `options.name` | `string`                              | Optional resource label                                |

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

Observes selected output changes using the shared runtime. Callback-only reactive reads are untracked; without `immediate`, initial evaluation does not count as an invocation. For one-shot observation, dispose the returned handle from inside the callback: with `immediate: true`, do the first invocation at the call site instead, because the callback runs before the handle exists.

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

Bridges an external `{ getSnapshot, subscribe }` source into a disposable reactive readable. The bridge subscribes and then rereads the snapshot to avoid missing a change during registration. An optional signal disposes the bridge.

**Returns:** `BridgedReadable<T>`. Disposal invokes the source unsubscribe function. Reads remain available afterward, while new subscriptions throw `RippleDisposedError`.

**Example:**

```ts
import { fromSubscribable } from '@vielzeug/ripple';

let current = 'idle';
const listeners = new Set<() => void>();
const state = fromSubscribable({
  getSnapshot: () => current,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
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

type RippleErrorContext = {
  readonly kind: 'cleanup' | 'effect' | 'flush' | 'listener';
  readonly name?: string;
};
type ScopeOptions = {
  name?: string;
  onError?: (error: unknown, context: RippleErrorContext) => void;
};

interface Readable<T> {
  readonly name?: string;
  peek(): T;
  /** Change-only: the listener is not called on subscribe, only after a tracked source changes. */
  subscribe(listener: () => void): Unsubscribe;
  readonly value: T;
}

interface Signal<T> extends Readable<T> {
  update(updater: (prev: T) => T): void;
  value: T;
}
interface Disposable {
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose](): void;
}
type EffectHandle = Disposable;
interface Scope extends Disposable {
  run<T>(fn: () => T): T;
}

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
```

## Errors

| Error                 | Trigger                                                                                                                                    | Notable properties                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `RippleError`         | Base class of every Ripple error                                                                                                           | Use `instanceof RippleError` to narrow unknown values.                                                                 |
| `RippleCycleError`    | A computed reads itself, directly or through other computeds, or a flush exceeds the iteration limit                                       | Extends `RippleError`. Flush overflow uses the runtime root error route instead of throwing from the triggering write. |
| `RippleDisposedError` | `run()` on a disposed scope; `reload()` or new subscriptions on a disposed resource or bridge; reading a never-evaluated disposed computed | Extends `RippleError`. Cached reads and repeated disposal remain valid.                                                |

These are the three exported error classes. User callback failures are reported as their original
values through the owning scope's `onError`; listener and flush errors use the runtime root route.
They are not wrapped in `RippleError`. A direct computed read rethrows its cached derivation error
to the caller.
