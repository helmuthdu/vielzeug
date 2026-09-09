# @vielzeug/scroll

> Virtual list engine for large datasets

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
const listEl = document.querySelector<HTMLElement>('.list')!;

const virt = createVirtualizer(scrollEl, {
  count: 10_000,
  estimateSize: 36,
  onChange: ({ items, totalSize }) => {
    listEl.style.height = `${totalSize}px`;
    listEl.replaceChildren();

    for (const item of items) {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:${item.size}px;`;
      row.textContent = `Row ${item.index}`;
      listEl.appendChild(row);
    }
  },
});

// Later:
virt.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/scroll/)
- [Usage Guide](https://vielzeug.dev/scroll/usage)
- [API Reference](https://vielzeug.dev/scroll/api)
- [Examples](https://vielzeug.dev/scroll/examples)
- [Migration Guide](https://vielzeug.dev/scroll/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
