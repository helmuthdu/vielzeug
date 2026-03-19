---
title: Floatit — Lightweight floating element positioning
description: Zero-dependency floating element positioning for tooltips, dropdowns, and popovers. Built for Vielzeug, works anywhere.
---

<PackageBadges package="floatit" />

<img src="/logo-floatit.svg" alt="Floatit logo" width="156" class="logo-highlight"/>

# Floatit

**Floatit** is a lightweight, zero-dependency library for positioning floating elements — tooltips, dropdowns, menus, popovers — relative to a reference element. It is the positioning engine used internally by [@vielzeug/buildit](/buildit/) components.

<!-- Search keywords: floating UI positioning, popover placement, tooltip alignment. -->

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/floatit
```

```sh [npm]
npm install @vielzeug/floatit
```

```sh [yarn]
yarn add @vielzeug/floatit
```

:::

## Quick Start

```ts
import { positionFloat, offset, flip, shift, autoUpdate } from '@vielzeug/floatit';

const reference = document.querySelector('#trigger')!;
const floating = document.querySelector('#tooltip')!;

// Position once
await positionFloat(reference, floating, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

// Keep in sync while visible
const cleanup = autoUpdate(reference, floating, () => {
  positionFloat(reference, floating, {
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 6 })],
  });
});

// When done
cleanup();
```

## Why Floatit?

Manual floating-element positioning with `getBoundingClientRect` breaks at viewport edges — there is no built-in overflow detection, flip logic, or automatic repositioning on scroll or resize.

```ts
// Before — manual positioning (no overflow handling)
function position(ref: Element, float: HTMLElement) {
  const rect = ref.getBoundingClientRect();
  float.style.top = `${rect.bottom + 8}px`;
  float.style.left = `${rect.left}px`;
  // Clips at viewport edges, never flips, breaks on scroll
}

// After — Floatit
import { positionFloat, offset, flip, shift } from '@vielzeug/floatit';
await positionFloat(reference, floating, {
  placement: 'bottom',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});
```

| Feature           | Floatit                                       | Floating UI | Popper.js |
| ----------------- | --------------------------------------------- | ----------- | --------- |
| Bundle size       | <PackageInfo package="floatit" type="size" /> | ~8 kB       | ~8 kB     |
| One-call API      | ✅ `positionFloat`                            | ❌ Manual   | ❌ Manual |
| Flip middleware   | ✅                                            | ✅          | ✅        |
| Shift middleware  | ✅                                            | ✅          | ✅        |
| Size middleware   | ✅                                            | ✅          | ✅        |
| autoUpdate        | ✅                                            | ✅          | ✅        |
| Zero dependencies | ✅                                            | ✅          | ✅        |

**Use Floatit when** you need a lightweight positioning engine for tooltips, dropdowns, and popovers that integrates cleanly into the Vielzeug component system.

**Consider Floating UI** if you need its framework adapters (React, Vue, Svelte) or virtual element reference support.

## Features

- **`positionFloat`** — Computes position and applies `left`/`top` inline styles in one call
- **`computePosition`** — Low-level engine returning `{ x, y, placement }`
- **`offset`** — Adds a gap between reference and floating element
- **`flip`** — Flips to the opposite side when the preferred side would overflow the viewport
- **`shift`** — Slides along the cross axis to stay inside the viewport
- **`size`** — Provides available dimensions so the floating element can be resized
- **`autoUpdate`** — Watches scroll, resize, and `ResizeObserver` to keep position current
- **Zero dependencies** — Pure DOM APIs, no external packages
- **Lightweight** — <PackageInfo package="floatit" type="size" /> gzipped

## Compatibility

| Environment | Support       |
| ----------- | ------------- |
| Browser     | ✅            |
| Node.js     | ❌ (DOM only) |
| SSR         | ❌ (DOM only) |
| Deno        | ❌            |

## Prerequisites

- Browser environment with DOM layout APIs (`getBoundingClientRect`, `ResizeObserver`).
- Reference and floating elements must exist before positioning calls.
- Call `autoUpdate` cleanup when overlays close to avoid stale listeners.

## See Also

- [Dragit](/dragit/)
- [Buildit](/buildit/)
- [Craftit](/craftit/)
