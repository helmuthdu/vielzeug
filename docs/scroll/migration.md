---
title: 'Scroll: Migration'
description: Migrate through Scroll 3.1 keyboard-handler removal and Scroll 3 framework-neutral external-store contract.
---

[[toc]]

## Scroll 3.1 Changes

Scroll 3.1 removes the `keyboardScroll` option and renames `ScrollConfigurationError` to `ScrollConfigError`, matching the `<Pkg>ConfigError` convention used across the monorepo. Catch the base `ScrollError` to stay version-agnostic:

```ts
// Before
if (error instanceof ScrollConfigurationError) {
  /* ... */
}

// After
if (error instanceof ScrollConfigError) {
  /* ... */
}
```

The built-in handler hardcoded its own Arrow/Page/Home/End table, ignored modifier keys (Ctrl+ArrowDown scrolled anyway), and called `preventDefault()` unconditionally. Keyboard scrolling is navigation policy: compose it from the public `scrollToIndex()` API and your own key handling: `matchKey` from `@vielzeug/keymap` gives the same aliases and exact modifier semantics as the rest of the app:

```ts
// Before
const virt = createVirtualizer(scrollEl, { count, estimateSize: 36, keyboardScroll: true });

// After
import { matchKey } from '@vielzeug/keymap';

let focusedIndex = 0;
scrollEl.addEventListener('keydown', (event) => {
  if (matchKey(event, 'ArrowDown')) focusedIndex = Math.min(focusedIndex + 1, count - 1);
  else if (matchKey(event, 'ArrowUp')) focusedIndex = Math.max(focusedIndex - 1, 0);
  else return;
  event.preventDefault();
  virt.scrollToIndex(focusedIndex, { align: 'auto' });
});
```

## Scroll 3 Changes

Scroll 3 removes the `toSignal` option and the runtime dependency on `@vielzeug/ripple`. Every controller now implements `ScrollStore<State>` with `getSnapshot()` and `subscribe()`.

Affected factories:

- `createVirtualizer()`
- `createDomVirtualList()`
- `createVirtualScroller()`
- `createGroupedVirtualizer()`
- `createGridVirtualizer()`

The rendering callbacks, measurement APIs, scrolling methods, and disposal contracts are unchanged.

## Replace `toSignal` with `fromSubscribable`

Pass the controller to Ripple instead of injecting a Ripple signal into Scroll.

```ts
// Scroll 2
import { effect, signal } from '@vielzeug/ripple';
import { createVirtualizer } from '@vielzeug/scroll';

const state = signal({ items: [], stickyItems: [], totalSize: 0 });
const virt = createVirtualizer(scrollEl, {
  count: 1000,
  toSignal: () => state,
});
const renderEffect = effect(() => render(state.value));
```

```ts
// Scroll 3
import { effect, fromSubscribable } from '@vielzeug/ripple';
import { createVirtualizer } from '@vielzeug/scroll';

const virt = createVirtualizer(scrollEl, { count: 1000 });
const state = fromSubscribable(virt, { signal: virt.disposalSignal });
const renderEffect = effect(() => render(state.value));
```

Dispose application-owned effects before the virtualizer:

```ts
renderEffect.dispose();
virt.dispose();
```

The same bridge accepts DOM, grouped, and grid controllers because each implements the same structural contract.

## Use the External Store Directly

You do not need a reactive runtime to observe state.

```ts
const virt = createVirtualizer(scrollEl, { count: 1000 });
const unsubscribe = virt.subscribe(() => {
  render(virt.getSnapshot());
});

render(virt.getSnapshot());

unsubscribe();
virt.dispose();
```

`subscribe()` does not invoke the listener immediately. Read `getSnapshot()` once for the initial render, or use a framework adapter that reads the snapshot during subscription setup.

## Keep `onChange` for Imperative Rendering

`onChange` remains the shortest path when one callback owns rendering.

```ts
const virt = createVirtualizer(scrollEl, {
  count: 1000,
  onChange: render,
});
```

Use `subscribe()` when multiple consumers need the state or when integrating with an external-store API. Use `onChange` for a single imperative render callback.

## Dependency Changes

Scroll no longer installs Ripple. Applications that use `fromSubscribable()` must declare `@vielzeug/ripple` directly.

```sh
pnpm add @vielzeug/scroll @vielzeug/ripple
```

Applications that use callbacks or the external-store contract directly only need Scroll:

```sh
pnpm add @vielzeug/scroll
```

## Scroll 2 Changes

Scroll 2 removed `createReactiveVirtualizer()`, `createReactiveGroupedVirtualizer()`, `ReactiveVirtualizer`, and `ReactiveGroupVirtualizer`. Replace those wrappers with the Scroll 3 external-store pattern above.

Scroll 2 also added:

- `keyboardScroll?: boolean` (removed in Scroll 3.1: compose keyboard scrolling from `scrollToIndex()` and your own key handling)
- `autoMeasure?: boolean`
- `dispose()` and `[Symbol.dispose]()` lifecycle consistency

Those APIs remain available in Scroll 3.
