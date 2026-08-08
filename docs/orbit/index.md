---
title: Orbit — Floating UI positioning
description: Dependency-free floating positioning with lifecycle-owned geometry and middleware.
package: orbit
category: ui
keywords: [positioning, tooltip, popover, dropdown, middleware, floating-ui]
exports: [autoUpdate, computePosition, createPositioner]
related: [ore, refine, prism]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="orbit" />

## Why Orbit?

Floating UI needs one owner for CSS coordinates, clipping boundaries, updates, and cleanup. Orbit provides a lifecycle positioner for normal UI and a pure computation API for advanced integrations.

```ts
// Before
const { x, y } = computeSomehow(trigger, panel);
panel.style.left = `${x}px`;
panel.style.top = `${y}px`;

// After
const positioner = createPositioner(trigger, panel);
positioner.start();
```

| Feature | Manual DOM positioning | Orbit |
| --- | --- | --- |
| Bundle size | 0 B | <PackageInfo package="orbit" type="size" /> |
| Root dependencies | Application-defined | <ore-icon name="check" size="16"></ore-icon> |
| Clipping boundary | Manual geometry | `clippingAncestors` default |
| Coordinate strategy | Consumer logic | `fixed` / `absolute` |
| Cleanup | Manual listeners | `dispose()` |

<div class="decision-callout">

**Use Orbit when** floating UI needs robust placement, collision handling, or reactive updates.

**Consider direct CSS when** placement is static and never depends on element geometry.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/orbit
```

```sh [npm]
npm install @vielzeug/orbit
```

```sh [yarn]
yarn add @vielzeug/orbit
```

:::

## Quick Start

Start a positioner only after its reference and floating elements mount.

```ts
import { createPositioner, flip, offset, shift } from '@vielzeug/orbit';

const positioner = createPositioner(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

positioner.start();
positioner.dispose();
```

## Features

<div class="features-grid">

- `createPositioner()` — Lifecycle-owned floating positioning
- `computePosition()` — Low-level calculation for advanced integrations
- `autoUpdate()` — Scroll, viewport, resize, and animation-frame updates
- Middleware — Offset, flip, shift, size, hide, arrow, inline, auto-placement
- `strategy` — Explicit `fixed` or `absolute` coordinate behavior
- `/reactive` — Optional Ripple position readable

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

- [Refine](/refine/) — Accessible components using floating UI behavior.
- [Ore](/ore/) — Lifecycle ownership for custom-element positioning.
- [Prism](/prism/) — Chart tooltips positioned from virtual references.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
