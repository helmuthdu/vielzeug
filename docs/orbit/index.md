---
title: Orbit — Lightweight floating element positioning
description: Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.
package: orbit
category: ui
keywords: [floating-ui, tooltip, popover, dropdown, positioning, middleware, placement, presets]
related: [craft, sigil, grip]
exports: [float, computePosition, autoUpdate, offset, flip]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="orbit" />

<img src="/logo-orbit.svg" alt="Orbit logo" width="156" class="logo-highlight"/>

# Orbit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/orbit` &nbsp;·&nbsp; **Category:** Ui Positioning

**Key exports:** `float`, `computePosition`, `autoUpdate`, `offset`, `flip`, `shift`, `arrow`, `size`, `hide`, `autoPlacement`, `inline` (sub-path)

**When to use:** Precise floating element positioning for tooltips, dropdowns, menus, and popovers with middleware pipeline.

**Related:** [Craft](/craft/) · [Sigil](/sigil/) · [Grip](/grip/)

</details>

`@vielzeug/orbit` is a small DOM positioning engine for floating UI. It provides a direct API for computing positions, a high-level follow API, and middleware for collision handling, arrows, hiding, inline text anchors, and dynamic sizing.


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

Use `float()` for the common case — it writes `left`/`top` and keeps the position in sync:

```ts
import { flip, float, offset, shift } from '@vielzeug/orbit';

const trigger = document.querySelector<HTMLElement>('#trigger')!;
const tooltip = document.querySelector<HTMLElement>('#tooltip')!;

// float() calls autoUpdate internally and returns a cleanup function
const cleanup = float(trigger, tooltip, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

// Call cleanup when the tooltip is removed
cleanup();
```

Or use `presets` for ready-made middleware stacks:

```ts
import { float } from '@vielzeug/orbit';
import { presets } from '@vielzeug/orbit/presets';

const cleanup = float(trigger, tooltip, presets.tooltip());
```

## Why Orbit?

Positioning floating UI by hand quickly turns into repeated math for viewport boundaries, arrow offsets, and scroll/resize tracking.

| Feature                  | Orbit                                       | Floating UI | Popper  |
| ------------------------ | --------------------------------------------- | ----------- | ------- |
| Bundle size              | <PackageInfo package="orbit" type="size" /> | ~10 kB      | ~6 kB   |
| Middleware pipeline      | ✅                                            | ✅          | ✅      |
| Direct compute API       | ✅                                            | ✅          | ✅      |
| High-level follow API    | ✅                                            | ✅          | Partial |
| Inline anchor middleware | ✅                                            | ✅          | ❌      |
| Auto-update helpers      | ✅                                            | ✅          | ✅      |
| Framework agnostic       | ✅                                            | ✅          | ✅      |
| Zero dependencies        | ✅                                            | ✅          | ✅      |

**Use Orbit when** you want a lightweight, DOM-first positioning engine with direct control and no framework adapter requirements.

**Consider larger alternatives when** you need their existing integration ecosystem or migration compatibility.

## Features

- `float()` covers the common position-and-follow case; writes `left`/`top` by default, accepts a custom `apply` callback
- `computePosition()` returns `x`, `y`, `placement`, and `middlewareData` without touching the DOM
- `detectOverflow()` returns per-side overflow offsets; used by built-in middleware and available for custom middleware
- Built-in middleware: `offset`, `flip`, `autoPlacement`, `shift`, `size`, `arrow`, `hide`
- `inline` middleware (separate sub-path `@vielzeug/orbit/inline`) for multi-line inline references
- Pre-configured presets (separate sub-path `@vielzeug/orbit/presets`): `tooltip`, `dropdown`, `popover`, `contextMenu`
- `autoUpdate()` supports scroll, resize, ResizeObserver, visualViewport, animation frames, and optional throttle
- `getSide()` and `getAlignment()` utilities for reading placement components
- CSS Anchor Positioning progressive enhancement via `preferCssAnchor` on `float()`
- Zero dependencies

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ❌      |
| SSR         | ❌      |
| Deno        | ❌      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Sigil](/sigil/)
- [Grip](/grip/)
- [Craft](/craft/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
