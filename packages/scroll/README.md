---
description: Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.
package: scroll
category: ui-performance
keywords: [virtual-list, virtualization, windowing, scroll, performance, large-lists]
related: [grip, craft, sigil]
exports: [createVirtualizer, createDomVirtualList, Virtualizer]
---

# @vielzeug/scroll

> Lightweight, framework-agnostic virtual list engine with variable heights, smooth scrolling, and zero dependencies.

[![npm version](https://img.shields.io/npm/v/@vielzeug/scroll)](https://www.npmjs.com/package/@vielzeug/scroll) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/scroll` &nbsp;·&nbsp; **Category:** UI Performance

**Key exports:** `createVirtualizer`, `createDomVirtualList`, `Virtualizer`

**When to use:** Render only visible rows in large lists. Supports fixed heights, variable heights, programmatic scrolling, and framework integration.

**Related:** [@vielzeug/grip](https://vielzeug.dev/grip/) · [@vielzeug/craft](https://vielzeug.dev/craft/) · [@vielzeug/sigil](https://vielzeug.dev/sigil/)

</details>

`@vielzeug/scroll` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/scroll
npm install @vielzeug/scroll
yarn add @vielzeug/scroll
```

## Quick Start

```ts
import { createVirtualizer } from '@vielzeug/scroll';

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

## DOM Module

For dropdown and listbox patterns, use `createDomVirtualList` from `@vielzeug/scroll/dom`. It manages the virtualizer lifecycle and handles list-height styles automatically.

```ts
import { createDomVirtualList } from '@vielzeug/scroll/dom';

type Option = { label: string; value: string };

const domList = createDomVirtualList<Option>({
  listElement: listEl,
  scrollElement: dropdownEl,
  render: ({ items, listEl, virtualItems }) => {
    listEl.replaceChildren();
    for (const item of virtualItems) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);`;
      el.textContent = items[item.index].label;
      listEl.appendChild(el);
    }
  },
});

domList.setItems(options);
domList.setActive(isOpen);
domList.scrollToIndex(focusedIndex, { align: 'auto' });
domList.destroy();
```

## Documentation

- [Overview](https://vielzeug.dev/scroll/)
- [Usage Guide](https://vielzeug.dev/scroll/usage)
- [API Reference](https://vielzeug.dev/scroll/api)
- [Examples](https://vielzeug.dev/scroll/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
