---
title: Ripple — Reactive signals and state management
description: Tiny, type-safe reactive primitives — signals, effects, computed values, and object stores. Zero dependencies, works everywhere.
package: ripple
category: state
keywords:
  [reactive, signals, computed, effects, store, observable, fine-grained, watch, batch, scope, lens, async, history]
related: [craft, forge, herald]
exports:
  [
    signal,
    computed,
    effect,
    effectAsync,
    resource,
    asyncComputed,
    watch,
    batch,
    store,
    storeWithHistory,
    untrack,
    scope,
    onCleanup,
    readonly,
    derive,
    filter,
    selector,
    isSignal,
    isComputed,
    isStore,
    getDevToolsHook,
    StateError,
    StateErrorCode,
    Accessor,
    ResourceSignal,
    ResourceOptions,
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
| Zero dependencies            | <sg-icon name="check" size="16"></sg-icon>                        | <sg-icon name="x" size="16"></sg-icon>               | <sg-icon name="x" size="16"></sg-icon>             | <sg-icon name="check" size="16"></sg-icon>        |
| Framework-agnostic           | <sg-icon name="check" size="16"></sg-icon>                        | <sg-icon name="check" size="16"></sg-icon>           | React-first                                        | <sg-icon name="check" size="16"></sg-icon>        |
| Fine-grained reactivity      | <sg-icon name="check" size="16"></sg-icon> (per-property)         | <sg-icon name="x" size="16"></sg-icon> (whole store) | <sg-icon name="check" size="16"></sg-icon>         | <sg-icon name="check" size="16"></sg-icon> (atom) |
| Structured object stores     | <sg-icon name="check" size="16"></sg-icon> (`store`, `lens`)      | <sg-icon name="check" size="16"></sg-icon>           | Manual atoms                                       | <sg-icon name="x" size="16"></sg-icon>            |
| Async computed               | <sg-icon name="check" size="16"></sg-icon> (`asyncComputed`)      | Manual                                               | <sg-icon name="check" size="16"></sg-icon>         | <sg-icon name="x" size="16"></sg-icon>            |
| Undo / redo history          | <sg-icon name="check" size="16"></sg-icon> (`storeWithHistory`)   | Manual                                               | <sg-icon name="x" size="16"></sg-icon>             | <sg-icon name="x" size="16"></sg-icon>            |
| Computed signals             | <sg-icon name="check" size="16"></sg-icon> (lazy, glitch-free)    | Selectors                                            | <sg-icon name="check" size="16"></sg-icon> (atoms) | <sg-icon name="check" size="16"></sg-icon>        |
| Batched writes               | <sg-icon name="check" size="16"></sg-icon> (`batch`)              | <sg-icon name="check" size="16"></sg-icon>           | <sg-icon name="check" size="16"></sg-icon>         | <sg-icon name="check" size="16"></sg-icon>        |
| Explicit cleanup / scopes    | <sg-icon name="check" size="16"></sg-icon> (`scope`, `onCleanup`) | <sg-icon name="x" size="16"></sg-icon>               | <sg-icon name="x" size="16"></sg-icon>             | <sg-icon name="x" size="16"></sg-icon>            |
| SSR support                  | <sg-icon name="check" size="16"></sg-icon>                        | <sg-icon name="check" size="16"></sg-icon>           | <sg-icon name="check" size="16"></sg-icon>         | <sg-icon name="check" size="16"></sg-icon>        |
| TypeScript — strict generics | <sg-icon name="check" size="16"></sg-icon>                        | <sg-icon name="check" size="16"></sg-icon>           | <sg-icon name="check" size="16"></sg-icon>         | Partial                                           |
| React Suspense               | <sg-icon name="x" size="16"></sg-icon>                            | <sg-icon name="x" size="16"></sg-icon>               | <sg-icon name="check" size="16"></sg-icon>         | <sg-icon name="x" size="16"></sg-icon>            |
| Redux DevTools               | <sg-icon name="x" size="16"></sg-icon>                            | <sg-icon name="check" size="16"></sg-icon>           | <sg-icon name="x" size="16"></sg-icon>             | <sg-icon name="x" size="16"></sg-icon>            |

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
import { signal, derive, effect, watch, batch } from '@vielzeug/ripple';

const count = signal(0);
const doubled = derive(count, (n) => n * 2); // ComputedSignal<number>

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
const label = computed(() => counter.value.label); // ComputedSignal<string>

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

- **`signal(value, options?)`** — reactive atom; read `.value`, write `.value = next`; `batched: true` coalesces rapid writes into one microtask notification
- **`computed(fn, options?)`** — lazy derived signal; glitch-free; auto-tracks dependencies read inside `fn`
- **`effect(fn, options?)`** — side-effect that re-runs when dependencies change; options: `scheduler` (`'sync'` | `'microtask'` | custom fn), `maxIterations`, `name`
- **`effectAsync(fn, options?)`** — async side-effect with an `AbortSignal` that fires on re-run or dispose; returns `AsyncSubscription` with `[Symbol.asyncDispose]`
- **`resource(factory, options?)`** — preferred name for async computed; exposes `.data`, `.error`, `.isLoading` signals; factory receives an `AbortSignal`
- **`asyncComputed(factory, options?)`** — same as `resource()`; kept for compatibility
- **`watch(source, cb, options?)`** — explicit subscription that fires only when the value changes; returns a `Subscription`
- **`batch(fn)`** — flush all notifications once after bulk updates
- **`untrack(fn)`** — read signals inside an effect without creating subscriptions
- **`onCleanup(fn)`** — register teardown from inside an effect or `scope` without using the return value
- **`scope(setup?)`** — isolated cleanup context; collect teardown via `onCleanup` inside `scope.run(fn)`; release with `scope.dispose()`
- **`derive(source, project, options?)`** — project a reactive source into a `ComputedSignal`; cleaner alternative to `selector(source, project)`
- **`filter(source, predicate, options?)`** — filter a reactive source; returns value when predicate is `true`, `undefined` otherwise; type-predicate overload narrows `T → U | undefined`
- **`selector(source, project, predicate?, options?)`** — project + optional filter utility; use `derive()` / `filter()` for single-concern cases
- **`readonly(source)`** — wraps any signal as a `ComputedSignal` — read-only at the type level; `dispose()` is always a no-op
- **`debugEffect(fn, options?)`** — like `effect()`, but logs reactive deps on every run; import from `@vielzeug/ripple/devtools` — tree-shaken from production bundles
- **`isSignal(v)`**, **`isComputed(v)`**, **`isStore(v)`** — type guards using an internal symbol marker
- **`store(init, options?)`** — structured reactive object container
- **`.patch(partial)`** — shallow-merge a `Partial<T>` into state
- **`.replace(fn)`** — derive next state from current via a function; same-reference return is a no-op
- **`.reset()`** — restore the initial state baseline
- **`.lens<P>(path)`** — cached writable `Signal` for a property or dot-path; writes produce an immutable copy
- **`storeWithHistory(storeOrInit, options?)`** — store with snapshot history; accepts an existing `Store<T>` (not owned) or a plain object; `undo()`, `redo()`, `historyAt(i)`, `historyLength`; reactive `canUndo`/`canRedo` properties
- **`getDevToolsHook()`** — returns the currently installed DevTools hook, or `null`; install via `@vielzeug/ripple/devtools`
- **Glitch-free propagation** — computed signals propagate in dependency order; effects always observe a consistent snapshot
- **Infinite loop detection** — built-in guard against effect re-entry cycles (100 iterations default, configurable per effect)
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

- [Craft](/craft/) — web-component authoring framework built on ripple
- [Forge](/forge/) — typed form state that uses signals for field reactivity and submission tracking
- [Herald](/herald/) — typed event bus; use alongside ripple for cross-module messaging without shared signals

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
