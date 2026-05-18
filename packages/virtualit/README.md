---
description: Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.
package: virtualit
category: ui-performance
keywords: [virtual-list, virtualization, windowing, scroll, performance, large-lists]
related: [dragit, craftit, buildit]
exports: [createVirtualizer, Virtualizer]
---

# @vielzeug/virtualit

> Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.

[![npm version](https://img.shields.io/npm/v/@vielzeug/virtualit)](https://www.npmjs.com/package/@vielzeug/virtualit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/virtualit` &nbsp;·&nbsp; **Category:** Ui-performance

**Key exports:** `createVirtualizer`, `Virtualizer`

**When to use:** Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.

**Related:** [@vielzeug/dragit](https://vielzeug.dev/dragit/) · [@vielzeug/craftit](https://vielzeug.dev/craftit/) · [@vielzeug/buildit](https://vielzeug.dev/buildit/)

</details>

`@vielzeug/virtualit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/virtualit
npm install @vielzeug/virtualit
yarn add @vielzeug/virtualit
```

## Quick Start

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

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

- [Overview](https://vielzeug.dev/virtualit/)
- [Usage Guide](https://vielzeug.dev/virtualit/usage)
- [API Reference](https://vielzeug.dev/virtualit/api)
- [Examples](https://vielzeug.dev/virtualit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
