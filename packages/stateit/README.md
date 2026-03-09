# @vielzeug/stateit

> Reactive signals and state management — signals, computed values, effects, and typed object stores

[![npm version](https://img.shields.io/npm/v/@vielzeug/stateit)](https://www.npmjs.com/package/@vielzeug/stateit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Stateit** is a tiny, zero-dependency reactive library with two complementary primitives:

- **Signals** — fine-grained reactive values with `signal()`, `computed()`, `effect()`, `watch()`, `batch()`, and more
- **Stores** — typed reactive object containers with watch, selectors, and batching

A `Store<T>` extends `Signal<T>`, so all signal primitives work seamlessly on stores.

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

// effect runs immediately and on every dependency change
const stop = effect(() => {
  console.log(`count=${count.value}, doubled=${doubled.value}`);
});
// → count=0, doubled=0

count.value = 3;
// → count=3, doubled=6

// Watch explicitly (does not fire immediately)
const unsub = watch(count, (next, prev) => console.log(prev, '→', next));
count.value = 5; // → 3 → 5

// Batch coalesces notifications
batch(() => {
  count.value = 10;
  count.value = 20;
});
// One notification: → 5 → 20

stop();
doubled.dispose();
unsub();
```

### Stores

```typescript
import { store } from '@vielzeug/stateit';

const counter = store({ count: 0, user: null as User | null });

// Read
console.log(counter.value);           // { count: 0, user: null }

// Write — partial patch
counter.set({ count: 1 });
// Write — updater function
counter.set(s => ({ ...s, count: s.count + 1 }));

// Watch a selector slice — fires only when the selected value changes
const unsub = counter.watch(
  s => s.count,
  (count, prev) => console.log('count:', count),
);

// Batch updates into one notification
batch(() => {
  counter.set({ count: 10 });
  counter.set({ user: currentUser });
});

// Reset to initial state
counter.reset();

unsub();
counter.dispose();
```

## Features

### Signals
- **`signal(initial)`** — reactive value with `.value` getter/setter and `.peek()`
- **`computed(fn)`** — derived read-only signal, auto-disposes when you call `.dispose()`
- **`effect(fn)`** — runs immediately and re-runs on dependency changes; supports cleanup
- **`watch(signal, cb, opts?)`** — explicit subscription; `{ immediate?, once? }`
- **`batch(fn)`** — coalesce notifications; nested batches merge correctly
- **`untrack(fn)`** — read signals without registering dependencies
- **`readonly(signal)`** — proxy that throws on writes; narrows type to `ReadonlySignal<T>`
- **`isSignal(v)`** / **`isStore(v)`** — type guards
- **`toValue(v)`** — unwrap a signal or return raw value as-is
- **`writable(get, set)`** — bi-directional computed; useful as a form adapter
- **`isSignal(v)`** / **`isStore(v)`** — type guards

### Stores
- **`.value` accessor** — read current state directly, no getter call needed
- **Reactive `watch()`** — full-state or selective with custom equality
- **`reset()`** — restore the initial state baseline
- **`.disposed`** — boolean getter; `true` after `.dispose()` is called

### General
- **Zero dependencies** — no supply chain risk, minimal bundle size
- **Framework agnostic** — React, Vue, Svelte, or vanilla JS

## API

### Signal Functions

| Export | Signature | Returns |
|---|---|---|
| `signal` | `signal(initial)` | `Signal<T>` |
| `computed` | `computed(fn)` | `ComputedSignal<T>` |
| `effect` | `effect(fn)` | `CleanupFn` |
| `watch` | `watch(source, cb, opts?)` | `CleanupFn` |
| `batch` | `batch(fn)` | `T` (return value of fn) |
| `untrack` | `untrack(fn)` | `T` |
| `readonly` | `readonly(signal)` | `ReadonlySignal<T>` |
| `toValue` | `toValue(v)` | `T` |
| `writable` | `writable(get, set)` | `WritableSignal<T>` |
| `isSignal` | `isSignal(v)` | `v is ReadonlySignal<T>` |
| `isStore` | `isStore(v)` | `v is Store<T>` |

### Store Functions

| Export | Signature | Returns |
|---|---|---|
| `store` | `store(initial, opts?)` | `Store<T>` |
| `shallowEqual` | `shallowEqual(a, b)` | `boolean` |

### `store(initialState, options?)`

Returns a `Store<T>` (which extends `Signal<T>`) with:

| Member | Description |
|---|---|
| `.value` | Read the current state |
| `.set(patch)` | Shallow-merge a partial patch |
| `.set(updater)` | Update via an updater function |
| `.reset()` | Restore to the original initial state |
| `.watch(cb, opts?)` | Watch full-state changes |
| `.watch(selector, cb, opts?)` | Watch a selected slice only |
| `.disposed` | `true` after `dispose()` has been called |
| `.dispose()` | Clear all watchers and freeze the store |

### Types

| Type | Description |
|---|---|
| `Signal<T>` | Reactive value with `.value` and `.peek()` |
| `ReadonlySignal<T>` | Signal with no write access |
| `ComputedSignal<T>` | `ReadonlySignal<T>` + `.dispose()` |
| `CleanupFn` | `() => void` — teardown function |
| `EffectFn` | `() => CleanupFn \| void` — effect callback |
| `WatchOptions` | `{ immediate?, once? }` for signal watch |
| `WatchSelectorOptions<U>` | `WatchOptions & { equals? }` for store selector watch |
| `Store<T>` | Full mutable store extending `Signal<T>` |
| `StoreOptions<T>` | Options for `store()` |

## Documentation

Full docs at **[vielzeug.dev/stateit](https://vielzeug.dev/stateit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/stateit/usage) | Concepts, patterns, and best practices |
| [API Reference](https://vielzeug.dev/stateit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/stateit/examples) | Framework integrations and recipes |


## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
