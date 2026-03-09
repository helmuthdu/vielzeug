---
title: Stateit — Reactive signals and state management
description: Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.
---

<PackageBadges package="stateit" />

<img src="/logo-stateit.svg" alt="Stateit Logo" width="156" class="logo-highlight"/>

# Stateit

**Stateit** is a tiny, zero-dependency reactive library that unifies two complementary primitives:

- **Signals** — fine-grained reactive values (`signal`, `computed`, `effect`, `watch`)
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

## Features

### Signals
- **`signal(value)`** — reactive holding cell; read `.value`, write `.value = next`
- **`computed(() => expr)`** — derived read-only signal; auto-updates when deps change
- **`effect(() => fn)`** — side-effect that re-runs when any signal read inside it changes
- **`watch(sig, cb, opts?)`** — explicit subscription that fires only when the value changes
- **`untrack(() => fn)`** — read signals inside an effect without creating subscriptions
- **`readonly(sig)`** — narrows a writable signal to a read-only view
- **`toValue(v)`** — unwrap a plain value or signal transparently
- **`writable(get, set)`** — bi-directional computed for form adapters and transformations
- **`batch(() => fn)`** — flush all notifications once after bulk updates
- **`isSignal(v)`** / **`isStore(v)`** — type guards

### Stores
- **`store(init, opts?)`** — structured reactive object container extending `Signal<T>`
- **`shallowEqual`** — the default equality function used by all comparisons
- **`.set(patch|updater)`** — shallow-merge or updater-function writes
- **`.reset()`** — restore the initial state baseline
- **Disposed-safety** — all methods are no-ops after `.dispose()`
- **Zero dependencies** — no supply chain risk; < 2 kB gzipped

## Quick Start

### Signals

```ts
import { signal, computed, effect, watch, batch } from '@vielzeug/stateit';

const count = signal(0);
const doubled = computed(() => count.value * 2);

// Side-effect: runs immediately and re-runs on change
const stop = effect(() => {
  console.log('doubled:', doubled.value);
});

count.value = 5; // → logs "doubled: 10"

// Explicit subscription — only fires on change, not immediately
const unsub = watch(count, (next, prev) => {
  console.log(prev, '→', next);
});

batch(() => {
  count.value = 10;
  count.value = 20; // only one notification
});

stop();    // dispose effect
unsub();   // unsubscribe watch
doubled.dispose(); // free computed
```

### Stores

```ts
import { store, batch } from '@vielzeug/stateit';

const counter = store({ count: 0 });

// Read
console.log(counter.value.count); // 0

// Watch all changes
const unsub = counter.watch((curr, prev) => {
  console.log(`${prev.count} → ${curr.count}`);
});

// Watch a selected slice — fires only when count changes
counter.watch(
  (s) => s.count,
  (count) => console.log('count:', count),
);

// Partial patch
counter.set({ count: 1 });

// Updater function
counter.set((s) => ({ ...s, count: s.count + 1 }));

// Batch: one notification for all set() calls
batch(() => {
  counter.set({ count: 10 });
  counter.set({ count: 11 });
});

// Reset to original initial state
counter.reset();

// Clean up
unsub();
counter.dispose();
```

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Concepts, patterns, and best practices |
| [API Reference](./api.md) | Complete type signatures and parameter docs |
| [Examples](./examples.md) | Real-world recipes and framework integrations |
