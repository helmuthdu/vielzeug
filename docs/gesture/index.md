---
title: Gesture — Pointer swipe primitives
description: Framework-neutral pointer swipe recognition with lifecycle-owned handles.
package: gesture
category: input
keywords: [pointer, swipe, gesture, touch, drag]
exports: [createSwipeGesture]
related: [refine, dnd, keymap]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="gesture" />

## Why Gesture?

Pointer swipe behavior should be reusable without owning rendering or UI state. Gesture keeps recognition separate from animation, dismissal, reveal, and navigation logic.

```ts
// Before
element.addEventListener('pointermove', (event) => {
  // local threshold and distance logic
});

// After
const swipe = createSwipeGesture({ onCommit: ({ distance }) => dismiss(distance) });
swipe.mount(element);
```

| Feature | Ad-hoc per component | Gesture |
| --- | --- | --- |
| Bundle size | n/a | <PackageInfo package="gesture" type="size" /> |
| Zero dependencies | n/a | <ore-icon name="check" size="16"></ore-icon> |
| Pointer identity guard | Manual | Built in |
| Lifecycle cleanup | Manual listeners/state | `dispose()` + `disposalSignal` |
| Progress normalization | Custom per component | `progress` in detail |

<div class="decision-callout">

**Use Gesture when** multiple UI surfaces need consistent swipe recognition.

**Consider direct pointer handling when** behavior is one-off and does not need a reusable handle.

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
import { createSwipeGesture } from '@vielzeug/gesture';

const swipe = createSwipeGesture({
  axis: 'x',
  onCommit: ({ distance }) => {
    if (distance < 0) goNext();
    else goPrevious();
  },
});

swipe.mount(element);
```

## Features

<div class="features-grid">

- `createSwipeGesture()` — one-axis pointer swipe recognition
- `shouldStart` and `shouldCommit` — consumer-controlled admission and completion
- `progress` and signed `distance` — normalized gesture metrics
- Pointer capture policy — explicit target or disabled capture
- Lifecycle ownership — `dispose()`, `disposed`, and `disposalSignal`

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Refine](/refine/) — overlay and list components using swipe interactions.
- [Dnd](/dnd/) — drag-and-drop behavior that remains separate from swipe recognition.
- [Keymap](/keymap/) — keyboard interaction primitives for complementary input paths.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
