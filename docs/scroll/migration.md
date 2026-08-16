---
title: Scroll Migration
---

[[toc]]

## Scroll 2 Changes

Scroll 2 removes deprecated reactive wrappers, adds keyboard navigation and auto-measurement features, and improves type consistency across all factories.

Removed exports:
- `createReactiveVirtualizer()`
- `createReactiveGroupedVirtualizer()`
- `ReactiveVirtualizer` (type)
- `ReactiveGroupVirtualizer` (type)

Added options:
- `keyboardScroll?: boolean` — Enable keyboard navigation (Arrow/Page/Home/End keys)
- `autoMeasure?: boolean` — Automatically measure visible items via ResizeObserver
- `signal?: (init: State) => Signal<State>` — Provide reactive signal support across all factories

## Migrate from Reactive Wrappers to Signal Option

Scroll 1's `createReactiveVirtualizer()` and `createReactiveGroupedVirtualizer()` are removed. Use the new `signal` option on any factory instead.

```ts
// Scroll 1
import { createReactiveVirtualizer } from '@vielzeug/scroll';
import { effect } from '@vielzeug/ripple';

const virt = createReactiveVirtualizer(scrollEl, { count: 1000 });
effect(() => {
  const { items, totalSize } = virt.state.value;
  // render...
});

// Scroll 2
import { createVirtualizer } from '@vielzeug/scroll';
import { signal, effect } from '@vielzeug/ripple';

const stateSignal = signal({ items: [], stickyItems: [], totalSize: 0 });
const virt = createVirtualizer(scrollEl, {
  count: 1000,
  signal: () => stateSignal,
});
effect(() => {
  const { items, totalSize } = stateSignal.value;
  // render...
});
```

The pattern now applies consistently to all factories:

```ts
// Works with createDomVirtualList, createGroupedVirtualizer, createGridVirtualizer, etc.
const virt = createDomVirtualList({
  items,
  scrollElement,
  listElement,
  signal: () => signal({ items: [], stickyItems: [], totalSize: 0 }),
});
```

Advantages of the signal option over reactive wrappers:
- Single pattern works for all factories
- Explicit signal creation in user code (easier to understand)
- `onChange` callback still works alongside signal
- No metaprogramming required under the hood

## Enable Keyboard Navigation

Scroll 2 adds keyboard support to all factories via the `keyboardScroll` option.

```ts
const virt = createVirtualizer(scrollEl, {
  count: 1000,
  keyboardScroll: true,
});
```

Supported keys:
- Arrow Up/Down — Scroll by one estimated item size
- Arrow Left/Right (horizontal lists) — Same
- Page Up/Down — Scroll by ~80% of viewport
- Home — Jump to start
- End — Jump to end

## Enable Auto-Measurement

Scroll 2 adds automatic item measurement for dynamic content via the `autoMeasure` option.

```ts
const virt = createVirtualizer(scrollEl, {
  count: 1000,
  autoMeasure: true, // Auto-measure visible items
  onChange: ({ items, totalSize }) => {
    // Ensure every rendered item has data-vz-key attribute
    for (const item of items) {
      const el = listEl.querySelector(`[data-vz-key="${getItemKey(item.index)}"]`);
      if (!el) continue;
      // el is automatically measured via ResizeObserver
    }
  },
});
```

Requirements:
- Every rendered item must have a `data-vz-key` attribute
- Must use a DOM scroll target (not `Window`)
- Auto-measurement is disabled in Window scroll mode

## Scroll 1 → Scroll 2 Compatibility

All Scroll 1 code continues working unchanged:
- Static validation remains
- Callback updates via `update()` work as before
- `scrollToIndex()`, `scrollToRow()`, `scrollToColumn()` unchanged
- Measurement API unchanged
- Sticky headers and grouped sections unchanged
- Grid virtualization unchanged
