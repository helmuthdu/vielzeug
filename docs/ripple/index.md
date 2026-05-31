---
title: Ripple — Reactive signals and state management
description: Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.
package: ripple
category: state
keywords: [reactive, signals, computed, effects, store, observable, fine-grained, watch, batch, scope, lens, async, history]
related: [craft, forge, herald]
exports: [signal, computed, effect, effectAsync, asyncComputed, watch, batch, store, storeWithHistory, untrack, scope, asyncScope, onCleanup, readonly, traceEffect, isSignal, isComputed, isStore, installDevTools]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="ripple" />

<img src="/logo-ripple.svg" alt="Ripple logo" width="156" class="logo-highlight"/>

# Ripple

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/ripple` &nbsp;·&nbsp; **Category:** State

**Key exports:** `signal`, `computed`, `effect`, `effectAsync`, `asyncComputed`, `watch`, `batch`, `store`, `storeWithHistory`, `untrack`, `scope`, `asyncScope`, `onCleanup`, `readonly`, `traceEffect`, `isSignal`, `isComputed`, `isStore`, `installDevTools`

**When to use:** Fine-grained reactivity without a framework. Powers Craft templates. Works in any TS/JS environment including Node, Deno, and SSR.

**Related:** [Craft](/craft/) · [Forge](/forge/) · [Herald](/herald/)

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

```ts
import { signal, computed, effect, watch, batch } from '@vielzeug/ripple';

const count = signal(0);
const doubled = count.map((n) => n * 2);     // returns ComputedSignal<number>

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
  count.value = 20; // one notification fires with the final value
});

sub.dispose();
stopWatch.dispose();
doubled.dispose();
```

```ts
import { store, watch, batch } from '@vielzeug/ripple';

const counter = store({ count: 0, label: 'counter' });

// Read
console.log(counter.value.count); // 0

// Watch a typed lens — only fires when that path changes
const countLens = counter.lens('count');      // Signal<number>
const stopWatch = watch(countLens, (next, prev) => {
  console.log('count:', prev, '→', next);
});

// Derived slice via combinator
const label = counter.map((s) => s.label);   // ComputedSignal<string>

// Mutations
counter.patch({ count: 1 });                 // shallow merge
counter.replace((s) => ({ ...s, count: s.count + 1 })); // replace via fn
countLens.value = 10;                        // write directly through the lens

batch(() => {
  counter.patch({ count: 5 });
  counter.patch({ label: 'done' });
});

counter.reset();
stopWatch.dispose();
label.dispose();
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

- **`signal(value, options?)`** — reactive atom; read `.value`, write `.value = next`; `batched: true` coalesces rapid writes into one microtask notification
- **`computed(fn, options?)`** — lazy derived signal; glitch-free; `computed([a, b], fn)` overload for explicit dep arrays with no auto-tracking
- **`effect(fn, options?)`** — side-effect that re-runs when dependencies change; options: `scheduler`, `maxIterations`, `name`
- **`effectAsync(fn, options?)`** — async side-effect with an `AbortSignal` that fires on re-run or dispose
- **`asyncComputed(factory, options?)`** — reactive async computed; exposes `{ status, value, error }` lifecycle state; factory receives an `AbortSignal`
- **`watch(source, cb, options?)`** — explicit subscription that fires only when the value changes; returns a `Subscription`
- **`batch(fn, options?)`** — flush all notifications once after bulk updates; `maxIterations` option for loop guard
- **`untrack(fn)`** — read signals inside an effect without creating subscriptions
- **`onCleanup(fn)`** — register teardown from inside an effect or `scope` without using the return value
- **`scope(setup?)`** — isolated cleanup context; collect teardown via `onCleanup` inside `scope.run(fn)`; release with `scope.dispose()`
- **`asyncScope(setup)`** — async variant of `scope()`; captures cleanups from the synchronous preamble before the first `await`
- **`readonly(source)`** — wraps any signal as a `ComputedSignal` — read-only at the type level
- **`traceEffect(fn, options?)`** — like `effect()`, but logs changed reactive sources to the console before each re-run
- **`isSignal(v)`**, **`isComputed(v)`**, **`isStore(v)`** — type guards using an internal symbol marker
- **`.map<U>(fn, options?)`** — combinator on all signal types; creates a derived `ComputedSignal<U>`
- **`.filter(predicate)`** — combinator on all signal types; creates a `ComputedSignal<T | undefined>` via a predicate
- **`store(init, options?)`** — structured reactive object container
- **`.patch(partial)`** — shallow-merge a `Partial<T>` into state
- **`.replace(fn)`** — derive next state from current via a function; same-reference return is a no-op
- **`.reset()`** — restore the initial state baseline
- **`.lens<P>(path)`** — cached writable `Signal` for a property or dot-path; writes produce an immutable copy
- **`storeWithHistory(init, options?)`** — store with snapshot history; `undo()`, `redo()`, `historyAt(i)`, `historyLength`
- **`installDevTools(hook)`** — install a global `__RIPPLE_DEVTOOLS__` hook to observe signal writes, effect runs, and computed recomputes
- **Glitch-free propagation** — computed signals propagate in dependency order; effects always observe a consistent snapshot
- **Infinite loop detection** — built-in guard against effect re-entry cycles (100 iterations default, configurable per effect)
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

- [Craft](/craft/) — web-component authoring framework built on ripple
- [Forge](/forge/) — typed form state that uses signals for field reactivity and submission tracking
- [Herald](/herald/) — typed event bus; use alongside ripple for cross-module messaging without shared signals

<!-- markdownlint-enable MD025 MD033 MD060 -->
