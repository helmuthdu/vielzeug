---
description: Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.
package: floatit
category: ui-positioning
keywords: [floating-ui, tooltip, popover, dropdown, positioning, middleware, placement]
related: [craftit, buildit, dragit]
exports: [float, computePosition, autoUpdate, offset, flip, shift, arrow, size]
---

# @vielzeug/floatit

> Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.

[![npm version](https://img.shields.io/npm/v/@vielzeug/floatit)](https://www.npmjs.com/package/@vielzeug/floatit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/floatit` &nbsp;·&nbsp; **Category:** Ui-positioning

**Key exports:** `float`, `computePosition`, `autoUpdate`, `offset`, `flip`, `shift`, `arrow`, `size`

**When to use:** Zero-dependency floating element positioning for tooltips, dropdowns, menus, and popovers.

**Related:** [@vielzeug/craftit](https://vielzeug.dev/craftit/) · [@vielzeug/buildit](https://vielzeug.dev/buildit/) · [@vielzeug/dragit](https://vielzeug.dev/dragit/)

</details>

`@vielzeug/floatit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/floatit
npm install @vielzeug/floatit
yarn add @vielzeug/floatit
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

## Documentation

- [Overview](https://vielzeug.dev/floatit/)
- [Usage Guide](https://vielzeug.dev/floatit/usage)
- [API Reference](https://vielzeug.dev/floatit/api)
- [Examples](https://vielzeug.dev/floatit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
