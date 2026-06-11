---
title: Orbit — Lightweight floating element positioning
description: Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.
package: orbit
category: ui
keywords: [floating-ui, tooltip, popover, dropdown, positioning, middleware, placement, presets]
related: [craft, sigil, grip]
exports:
  [
    float,
    computePosition,
    computeOnce,
    autoUpdate,
    detectOverflow,
    offset,
    flip,
    shift,
    arrow,
    size,
    hide,
    autoPlacement,
    compose,
    limitShift,
    getAlignment,
    getSide,
  ]
environments: [browser, ssr]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="orbit" />

## Why Orbit?

Positioning floating UI by hand quickly turns into repeated math for viewport boundaries, arrow offsets, and scroll/resize tracking.

| Feature                  | Orbit                                       | Floating UI | Popper  |
| ------------------------ | ------------------------------------------- | ----------- | ------- |
| Bundle size              | <PackageInfo package="orbit" type="size" /> | ~10 kB      | ~6 kB   |
| Middleware pipeline      | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>          | <sg-icon name="check" size="16"></sg-icon>      |
| Direct compute API       | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>          | <sg-icon name="check" size="16"></sg-icon>      |
| High-level follow API    | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>          | Partial |
| Inline anchor middleware | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>          | <sg-icon name="x" size="16"></sg-icon>      |
| Auto-update helpers      | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>          | <sg-icon name="check" size="16"></sg-icon>      |
| Framework agnostic       | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>          | <sg-icon name="check" size="16"></sg-icon>      |
| Zero dependencies        | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>          | <sg-icon name="check" size="16"></sg-icon>      |

<div class="decision-callout">

**Use Orbit when** you want a lightweight, DOM-first positioning engine with direct control and no framework adapter requirements.

**Consider larger alternatives when** you need their existing integration ecosystem or migration compatibility.

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

Use `float()` for the common case — it writes `left`/`top` and keeps the position in sync. It returns a `FloatHandle`; always call `handle.cleanup()` on teardown.

```ts
import { flip, float, offset, shift } from '@vielzeug/orbit';

const trigger = document.querySelector<HTMLElement>('#trigger')!;
const tooltip = document.querySelector<HTMLElement>('#tooltip')!;

const handle = float(trigger, tooltip, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

// Call cleanup when the tooltip is removed
handle.cleanup();
```

Or use `presets` for ready-made middleware stacks:

```ts
import { float } from '@vielzeug/orbit';
import { tooltip as tooltipPreset } from '@vielzeug/orbit/presets';

const handle = float(trigger, tooltip, tooltipPreset());
handle.cleanup();
```

## Features

<div class="features-grid">

- `float()` covers the common position-and-follow case; returns a `FloatHandle` with `cleanup()`, `update()`, and `getPosition()`
- Custom `apply(result)` callback on `float()` for transforms or custom rendering
- `computePosition()` returns `x`, `y`, `placement`, and `middlewareData` without touching the DOM
- `detectOverflow()` returns per-side overflow offsets; used by built-in middleware and available for custom middleware
- Global `boundary` and `padding` on `computePosition()` and `float()` — set once, all overflow-aware middleware inherit them
- `containingBlock` option for `position: absolute` floating elements
- Built-in middleware: `offset`, `flip`, `autoPlacement`, `shift`, `size`, `arrow`, `hide`
- `compose()` — validates middleware ordering at call time and returns a typed array
- `limitShift()` — constrains `shift()` drift to keep the float visually connected to its reference
- `inline` middleware (sub-path `@vielzeug/orbit/inline`) for multi-line inline references
- Pre-configured presets (sub-path `@vielzeug/orbit/presets`): `tooltip`, `dropdown`, `popover`, `contextMenu`
- `autoUpdate()` supports scroll, resize, ResizeObserver, visualViewport, animation frames, throttle, ancestor scroll containers, and `pauseWhenHidden` via IntersectionObserver
- `getSide()` and `getAlignment()` utilities for reading placement components
- CSS Anchor Positioning progressive enhancement via `preferCssAnchor` on `float()`
- Reactive signal adapter (sub-path `@vielzeug/orbit/reactive`) — wraps `float()` with a `@vielzeug/ripple` signal
- SSR-safe no-op stubs (sub-path `@vielzeug/orbit/ssr`)
- Zero dependencies (optional peer: `@vielzeug/ripple` for the reactive sub-path)

</div>


## Sub-paths

| Import                     | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `@vielzeug/orbit`          | Core API, middleware, utilities, types        |
| `@vielzeug/orbit/presets`  | Pre-configured middleware stacks              |
| `@vielzeug/orbit/inline`   | `inline` middleware for multi-line references |
| `@vielzeug/orbit/reactive` | Reactive signal adapter (`@vielzeug/ripple`)  |
| `@vielzeug/orbit/devtools` | Visual debug overlay (development only)       |
| `@vielzeug/orbit/ssr`      | No-op stubs for server-side rendering         |

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Sigil](/sigil/) — accessible web components that use Orbit internally for dropdown, tooltip, and popover positioning
- [Grip](/grip/) — drag-and-drop engine; use Orbit to reposition drop targets and drag previews relative to containers
- [Craft](/craft/) — web-component authoring framework; Orbit integrates as a positioning primitive for overlay elements

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
