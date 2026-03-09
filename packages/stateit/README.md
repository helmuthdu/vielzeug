# @vielzeug/stateit

> Tiny, zero-dependency reactive state — signals, computed values, effects, and typed object stores

[![npm version](https://img.shields.io/npm/v/@vielzeug/stateit)](https://www.npmjs.com/package/@vielzeug/stateit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Stateit** is a tiny, zero-dependency reactive library with two complementary primitives:

- **Signals** — fine-grained reactive atoms with `signal()`, `computed()`, `effect()`, `watch()`, `batch()`, and more
- **Stores** — typed reactive object containers with partial patching, updater functions, selectors, and disposal

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
const stopEffect = effect(() => {
  console.log(`count=${count.value}, doubled=${doubled.value}`);
});
// → count=0, doubled=0

count.value = 3;
// → count=3, doubled=6

// Watch explicitly (does not fire immediately by default)
const stopWatch = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // → 3 → 5

// Batch coalesces notifications into one flush
batch(() => {
  count.value = 10;
  count.value = 20;
});
// One notification: → 5 → 20

stopEffect();
doubled(); // call computed to dispose
stopWatch();
```

### Stores

```typescript
import { store, watch } from '@vielzeug/stateit';

const counter = store({ count: 0, user: null as User | null });

// Read
console.log(counter.value); // { count: 0, user: null }

// Partial patch
counter.set({ count: 1 });

// Updater function
counter.update(s => ({ ...s, count: s.count + 1 }));

// Watch a selector slice — fires only when the selected value changes
const stopWatch = watch(counter, s => s.count, (count, prev) => {
  console.log('count:', prev, '→', count);
});

// Batch updates into one notification
batch(() => {
  counter.set({ count: 10 });
  counter.set({ user: currentUser });
});

// Derived slice as a computed signal
const countSignal = counter.select(s => s.count);
console.log(countSignal.value); // 10

// Reset to initial state
counter.reset();

stopWatch();
counter.dispose();
```

## Features

- ✅ **Signals** — reactive atoms with `.value` getter/setter and `.peek()` for untracked reads
- ✅ **Computed** — lazy derived signals; call `fn()` to dispose and free dependencies
- ✅ **Effects** — run immediately and re-run when dependencies change; support cleanup returns
- ✅ **Watch** — explicit subscriptions with `{ immediate?, once?, equals? }` options
- ✅ **Batch** — coalesce multiple writes into a single downstream notification
- ✅ **Untrack** — read signals without registering reactive dependencies
- ✅ **Custom equality** — `signal/computed/watch/store` all accept a custom `equals` function
- ✅ **Stores** — object state with `set(patch)`, `update(fn)`, `reset()`, `select()`, and `dispose()`
- ✅ **Writable computed** — bidirectional computed with `writable(get, set)`
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

// Narrow to read-only view (identity — no proxy overhead)
const ro = readonly(count);
```

### Computed

```typescript
import { signal, computed } from '@vielzeug/stateit';

const first = signal('Ada');
const last  = signal('Lovelace');
const full  = computed(() => `${first.value} ${last.value}`);

console.log(full.value); // 'Ada Lovelace'

// Dispose (stop tracking dependencies)
full();
```

### Effects

```typescript
import { signal, effect } from '@vielzeug/stateit';

const name = signal('Ada');

const stop = effect(() => {
  console.log('Hello,', name.value);
  return () => console.log('cleanup'); // optional teardown
});

name.value = 'Grace'; // logs 'cleanup' then 'Hello, Grace'
stop();               // logs 'cleanup', effect is removed
```

### Watch

```typescript
import { signal, watch } from '@vielzeug/stateit';

const count = signal(0);

// Plain watch
const stop = watch(count, (next, prev) => console.log(prev, '→', next));

// With selector
const user = signal({ name: 'Ada', age: 30 });
watch(user, s => s.name, (name) => console.log('name:', name));

// Options
watch(count, (v) => console.log(v), { immediate: true, once: true });

stop();
```

### Stores

```typescript
import { store, watch, batch } from '@vielzeug/stateit';

const cart = store({ items: [] as string[], total: 0 });

// Partial patch
cart.set({ total: 42 });

// Updater function
cart.update(s => ({ ...s, items: [...s.items, 'apple'] }));

// Derived slice
const total = cart.select(s => s.total);

// Watch
watch(cart, s => s.total, (total) => console.log('total:', total));

// Batch
batch(() => {
  cart.set({ total: 0 });
  cart.update(s => ({ ...s, items: [] }));
});

cart.reset();
cart.dispose();
```

### Writable Computed

```typescript
import { signal, writable } from '@vielzeug/stateit';

const celsius = signal(0);
const fahrenheit = writable(
  () => celsius.value * 9 / 5 + 32,
  (f) => { celsius.value = (f - 32) * 5 / 9; },
);

fahrenheit.value = 212;
console.log(celsius.value); // 100

fahrenheit(); // dispose
```

### Custom Equality

```typescript
import { signal, computed } from '@vielzeug/stateit';

// Signal only notifies when the array reference AND contents differ
const tags = signal(['ts'], { equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) });

// Computed suppresses downstream when result is structurally unchanged
const sorted = computed(
  () => [...tags.value].sort(),
  { equals: (a, b) => a.join() === b.join() },
);
```

## API

### Signal Functions

| Export | Signature | Returns |
|---|---|---|
| `signal` | `signal(initial, options?)` | `Signal<T>` |
| `computed` | `computed(fn, options?)` | `ComputedSignal<T>` |
| `writable` | `writable(get, set, options?)` | `WritableSignal<T>` |
| `effect` | `effect(fn)` | `CleanupFn` |
| `watch` | `watch(source, cb, options?)` | `CleanupFn` |
| `watch` | `watch(source, selector, cb, options?)` | `CleanupFn` |
| `batch` | `batch(fn)` | `T` |
| `untrack` | `untrack(fn)` | `T` |
| `readonly` | `readonly(sig)` | `ReadonlySignal<T>` |
| `toValue` | `toValue(v)` | `T` |
| `isSignal` | `isSignal(v)` | `v is ReadonlySignal<T>` |
| `isStore` | `isStore(v)` | `v is Store<T>` |

### Store Functions

| Export | Signature | Returns |
|---|---|---|
| `store` | `store(initial, options?)` | `Store<T>` |

### `Store<T>` Methods

| Member | Description |
|---|---|
| `.value` | Read the current state (tracked) |
| `.peek()` | Read the current state (untracked) |
| `.set(patch)` | Shallow-merge a partial object into state |
| `.update(fn)` | Derive next state via an updater function |
| `.reset()` | Restore the original initial state |
| `.select(selector, options?)` | Lazily derived `ComputedSignal<U>` from a state slice |
| `.disposed` | `true` after `dispose()` has been called |
| `.dispose()` | Freeze the store; further writes are silently ignored |

### Types

| Type | Description |
|---|---|
| `Signal<T>` | Readable/writable reactive atom |
| `ReadonlySignal<T>` | Read-only signal (no setter) |
| `ComputedSignal<T>` | `ReadonlySignal<T> & CleanupFn` — call `fn()` to dispose |
| `WritableSignal<T>` | `Signal<T> & CleanupFn` — call `fn()` to dispose |
| `Store<T>` | Object store extending `Signal<T>` |
| `CleanupFn` | `() => void` |
| `EffectFn` | `() => CleanupFn \| void` |
| `EqualityFn<T>` | `(a: T, b: T) => boolean` |
| `SignalOptions<T>` | `{ equals?: EqualityFn<T> }` |
| `ComputedOptions<T>` | `{ equals?: EqualityFn<T> }` |
| `WatchOptions<U>` | `{ immediate?, once?, equals? }` |
| `StoreOptions<T>` | `{ equals?: EqualityFn<T> }` |

## Documentation

Full docs at **[vielzeug.dev/stateit](https://vielzeug.dev/stateit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/stateit/usage) | Concepts, patterns, and best practices |
| [API Reference](https://vielzeug.dev/stateit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/stateit/examples) | Framework integrations and recipes |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
