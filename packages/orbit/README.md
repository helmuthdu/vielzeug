---
description: Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.
package: orbit
category: ui-positioning
keywords: [floating-ui, tooltip, popover, dropdown, positioning, middleware, placement]
related: [craft, block, grip]
exports: [float, computePosition, autoUpdate, offset, flip, shift, arrow, size]
---

# /orbit

> Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.

[![npm version](https://img.shields.io/npm/v//orbit)](https://www.npmjs.com/package//orbit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/orbit` &nbsp;·&nbsp; **Category:** Ui-positioning

**Key exports:** `float`, `computePosition`, `autoUpdate`, `offset`, `flip`, `shift`, `arrow`, `size`

**When to use:** Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.

**Related:** [@vielzeug/craft](https://vielzeug.dev/craft/) · [@vielzeug/block](https://vielzeug.dev/block/) · [@vielzeug/grip](https://vielzeug.dev/grip/)

</details>

`/orbit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /orbit
npm install /orbit
yarn add /orbit
```

## Quick Start

```ts
import { arrow, autoUpdate, computePosition, flip, offset, shift } from '/orbit';

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

## Documentation

- [Overview](https://vielzeug.dev/orbit/)
- [Usage Guide](https://vielzeug.dev/orbit/usage)
- [API Reference](https://vielzeug.dev/orbit/api)
- [Examples](https://vielzeug.dev/orbit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
