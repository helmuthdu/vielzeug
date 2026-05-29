---
title: Ripple — Reactive signals and state management
description: Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.
package: ripple
category: state
keywords: [reactive, signals, computed, effects, store, observable, fine-grained, watch, batch, scope]
related: [craft, forge, relay]
exports: [signal, computed, effect, watch, batch, store, untrack, scope, writable, derived, isSignal]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="ripple" />

<img src="/logo-ripple.svg" alt="Ripple logo" width="156" class="logo-highlight"/>

# Ripple

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/ripple` &nbsp;·&nbsp; **Category:** State

**Key exports:** `signal`, `computed`, `effect`, `watch`, `batch`, `store`, `untrack`, `scope`, `writable`, `derived`, `isSignal`

**When to use:** Fine-grained reactivity without a framework. Powers Craft templates. Works in any TS/JS environment including Node, Deno, and SSR.

**Related:** [Craft](/craft/) · [Forge](/forge/) · [Relay](/relay/)

</details>

**Ripple** is a tiny, zero-dependency reactive library that unifies two complementary primitives:

- **Signals** — fine-grained reactive values (`signal`, `computed`, `effect`, `watch`)
- **Stores** — structured reactive state containers for plain objects (`store`)

Both share the same `.value` access and `watch()` / `effect()` subscription model. A `Store<T>` **is** a `Signal<T>`, so every signal primitive works on stores too.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/ripple
```

```sh [npm]
npm install @vielzeug/ripple
```

```sh [yarn]
yarn add @vielzeug/ripple
```

:::

## Quick Start

### Signals API

```ts
import { signal, computed, effect, watch, batch } from '@vielzeug/ripple';

const count = signal(0);
const doubled = computed(() => count.value * 2);

// Side-effect: runs immediately and re-runs on change
const sub = effect(() => {
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

sub.dispose(); // dispose effect
stopWatch.dispose(); // unsubscribe watch
doubled.dispose(); // dispose computed
```

### Stores API

```ts
import { store, watch, batch, computed } from '@vielzeug/ripple';

const counter = store({ count: 0 });

// Read
console.log(counter.value.count); // 0

// Watch all changes
const stopWatch = watch(counter, (curr, prev) => {
  console.log(`${prev.count} → ${curr.count}`);
});

// Watch a selected slice — use computed() for a derived slice
const countSignal = computed(() => counter.value.count);
watch(countSignal, (count, prev) => {
  console.log('count:', prev, '→', count);
});

// Partial patch
counter.patch({ count: 1 });

// Updater function
counter.update((s) => ({ ...s, count: s.count + 1 }));

// Batch: one notification for all writes
batch(() => {
  counter.patch({ count: 10 });
  counter.update((s) => ({ ...s, count: s.count + 1 }));
});

// Reset to original initial state
counter.reset();

// Clean up
stopWatch.dispose();
countSignal.dispose();
```

## Why Ripple?

Plain variables don't notify anything when they change. Framework-specific stores add boilerplate and coupling.

```ts
// Before — manual notification
let count = 0;
const listeners: Array<() => void> = [];
function setCount(n: number) {
  count = n;
  listeners.forEach((fn) => fn());
}

// After — Ripple signals
import { signal, effect } from '@vielzeug/ripple';
const count = signal(0);
effect(() => console.log(count.value)); // auto-tracks dependencies
count.value = 1; // notifies automatically
```

| Feature                 | Ripple                                       | Zustand | Jotai  | Nanostores |
| ----------------------- | --------------------------------------------- | ------- | ------ | ---------- |
| Bundle size             | <PackageInfo package="ripple" type="size" /> | ~3.5 kB | ~7 kB  | ~2 kB      |
| Framework-agnostic      | ✅                                            | ✅      | React  | ✅         |
| Fine-grained reactivity | ✅                                            | ❌      | ✅     | ✅         |
| Structured stores       | ✅                                            | ✅      | Manual | ❌         |
| Zero dependencies       | ✅                                            | ❌      | ❌     | ✅         |

**Use Ripple when** you need fine-grained reactivity without framework lock-in, or when building web components and vanilla JS apps.

**Consider alternatives when** you need DevTools integration (Zustand), React Suspense support (Jotai), or server-side stores.

## Features

### Signals

- **`signal(value, options?)`** — reactive atom; read `.value`, write `.value = next`; use `untrack(fn)` for non-subscribing reads
- **`computed(fn, options?)`** — lazy derived signal; glitch-free: effects always observe a consistent snapshot; call `.dispose()` to stop tracking
- **`effect(fn)`** — side-effect that re-runs when any signal read inside it changes; returns a `Subscription`
- **`watch(source, cb, options?)`** — explicit subscription that fires only when the value changes; returns a `Subscription`
- **`batch(fn)`** — flush all notifications once after bulk updates
- **`untrack(fn)`** — read signals inside an effect without creating subscriptions
- **`onCleanup(fn)`** — register teardown from inside an effect or `scope` without using the return value
- **`scope()`** — isolated cleanup context; collect teardown via `onCleanup` inside `scope.run(fn)`; release everything with `scope.dispose()`
- **`isSignal(v)`** — type guard

### Stores

- **`store(init)`** — structured reactive object container
- **`.patch(partial)`** — shallow-merge a `Partial<T>` into state
- **`.update(fn)`** — derive next state from current via an updater function
- **`.reset()`** — restore the initial state baseline
- **Zero dependencies** — no supply chain risk; < 2 kB gzipped

### Ergonomics

- **`Subscription`** — all dispose handles support `.dispose()`, direct call `()`, and `[Symbol.dispose]` (`using` declarations)
- **`Scope`** — all scope handles support `.dispose()` and `[Symbol.dispose]` (`using` declarations)
- **Built-in loop guard** — internal protection against infinite reactive loops (100 iterations)

### Reliability & Type Safety

- **Strict signal detection** — `isSignal()` uses an internal symbol marker, not duck-typing
- **Glitch-free propagation** — computed signals propagate in dependency order; effects always observe a consistent snapshot
- **Consistent error handling** — all errors prefixed with `[ripple]` and aggregated when multiple occur
- **Infinite loop detection** — built-in guard against effect re-entry cycles (100 iterations)
- **Automatic computed disposal** — `computed()` created inside `effect()` auto-disposes with the effect

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Route](/route/)
- [Forge](/forge/)
- [Relay](/relay/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
