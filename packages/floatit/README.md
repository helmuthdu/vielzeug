# @vielzeug/floatit

> Lightweight floating-element positioning for tooltips, dropdowns, popovers, and menus.

[![npm version](https://img.shields.io/npm/v/@vielzeug/floatit)](https://www.npmjs.com/package/@vielzeug/floatit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Floatit** is a zero-dependency DOM positioning engine used by Vielzeug components and available as a standalone package. It gives you a small, composable API for computing and applying floating positions, plus middleware for offsetting, flipping, shifting, sizing, and auto-updating.

## Installation

```sh
pnpm add @vielzeug/floatit
# npm install @vielzeug/floatit
# yarn add @vielzeug/floatit
```

## Quick Start

```ts
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';

const reference = document.querySelector('#trigger')!;
const floating = document.querySelector('#tooltip')!;

await positionFloat(reference, floating, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 })],
});

const cleanup = autoUpdate(reference, floating, () => {
  positionFloat(reference, floating, {
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 6 })],
  });
});

// later
cleanup();
```

## Features

- ✅ **`positionFloat()`** — compute and apply `left` / `top` styles in one call
- ✅ **`computePosition()`** — low-level `{ x, y, placement }` API when you want to control rendering yourself
- ✅ **Composable middleware** — `offset`, `flip`, `shift`, and `size`
- ✅ **`autoUpdate()`** — keeps floating UI aligned on scroll, resize, and element resizes
- ✅ **Typed placement model** — `top`, `bottom-start`, `left-end`, and related helpers
- ✅ **Zero dependencies** — pure DOM APIs only

## API Summary

| Export | Description |
|---|---|
| `positionFloat(reference, floating, options?)` | Compute and apply the floating position |
| `computePosition(reference, floating, config?)` | Return `{ x, y, placement }` without mutating the DOM |
| `autoUpdate(reference, floating, update, options?)` | Re-run positioning when layout conditions change |
| `offset(value)` | Add distance between reference and floating element |
| `flip(options?)` | Flip to the opposite side when the preferred side overflows |
| `shift(options?)` | Clamp the floating element inside the viewport |
| `size(options?)` | Provide available dimensions and resize hooks |

## Usage Notes

- `positionFloat()` defaults to `strategy: 'fixed'`.
- Middleware runs in order; the common chain is `offset()`, `flip()`, `shift()`, then `size()`.
- Call the cleanup returned by `autoUpdate()` when the floating UI closes.
- Use `computePosition()` when you want to apply transforms or animations yourself.

## Documentation

Full docs at **[vielzeug.dev/floatit](https://vielzeug.dev/floatit)**

| | |
|---|---|
| [Overview](https://vielzeug.dev/floatit/) | Installation, quick start, and feature overview |
| [Usage Guide](https://vielzeug.dev/floatit/usage) | Placement, middleware, strategy, and lifecycle patterns |
| [API Reference](https://vielzeug.dev/floatit/api) | Complete function signatures and types |
| [Examples](https://vielzeug.dev/floatit/examples) | Tooltips, dropdowns, and framework recipes |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.

