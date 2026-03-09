---
title: Stateit — Reactive signals and state management
description: Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.
---

<PackageBadges package="stateit" />

<img src="/logo-stateit.svg" alt="Stateit Logo" width="156" class="logo-highlight"/>

# Stateit

**Stateit** is a tiny, zero-dependency reactive library that unifies two complementary primitives:

- **Signals** — fine-grained reactive atoms (`signal`, `computed`, `effect`, `watch`)
- **Stores** — structured reactive state containers for plain objects (`store`)

Both share the same `.value` access and `watch()` / `effect()` subscription model. A `Store<T>` **is** a `Signal<T>`, so every signal primitive works on stores too.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/stateit
```

```sh [npm]
npm install @vielzeug/stateit
```

```sh [yarn]
yarn add @vielzeug/stateit
```

:::

## Quick Start

### Signals

```ts
import { signal, computed, effect, watch, batch } from '@vielzeug/stateit';

const count = signal(0);
const doubled = computed(() => count.value * 2);

// Side-effect: runs immediately and re-runs on change
const stopEffect = effect(() => {
  console.log('doubled:', doubled.value);
});

count.value = 5; // → logs "doubled: 10"

// Explicit subscription — only fires on change, not immediately
const stopWatch = watch(count, (next, prev) => {
  console.log(prev, '→', next);
});

batch(() => {
  count.value = 10;
  count.value = 20; // only one notification
});

stopEffect(); // dispose effect
stopWatch();  // unsubscribe watch
doubled();    // call to dispose computed
```

### Stores

```ts
import { store, watch, batch } from '@vielzeug/stateit';

const counter = store({ count: 0 });

// Read
console.log(counter.value.count); // 0

// Watch all changes
const stopWatch = watch(counter, (curr, prev) => {
  console.log(`${prev.count} → ${curr.count}`);
});

// Watch a selected slice — fires only when count changes
watch(counter, s => s.count, (count, prev) => {
  console.log('count:', prev, '→', count);
});

// Partial patch
counter.set({ count: 1 });

// Updater function
counter.update(s => ({ ...s, count: s.count + 1 }));

// Derived slice as a computed signal
const countSignal = counter.select(s => s.count);

// Batch: one notification for all writes
batch(() => {
  counter.set({ count: 10 });
  counter.update(s => ({ ...s, count: s.count + 1 }));
});

// Reset to original initial state
counter.reset();

// Clean up
stopWatch();
counter.dispose();
```

## Features

### Signals

- **`signal(value, options?)`** — reactive atom; read `.value`, write `.value = next`, peek untracked with `.peek()`
- **`computed(fn, options?)`** — lazy derived signal; recomputes when deps change; call `fn()` to dispose
- **`effect(fn)`** — side-effect that re-runs when any signal read inside it changes; supports cleanup return
- **`watch(source, cb, options?)`** — explicit subscription that fires only when the value changes
- **`watch(source, selector, cb, options?)`** — watch a selected slice; fires only when the slice changes
- **`untrack(fn)`** — read signals inside an effect without creating subscriptions
- **`readonly(sig)`** — narrows a signal to a `ReadonlySignal<T>` view (identity, no proxy)
- **`toValue(v)`** — unwrap a plain value or signal transparently
- **`writable(get, set, options?)`** — bidirectional computed for form adapters and transformations
- **`batch(fn)`** — flush all notifications once after bulk updates
- **`isSignal(v)`** / **`isStore(v)`** — type guards

### Stores

- **`store(init, options?)`** — structured reactive object container extending `Signal<T>`
- **`.set(patch)`** — shallow-merge a partial object into state
- **`.update(fn)`** — derive next state from current via an updater function
- **`.select(selector, options?)`** — lazily derived `ComputedSignal<U>` from a state slice
- **`.reset()`** — restore the initial state baseline
- **Disposed-safety** — writes are silently ignored after `.dispose()`
- **Zero dependencies** — no supply chain risk; < 2 kB gzipped

## Next Steps

|                           |                                               |
| ------------------------- | --------------------------------------------- |
| [Usage Guide](./usage.md) | Concepts, patterns, and best practices        |
| [API Reference](./api.md) | Complete type signatures and parameter docs   |
| [Examples](./examples.md) | Real-world recipes and framework integrations |
