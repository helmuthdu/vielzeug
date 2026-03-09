---
title: Floatit — Lightweight floating element positioning
description: Zero-dependency floating element positioning for tooltips, dropdowns, and popovers. Built for Vielzeug, works anywhere.
---

<PackageBadges package="floatit" />

<img src="/logo-floatit.svg" alt="Floatit Logo" width="156" class="logo-highlight"/>

# Floatit

**Floatit** is a lightweight, zero-dependency library for positioning floating elements — tooltips, dropdowns, menus, popovers — relative to a reference element. It is the positioning engine used internally by [@vielzeug/buildit](/buildit/) components.

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
const floating  = document.querySelector('#tooltip')!;

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

## Next Steps

|                           |                                              |
| ------------------------- | -------------------------------------------- |
| [Usage Guide](./usage.md) | Middleware composition, patterns, and recipes |
| [API Reference](./api.md) | Complete type signatures                     |
| [Examples](./examples.md) | Copy-paste ready snippets                    |
