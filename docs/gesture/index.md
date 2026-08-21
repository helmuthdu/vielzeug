---
title: Gesture — Pointer pan primitives
description: Framework-neutral one-axis pointer pan recognition with lifecycle-owned handles.
package: gesture
category: input
keywords: [pointer, pan, swipe, gesture, touch, drag]
exports: [createPanGesture]
related: [refine, dnd, keymap]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="gesture" />

## Why Gesture?

Pointer-driven interfaces need reliable movement tracking without coupling input recognition to rendering or product-specific thresholds.

```ts
// Before
element.addEventListener('pointermove', (event) => {
  // Coordinate tracking, pointer identity, direction locking, and cleanup
});

// After
const pan = createPanGesture(element, {
  axis: 'x',
  onMove: ({ distance }) => render(distance),
  onEnd: ({ distance, reason }) => finish(distance, reason),
});
```

| Feature | Ad-hoc pointer handling | Gesture |
| --- | --- | --- |
| Bundle size | n/a | <PackageInfo package="gesture" type="size" /> |
| Zero dependencies | n/a | <ore-icon name="check" size="16"></ore-icon> |
| Axis intent recognition | Manual | Built in |
| Pointer ownership | Manual | Tracked across the document |
| Lifecycle cleanup | Manual | `dispose()` + `disposalSignal` |

<div class="decision-callout">

**Use Gesture when** several UI surfaces need consistent one-axis pointer tracking while retaining their own completion rules.

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

const pan = createPanGesture(element, {
  axis: 'x',
  onMove: ({ distance }) => {
    element.style.transform = `translateX(${distance}px)`;
  },
  onEnd: ({ distance, reason }) => {
    element.style.transform = '';

    if (reason === 'release' && Math.abs(distance) >= 48) {
      dismiss();
    }
  },
});
```

## Features

<div class="features-grid">

- `createPanGesture()` — one-axis pointer movement tracking
- Direction locking — activates only when movement favors the configured axis
- Configurable pointer capture — own the pointer by default or preserve native targeting
- Consumer-owned policy — thresholds, snapping, and outcomes stay in application code
- Stable completion — one `onEnd` callback for release and cancellation
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

- [Refine](/refine/) — components that use pan recognition for carousel, drawer, toast, and list interactions.
- [Dnd](/dnd/) — drag-and-drop behavior with drop targets and reordering.
- [Keymap](/keymap/) — keyboard interaction primitives for complementary input paths.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
