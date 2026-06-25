---
title: Ripple — Reactive signals and state management
description: Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.
package: ripple
category: state
keywords:
  [reactive, signals, computed, effects, store, observable, fine-grained, watch, batch, scope, lens, async, history]
related: [ore, forge, herald]
exports:
  [
    signal,
    computed,
    effect,
    effectAsync,
    resource,
    watch,
    batch,
    store,
    storeWithHistory,
    untrack,
    scope,
    onCleanup,
    readonly,
    isSignal,
    isComputed,
    isStore,
    getDevToolsHook,
    RippleError,
    RippleComputedCycleError,
    RippleDisposedScopeError,
    RippleEnvironmentError,
    RippleInfiniteLoopError,
    RippleInvalidCleanupError,
    RippleInvalidStoreError,
    ResourceOptions,
    ResourceState,
    HistoryEntry,
    EffectHandle,
    PathValue,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ripple" />

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

| Feature                      | Ripple                                                            | Zustand                                              | Jotai                                              | Nanostores                                        |
| ---------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Bundle size                  | <PackageInfo package="ripple" type="size" />                      | ~3.5 kB                                              | ~7 kB                                              | ~2 kB                                             |
| Zero dependencies            | <ore-icon name="check" size="16"></ore-icon>                        | <ore-icon name="x" size="16"></ore-icon>               | <ore-icon name="x" size="16"></ore-icon>             | <ore-icon name="check" size="16"></ore-icon>        |
| Framework-agnostic           | <ore-icon name="check" size="16"></ore-icon>                        | <ore-icon name="check" size="16"></ore-icon>           | React-first                                        | <ore-icon name="check" size="16"></ore-icon>        |
| Fine-grained reactivity      | <ore-icon name="check" size="16"></ore-icon> (per-property)         | <ore-icon name="x" size="16"></ore-icon> (whole store) | <ore-icon name="check" size="16"></ore-icon>         | <ore-icon name="check" size="16"></ore-icon> (atom) |
| Structured object stores     | <ore-icon name="check" size="16"></ore-icon> (`store`, `lens`)      | <ore-icon name="check" size="16"></ore-icon>           | Manual atoms                                       | <ore-icon name="x" size="16"></ore-icon>            |
| Async computed               | <ore-icon name="check" size="16"></ore-icon> (`resource`)           | Manual                                               | <ore-icon name="check" size="16"></ore-icon>         | <ore-icon name="x" size="16"></ore-icon>            |
| Undo / redo history          | <ore-icon name="check" size="16"></ore-icon> (`storeWithHistory`)   | Manual                                               | <ore-icon name="x" size="16"></ore-icon>             | <ore-icon name="x" size="16"></ore-icon>            |
| Computed signals             | <ore-icon name="check" size="16"></ore-icon> (lazy, glitch-free)    | Selectors                                            | <ore-icon name="check" size="16"></ore-icon> (atoms) | <ore-icon name="check" size="16"></ore-icon>        |
| Batched writes               | <ore-icon name="check" size="16"></ore-icon> (`batch`)              | <ore-icon name="check" size="16"></ore-icon>           | <ore-icon name="check" size="16"></ore-icon>         | <ore-icon name="check" size="16"></ore-icon>        |
| Explicit cleanup / scopes    | <ore-icon name="check" size="16"></ore-icon> (`scope`, `onCleanup`) | <ore-icon name="x" size="16"></ore-icon>               | <ore-icon name="x" size="16"></ore-icon>             | <ore-icon name="x" size="16"></ore-icon>            |
| SSR support                  | <ore-icon name="check" size="16"></ore-icon>                        | <ore-icon name="check" size="16"></ore-icon>           | <ore-icon name="check" size="16"></ore-icon>         | <ore-icon name="check" size="16"></ore-icon>        |
| TypeScript — strict generics | <ore-icon name="check" size="16"></ore-icon>                        | <ore-icon name="check" size="16"></ore-icon>           | <ore-icon name="check" size="16"></ore-icon>         | Partial                                           |
| React Suspense               | <ore-icon name="x" size="16"></ore-icon>                            | <ore-icon name="x" size="16"></ore-icon>               | <ore-icon name="check" size="16"></ore-icon>         | <ore-icon name="x" size="16"></ore-icon>            |
| Redux DevTools               | <ore-icon name="x" size="16"></ore-icon>                            | <ore-icon name="check" size="16"></ore-icon>           | <ore-icon name="x" size="16"></ore-icon>             | <ore-icon name="x" size="16"></ore-icon>            |

<div class="decision-callout">

**Use Ripple when** you need fine-grained, per-property reactivity without framework lock-in — especially for web components, vanilla JS apps, or any environment where you want zero runtime dependencies and explicit lifecycle control.

**Consider alternatives when** you are React-only and need Suspense or React Query integration (Jotai), need Redux DevTools out of the box (Zustand), or need a minimal atom store with no extra features (Nanostores).

</div>

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
const doubled = computed(() => count.value * 2); // Computed<number>

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
import { store, watch, batch, computed } from '@vielzeug/ripple';

const counter = store({ count: 0, label: 'counter' });

// Read
console.log(counter.value.count); // 0

// Watch a typed lens — only fires when that path changes
const countLens = counter.lens('count'); // Signal<number>
const stopWatch = watch(countLens, (next, prev) => {
  console.log('count:', prev, '→', next);
});

// Derived slice
const label = computed(() => counter.value.label); // Computed<string>

// Mutations
counter.patch({ count: 1 }); // shallow merge
counter.replace((s) => ({ ...s, count: s.count + 1 })); // replace via fn
countLens.value = 10; // write directly through the lens

batch(() => {
  counter.patch({ count: 5 });
  counter.patch({ label: 'done' });
});

counter.reset();
stopWatch.dispose();
label.dispose();
```

## Features

<div class="features-grid">

- **`signal(value, options?)`** — reactive atom; read `.value`, write `.value = next`; equality check prevents notification when value is unchanged
- **`computed(fn, options?)`** — lazy derived signal; glitch-free; auto-tracks dependencies read inside `fn`
- **`effect(fn, options?)`** — side-effect that re-runs when dependencies change; returns `EffectHandle` with `getDependencies()`; options: `scheduler` (`'sync'` | `'microtask'`), `name`
- **`effectAsync(fn, options?)`** — async side-effect with an `AbortSignal` that fires on re-run or dispose; returns `AsyncSubscription` with `[Symbol.asyncDispose]`
- **`resource(factory, options?)`** — reactive async data source; emits a `ResourceState<T>` discriminated union (`loading` / `ready` / `error`); factory receives an `AbortSignal` that fires on re-run or dispose
- **`watch(source, cb, options?)`** — explicit subscription that fires only when the value changes; returns a `Subscription`
- **`batch(fn)`** — flush all notifications once after bulk updates
- **`untrack(fn)`** — read signals inside an effect without creating subscriptions
- **`onCleanup(fn)`** — register teardown from inside an effect or `scope` without using the return value
- **`scope(setup?)`** — isolated cleanup context; collect teardown via `onCleanup` inside `scope.run(fn)`; release with `scope.dispose()`
- **`readonly(source)`** — wraps any signal as `Readable<T>` — read-only at the type level; no `dispose()` (caller retains ownership)
- **`debugEffect(fn, options?)`** — like `effect()`, but logs reactive deps on every run; import from `@vielzeug/ripple/devtools` — tree-shaken from production bundles
- **`isSignal(v)`**, **`isComputed(v)`**, **`isStore(v)`** — type guards using an internal symbol marker
- **`store(init, options?)`** — structured reactive object container
- **`.patch(partial)`** — shallow-merge a `Partial<T>` into state
- **`.replace(fn)`** — derive next state from current via a function; same-reference return is a no-op
- **`.reset()`** — restore the initial state baseline
- **`.lens<P>(path)`** — cached writable `Signal` for a property or dot-path; writes produce an immutable copy
- **`storeWithHistory(storeOrInit, options?)`** — store with explicit snapshot history; accepts an existing `Store<T>` (not owned) or a plain object; call `.push()` / `.pushNamed(label)` to save checkpoints; `undo()`, `redo()`, `historyAt(i)` returns `HistoryEntry<T>`; reactive `canUndo` / `canRedo`
- **`getDevToolsHook()`** — returns the currently installed DevTools hook, or `null`; install via `@vielzeug/ripple/devtools`
- **Glitch-free propagation** — computed signals propagate in dependency order; effects always observe a consistent snapshot
- **Infinite loop detection** — built-in guard against effect re-entry cycles (100 iterations default)
- **Automatic computed disposal** — `computed()` created inside `effect()` auto-disposes with the effect

</div>

## Sub-paths

| Import                      | Purpose                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@vielzeug/ripple`          | All exports and types                                                                                    |
| `@vielzeug/ripple/devtools` | `installDevTools`, `debugEffect` — DevTools hook and reactive source tracing (dev-only, tree-shaken)     |
| `@vielzeug/ripple/ssr`      | SSR tracking isolation helpers (`withProvider`, `runWithProvider`, `createAsyncProvider`). Node.js only. |

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ore](/ore/) — web-component authoring framework built on ripple
- [Forge](/forge/) — typed form state that uses signals for field reactivity and submission tracking
- [Herald](/herald/) — typed event bus; use alongside ripple for cross-module messaging without shared signals

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
