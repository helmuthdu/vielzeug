---
title: Gesture — Pointer movement primitives
description: Framework-neutral two-dimensional pointer drag and one-axis pan recognition with lifecycle-owned handles.
package: gesture
category: input
keywords: [pointer, pan, swipe, gesture, touch, drag]
exports: [createDragGesture, createPanGesture]
related: [refine, dnd, keymap]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="gesture" />

## Why Gesture?

Pointer-driven interfaces need reliable one-pointer movement tracking without coupling recognition to rendering, drag-and-drop semantics, or product-specific completion policy.

```ts
// Before
element.addEventListener('pointermove', (event) => {
  // Coordinate tracking, pointer identity, direction locking, and cleanup
});

// After
import { createPanGesture } from '@vielzeug/gesture';

const pan = createPanGesture(element, {
  axis: 'x',
  onMove: ({ distance }) => console.log('distance', distance),
  onEnd: ({ reason }) => console.log('ended', reason),
});
```

| Feature | Gesture | Ad-hoc pointer handling |
| --- | --- | --- |
| Bundle size | <PackageInfo package="gesture" type="size" /> | n/a |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon> | n/a |
| Two-dimensional drag tracking | Built in | Manual |
| Axis intent recognition | Built in | Manual |
| Pointer ownership | Tracked across the document | Manual |
| Lifecycle cleanup | `dispose()` + `disposalSignal` | Manual |

<div class="decision-callout">

**Use Gesture when** UI surfaces need consistent free drag or axis-locked pan tracking while retaining their own rendering and completion rules.

**Consider direct pointer handling when** the interaction is isolated and does not need reusable lifecycle or direction-lock behavior.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/gesture
```

```sh [npm]
npm install @vielzeug/gesture
```

```sh [yarn]
yarn add @vielzeug/gesture
```

:::

## Quick Start

```ts
import { createPanGesture } from '@vielzeug/gesture';

const element = document.querySelector<HTMLElement>('[data-swipe]');
if (!element) throw new Error('Missing [data-swipe] element');

const pan = createPanGesture(element, {
  axis: 'x',
  onMove: ({ distance }) => {
    element.style.transform = `translateX(${distance}px)`;
  },
  onEnd: ({ distance, reason }) => {
    element.style.transform = '';
    if (reason === 'release' && Math.abs(distance) >= 48) {
      pan.dispose();
      element.remove();
    }
  },
});

window.addEventListener('pagehide', () => pan.dispose(), { once: true });
```

## Features

<div class="features-grid">

- `createDragGesture()` — unrestricted two-dimensional pointer movement tracking
- `createPanGesture()` — one-axis pointer movement with direction intent recognition
- Direction locking — activates only when movement favors the configured axis
- Configurable pointer capture — own the pointer by default or preserve native targeting
- Configurable `activationDistance` — tune slop for touch density and component needs
- Consumer-owned policy — completion thresholds, snapping, and outcomes stay in application code
- Stable completion — one `onEnd` callback for release and cancellation
- Lifecycle ownership — `dispose()`, `disposed`, `disposalSignal`, optional owner `signal`, and `[Symbol.dispose]()`

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Refine](/refine/) — components that use pan recognition for carousel, drawer, toast, and list interactions.
- [Dnd](/dnd/) — builds touch sorting on `createDragGesture()` and adds files, previews, drop targets, keyboard reordering, and connected-list transactions.
- [Keymap](/keymap/) — keyboard interaction primitives for complementary input paths.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
