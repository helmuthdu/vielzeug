---
title: Floatit — Lightweight floating element positioning
description: Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.
---

<PackageBadges package="floatit" />

<img src="/logo-floatit.svg" alt="Floatit logo" width="156" class="logo-highlight"/>

Floatit is a small DOM positioning engine for floating UI. It provides a direct API for computing positions, a high-level follow API, and middleware for collision handling, arrows, hiding, inline text anchors, and dynamic sizing.

## Quick Start

```ts
import { arrow, autoUpdate, flip, offset, shift, computePosition } from '@vielzeug/floatit';

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

## Features

- `computePosition()` returns `x`, `y`, `placement`, and `middlewareData`
- `float()` covers the common position-and-follow case and applies `left`/`top` by default
- `detectOverflow()` powers both built-in and custom overflow middleware
- Built-in middleware: `offset`, `flip`, `autoPlacement`, `shift`, `size`, `arrow`, `hide`, and `inline`
- Per-side padding support across overflow-aware middleware
- `autoUpdate()` supports scroll, resize, ResizeObserver, visualViewport, and animation-frame tracking
- Zero dependencies

## When To Use Floatit

Use Floatit when you want a small DOM-only positioning engine and direct control over your floating UI behavior.

Choose a larger library when you specifically need framework adapters or non-DOM platform abstractions.
