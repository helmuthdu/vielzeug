---
title: Orbit — Lightweight floating element positioning
description: Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.
package: orbit
category: ui-positioning
keywords: [floating-ui, tooltip, popover, dropdown, positioning, middleware, placement]
related: [craft, block, grip]
exports: [float, computePosition, autoUpdate, offset, flip, shift, arrow, size]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="orbit" />

<img src="/logo-orbit.svg" alt="Orbit logo" width="156" class="logo-highlight"/>

# Orbit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/orbit` &nbsp;·&nbsp; **Category:** Ui Positioning

**Key exports:** `float`, `computePosition`, `autoUpdate`, `offset`, `flip`, `shift`, `arrow`, `size`

**When to use:** Precise floating element positioning for tooltips, dropdowns, menus, and popovers with middleware pipeline.

**Related:** [Craft](/craft/) · [Block](/block/) · [Grip](/grip/)

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

```ts
import { arrow, autoUpdate, flip, offset, shift, computePosition } from '@vielzeug/orbit';

const reference = document.querySelector<HTMLElement>('#trigger')!;
const floating = document.querySelector<HTMLElement>('#tooltip')!;
const arrowEl = floating.querySelector<HTMLElement>('.arrow')!;

const cleanup = autoUpdate(reference, floating, () => {
  const result = computePosition(reference, floating, {
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 6 }), arrow({ element: arrowEl, padding: 6 })],
  });

  floating.style.left = `${result.x}px`;
  floating.style.top = `${result.y}px`;
  floating.dataset.placement = result.placement;
});

cleanup();
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

- `computePosition()` returns `x`, `y`, `placement`, and `middlewareData`
- `float()` covers the common position-and-follow case and applies `left`/`top` by default
- `detectOverflow()` powers both built-in and custom overflow middleware
- Built-in middleware: `offset`, `flip`, `autoPlacement`, `shift`, `size`, `arrow`, `hide`, and `inline`
- Per-side padding support across overflow-aware middleware
- `autoUpdate()` supports scroll, resize, ResizeObserver, visualViewport, and animation-frame tracking
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

- [Block](/block/)
- [Grip](/grip/)
- [Craft](/craft/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
