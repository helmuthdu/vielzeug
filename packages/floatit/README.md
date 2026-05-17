# @vielzeug/floatit

> Lightweight floating-element positioning for tooltips, dropdowns, popovers, and menus.

[![npm version](https://img.shields.io/npm/v/@vielzeug/floatit)](https://www.npmjs.com/package/@vielzeug/floatit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Floatit is a zero-dependency DOM positioning engine with composable middleware for overflow handling, sizing, arrows, hiding, and inline text anchors.

## Installation

```sh
pnpm add @vielzeug/floatit
```

## Quick Start

```ts
import { arrow, autoUpdate, computePosition, flip, offset, shift } from '@vielzeug/floatit';

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
- Main APIs accept both DOM elements and virtual references
- `detectOverflow()` is available for custom middleware
- Built-in middleware: `offset`, `flip`, `autoPlacement`, `shift`, `size`, `arrow`, `hide`, and `inline`
- `float()` covers the common position-and-follow case and applies `left`/`top` by default
- `autoUpdate()` supports resize, scroll, visualViewport, and `animationFrame`
- Zero dependencies

## API Summary

| Export | Description |
| --- | --- |
| `computePosition(reference, floating, options?)` | Return `x`, `y`, `placement`, and `middlewareData` |
| `float(reference, floating, options?)` | Position immediately and keep following with optional custom `apply` |
| `autoUpdate(reference, floating, update, options?)` | Re-run positioning when layout conditions change |
| `detectOverflow(state, options?)` | Return per-side overflow offsets |
| `offset(value)` | Add distance between reference and floating element (main/cross axis) |
| `flip(options?)` | Move to a fallback placement when the current one overflows |
| `autoPlacement(options?)` | Choose the placement with the most space |
| `shift(options?)` | Clamp the floating element inside a boundary |
| `size(options?)` | Provide available dimensions and resize hooks |
| `arrow(options)` | Provide arrow coordinates via `middlewareData.arrow` |
| `hide(options?)` | Provide visibility metadata via `middlewareData.hide` |
| `inline(options?)` | Improve placement for multi-line inline references |

## Notes

- Positions are viewport-relative; use `position: fixed` on the floating element unless you have a custom rendering strategy.
- `reference` can be either a DOM element or a virtual reference object with `getBoundingClientRect()`.
- Use either `flip()` or `autoPlacement()`, not both.
- Middleware return partial updates rather than whole-state clones.
- Call the cleanup returned by `autoUpdate()` when the floating UI closes.

## Documentation

Full docs at [vielzeug.dev/floatit](https://vielzeug.dev/floatit)
