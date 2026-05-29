---
description: Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.
package: scroll
category: ui-performance
keywords: [virtual-list, virtualization, windowing, scroll, performance, large-lists]
related: [grip, craft, block]
exports: [createVirtualizer, Virtualizer]
---

# /scroll

> Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.

[![npm version](https://img.shields.io/npm/v//scroll)](https://www.npmjs.com/package//scroll) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/scroll` &nbsp;·&nbsp; **Category:** Ui-performance

**Key exports:** `createVirtualizer`, `Virtualizer`

**When to use:** Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.

**Related:** [@vielzeug/grip](https://vielzeug.dev/grip/) · [@vielzeug/craft](https://vielzeug.dev/craft/) · [@vielzeug/block](https://vielzeug.dev/block/)

</details>

`/scroll` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /scroll
npm install /scroll
yarn add /scroll
```

## Quick Start

```ts
import { createVirtualizer } from '/scroll';

const scrollEl = document.querySelector<HTMLElement>('.scroll-container')!;

const virt = createVirtualizer(scrollEl, {
  count: items.length,
  estimateSize: 36,
  onChange: (virtualItems, totalSize) => {
    spacer.style.height = `${totalSize}px`;
    list.innerHTML = '';

    for (const item of virtualItems) {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:${item.size}px;`;
      row.textContent = items[item.index].label;
      list.appendChild(row);
    }
  },
});

// Later:
virt.destroy();
```

## Documentation

- [Overview](https://vielzeug.dev/scroll/)
- [Usage Guide](https://vielzeug.dev/scroll/usage)
- [API Reference](https://vielzeug.dev/scroll/api)
- [Examples](https://vielzeug.dev/scroll/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
