---
description: Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.
package: orbit
category: ui-positioning
keywords: [floating-ui, tooltip, popover, dropdown, positioning, middleware, placement]
related: [craft, sigil, grip]
exports:
  [
    float,
    computePosition,
    computeOnce,
    getRects,
    detectOverflow,
    autoUpdate,
    offset,
    flip,
    shift,
    autoPlacement,
    arrow,
    size,
    hide,
    compose,
    limitShift,
    getSide,
    getAlignment,
  ]
---

# @vielzeug/orbit

> Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.

[![npm version](https://img.shields.io/npm/v/@vielzeug/orbit)](https://www.npmjs.com/package/@vielzeug/orbit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/orbit` &nbsp;·&nbsp; **Category:** UI Positioning

**Key exports:** `float`, `computePosition`, `computeOnce`, `getRects`, `detectOverflow`, `autoUpdate`, `offset`, `flip`, `shift`, `autoPlacement`, `arrow`, `size`, `hide`, `compose`, `limitShift`, `getSide`, `getAlignment`

**When to use:** Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.

**Related:** [@vielzeug/craft](https://vielzeug.dev/craft/) · [@vielzeug/sigil](https://vielzeug.dev/sigil/) · [@vielzeug/grip](https://vielzeug.dev/grip/)

</details>

`@vielzeug/orbit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/orbit
npm install @vielzeug/orbit
yarn add @vielzeug/orbit
```

## Quick Start

```ts
import { arrow, float, flip, offset, shift } from '@vielzeug/orbit';

const reference = document.querySelector<HTMLElement>('#trigger')!;
const floating = document.querySelector<HTMLElement>('#tooltip')!;
const arrowEl = floating.querySelector<HTMLElement>('.arrow')!;

const handle = float(reference, floating, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 6 }), arrow({ element: arrowEl, padding: 6 })],
  apply(result) {
    floating.style.left = `${result.x}px`;
    floating.style.top = `${result.y}px`;

    if (result.middlewareData.arrow) {
      const { x, y } = result.middlewareData.arrow;
      arrowEl.style.left = x != null ? `${x}px` : '';
      arrowEl.style.top  = y != null ? `${y}px` : '';
    }
  },
});

// On teardown:
handle.cleanup();
```

## Sub-paths

| Import | Purpose |
|---|---|
| `@vielzeug/orbit` | Core API, middleware, utilities, types |
| `@vielzeug/orbit/presets` | Pre-configured middleware stacks |
| `@vielzeug/orbit/inline` | `inline` middleware for multi-line references |
| `@vielzeug/orbit/reactive` | Reactive signal adapter (`@vielzeug/ripple`) |
| `@vielzeug/orbit/devtools` | Visual debug overlay (development only) |
| `@vielzeug/orbit/ssr` | No-op stubs for server-side rendering |

## Documentation

- [Overview](https://vielzeug.dev/orbit/)
- [Usage Guide](https://vielzeug.dev/orbit/usage)
- [API Reference](https://vielzeug.dev/orbit/api)
- [Examples](https://vielzeug.dev/orbit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
