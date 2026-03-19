# @vielzeug/stateit

> Tiny, zero-dependency reactive state — signals, computed values, effects, and typed object stores

[![npm version](https://img.shields.io/npm/v/@vielzeug/stateit)](https://www.npmjs.com/package/@vielzeug/stateit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Stateit** is a tiny, zero-dependency reactive library with two complementary primitives:

- **Signals** — fine-grained reactive atoms with `signal()`, `computed()`, `effect()`, `watch()`, `batch()`, and more
- **Stores** — typed reactive object containers with partial patching, updater functions, selectors, and freeze

A `Store<T>` extends `Signal<T>`, so every signal primitive — `effect`, `watch`, `computed`, `batch` — works seamlessly on stores.

## Installation

```sh
pnpm add @vielzeug/stateit
# npm install @vielzeug/stateit
# yarn add @vielzeug/stateit
```

## Quick Start

### Signals

```typescript
import { signal, computed, effect, watch, batch } from '@vielzeug/stateit';

const count = signal(0);
const doubled = computed(() => count.value * 2);

// effect runs immediately and re-runs on every dependency change
const sub = effect(() => {
  console.log(`count=${count.value}, doubled=${doubled.value}`);
});
// → count=0, doubled=0

count.value = 3;
// → count=3, doubled=6

// Update via function — shorthand for count.value = count.value + n
count.update((n) => n + 1);
// → count=4, doubled=8

// Watch explicitly (does not fire immediately by default)
const stopWatch = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // → 4 → 5

// Batch coalesces notifications into one flush
batch(() => {
  count.value = 10;
  count.value = 20;
});
// One notification: → 5 → 20

sub.dispose(); // or: sub() — direct call also disposes
doubled.dispose();
stopWatch.dispose();
```

### Stores

```typescript
import { store, watch, batch } from '@vielzeug/stateit';

const counter = store({ count: 0, user: null as User | null });

// Read
console.log(counter.value); // { count: 0, user: null }

// Partial patch
counter.patch({ count: 1 });

// Updater function
counter.update((s) => ({ ...s, count: s.count + 1 }));

// Watch a slice — compose store.select() with watch()
const countSignal = counter.select((s) => s.count);
const stopWatch = watch(countSignal, (count, prev) => {
  console.log('count:', prev, '→', count);
});

// Batch updates into one notification
batch(() => {
  counter.patch({ count: 10 });
  counter.patch({ user: currentUser });
});

// Reset to initial state
counter.reset();

stopWatch.dispose();
counter.freeze();
```

## Features

- ✅ **Signals** — reactive atoms with `.value` getter/setter, `.update(fn)`, and `.peek()` for untracked reads
- ✅ **Computed** — lazy derived signals; call `.dispose()` to stop tracking dependencies
- ✅ **Effects** — run immediately and re-run when dependencies change; support cleanup returns; return a `Subscription`
- ✅ **Watch** — explicit subscriptions with `{ immediate?, once?, equals? }` options; returns a `Subscription`
- ✅ **Batch** — coalesce multiple writes into a single downstream notification
- ✅ **Untrack** — read signals without registering reactive dependencies
- ✅ **derived** — multi-source computed from an array of signals
- ✅ **nextValue** — `Promise` that resolves on the next matching signal emission
- ✅ **Custom equality** — `signal/computed/watch/store` all accept a custom `equals` function
- ✅ **Stores** — object state with `patch(partial)`, `update(fn)`, `reset()`, `select()`, and `freeze()`
- ✅ **Writable computed** — bidirectional computed with `writable(get, set)`
- ✅ **Symbol.dispose** — all dispose handles support `using` declarations (TC39 explicit resource management)
- ✅ **Type guards** — `isSignal(v)` and `isStore(v)`
- ✅ **Zero dependencies** — no supply-chain risk, minimal bundle size
- ✅ **Framework agnostic** — works in React, Vue, Svelte, or plain TypeScript

## Usage

### Signals

```typescript
import { signal, readonly } from '@vielzeug/stateit';

const count = signal(0);
count.value = 5;
count.peek(); // read without tracking
count.update((n) => n + 1); // derive next value in place

// Narrow to read-only view (no proxy overhead)
const ro = readonly(count);
```

### Computed

```typescript
import { signal, computed } from '@vielzeug/stateit';

const first = signal('Ada');
const last = signal('Lovelace');
const full = computed(() => `${first.value} ${last.value}`);

console.log(full.value); // 'Ada Lovelace'
full.stale; // false — just computed
first.value = 'Grace';
full.stale; // true — deps changed, not yet re-read

// Dispose (stop tracking dependencies)
full.dispose();
// or: using full = computed(...) — TC39 using declaration
```

### Effects

```typescript
import { signal, effect, onCleanup } from '@vielzeug/stateit';

const name = signal('Ada');

const sub = effect(() => {
  console.log('Hello,', name.value);
  return () => console.log('cleanup'); // optional teardown
});

name.value = 'Grace'; // logs 'cleanup' then 'Hello, Grace'
sub.dispose(); // logs 'cleanup', effect is removed
```

### Watch

```typescript
import { signal, store, watch } from '@vielzeug/stateit';

const count = signal(0);

// Plain watch
const sub = watch(count, (next, prev) => console.log(prev, '→', next));

// Slice watch — compose with store.select()
const user = store({ name: 'Ada', age: 30 });
const nameSig = user.select((s) => s.name);
watch(nameSig, (name) => console.log('name:', name));

// Options
watch(count, (v) => console.log(v), { immediate: true, once: true });

sub.dispose();
```

### Stores

```typescript
import { store, watch, batch } from '@vielzeug/stateit';

const cart = store({ items: [] as string[], total: 0 });

// Partial patch
cart.patch({ total: 42 });

// Updater function
cart.update((s) => ({ ...s, items: [...s.items, 'apple'] }));

// Derived slice
const totalSignal = cart.select((s) => s.total);

// Watch slice
watch(totalSignal, (total) => console.log('total:', total));

// Batch
batch(() => {
  cart.patch({ total: 0 });
  cart.update((s) => ({ ...s, items: [] }));
});

cart.reset();
cart.freeze();
```

### Writable Computed

```typescript
import { signal, writable } from '@vielzeug/stateit';

const celsius = signal(0);
const fahrenheit = writable(
  () => (celsius.value * 9) / 5 + 32,
  (f) => {
    celsius.value = ((f - 32) * 5) / 9;
  },
);

fahrenheit.value = 212;
console.log(celsius.value); // 100

fahrenheit.update((f) => f + 10); // increment via fn
fahrenheit.dispose();
```

### `nextValue` — Async Watch

```typescript
import { signal, nextValue } from '@vielzeug/stateit';

const status = signal<'idle' | 'loading' | 'done'>('idle');

// Wait for the next change (any value)
const next = await nextValue(status);

// Wait for a specific condition
const done = await nextValue(status, (v) => v === 'done');

// Abortable wait
const controller = new AbortController();
const p = nextValue(status, (v) => v === 'done', { signal: controller.signal });
controller.abort(new Error('cancelled'));
```

### Custom Equality

```typescript
import { signal, computed } from '@vielzeug/stateit';

// Signal only notifies when the array reference AND contents differ
const tags = signal(['ts'], { equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) });

// Computed suppresses downstream when result is structurally unchanged
const sorted = computed(() => [...tags.value].sort(), { equals: (a, b) => a.join() === b.join() });
```

## API

### Signal Functions

| Export             | Signature                                                | Returns                  |
| ------------------ | -------------------------------------------------------- | ------------------------ |
| `signal`           | `signal(initial, options?)`                              | `Signal<T>`              |
| `computed`         | `computed(fn, options?)`                                 | `ComputedSignal<T>`      |
| `writable`         | `writable(get, set, options?)`                           | `WritableSignal<T>`      |
| `derived`          | `derived(sources, fn, options?)`                         | `ComputedSignal<R>`      |
| `effect`           | `effect(fn, options?)`                                   | `Subscription`           |
| `watch`            | `watch(source, cb, options?)`                            | `Subscription`           |
| `nextValue`        | `nextValue(source, predicate?, { signal? }?)`           | `Promise<T>`             |
| `batch`            | `batch(fn)`                                              | `T`                      |
| `untrack`          | `untrack(fn)`                                            | `T`                      |
| `onCleanup`        | `onCleanup(fn)`                                          | `void`                   |
| `readonly`         | `readonly(sig)`                                          | `ReadonlySignal<T>`      |
| `toValue`          | `toValue(v)`                                             | `T`                      |
| `peekValue`        | `peekValue(v)`                                           | `T`                      |
| `isSignal`         | `isSignal(v)`                                            | `v is ReadonlySignal<T>` |
| `isStore`          | `isStore(v)`                                             | `v is Store<T>`          |
| `shallowEqual`     | `shallowEqual(a, b)`                                     | `boolean`                |
| `configureStateit` | `configureStateit(opts)`                                 | `void`                   |
| `_resetContextForTesting` | `_resetContextForTesting()`                       | `void`                   |

### Store Functions

| Export  | Signature                  | Returns    |
| ------- | -------------------------- | ---------- |
| `store` | `store(initial, options?)` | `Store<T>` |

### `Store<T>` Methods

| Member                        | Description                                                             |
| ----------------------------- | ----------------------------------------------------------------------- |
| `.value`                      | Read the current state (tracked)                                        |
| `.peek()`                     | Read the current state (untracked)                                      |
| `.update(fn)`                 | Derive next state via `fn(copy) => next`                                |
| `.patch(partial)`             | Shallow-merge a `Partial<T>` into state                                 |
| `.reset()`                    | Restore the original initial state                                      |
| `.select(selector, options?)` | Lazily derived `ComputedSignal<U>` from a slice; compose with `watch()` |
| `.frozen`                     | `true` after `freeze()` has been called                                 |
| `.freeze()`                   | Freeze the store; further writes are silently ignored                   |

### Types

| Type                 | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `Signal<T>`          | Readable/writable reactive atom with `.update(fn)`                                   |
| `ReadonlySignal<T>`  | Read-only signal (no setter)                                                         |
| `ComputedSignal<T>`  | `ReadonlySignal<T> & Disposable` — has `.stale`, `.dispose()`                        |
| `WritableSignal<T>`  | `Signal<T> & Disposable` — has `.stale`, `.update(fn)`, `.dispose()`                 |
| `Store<T>`           | Object store extending `Signal<T>`                                                   |
| `Subscription`       | Callable + `.dispose()` + `[Symbol.dispose]` — returned by `effect`/`watch`          |
| `Disposable`         | `.dispose()` + `[Symbol.dispose]` — implemented by `ComputedSignal`/`WritableSignal` |
| `CleanupFn`          | `() => void`                                                                         |
| `EffectCallback`     | `() => CleanupFn \| void`                                                            |
| `EffectOptions`      | `{ maxIterations?, onError? }`                                                       |
| `EqualityFn<T>`      | `(a: T, b: T) => boolean`                                                            |
| `ReactiveOptions<T>` | `{ equals?: EqualityFn<T> }`                                                         |
| `WatchOptions<T>`    | `{ immediate?, once?, equals? }`                                                     |
| `StoreOptions<T>`    | `{ equals?: EqualityFn<T> }`                                                         |

## Documentation

Full docs at **[vielzeug.dev/stateit](https://vielzeug.dev/stateit)**

|                                                   |                                        |
| ------------------------------------------------- | -------------------------------------- |
| [Usage Guide](https://vielzeug.dev/stateit/usage) | Concepts, patterns, and best practices |
| [API Reference](https://vielzeug.dev/stateit/api) | Complete type signatures               |
| [Examples](https://vielzeug.dev/stateit/examples) | Framework integrations and recipes     |
